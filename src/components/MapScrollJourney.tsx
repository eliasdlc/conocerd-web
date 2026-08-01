"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { useJourneyScroll, scrollToSceneCenter } from "@/hooks/useJourneyScroll";
import { useHeroIdleMotion } from "@/hooks/useHeroIdleMotion";
import { useViewportMode } from "@/hooks/useIsMobile";
import {
  SCENES,
  SCENE_BANDS,
  TRIGGER_TOTAL_VH,
  MOBILE_TRACK_SCALE,
  MOBILE_TRIGGER_TOTAL_DVH,
} from "@/lib/journey";
import { applyJourneyFrame, measureViewport } from "@/lib/journeyCamera";
import { registerSceneJumper } from "@/lib/journeyNav";
import HeroOverlay, { HeroPinMarker } from "@/sections/HeroOverlay";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosSection from "@/sections/ViajerosSection";
import NegociosSection from "@/sections/NegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";
import { VariantSlot } from "@/variants/registry";

// MapLibre is the journey's signature but not a prerequisite for readable Hero
// HTML. Keep it in a separate client chunk so text and navigation can paint
// before the WebGL runtime arrives.
const Map = dynamic(() => import("@/components/map/Map").then((mod) => mod.Map), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="absolute inset-0 bg-cream" />,
});

// Applied once on map load — aligns water/border colors with brand palette
function applyBrandPaint(map: maplibregl.Map) {
  // El estilo Carto no siempre expone estas capas → guardar con getLayer para
  // no ensuciar la consola con "Cannot style non-existing layer".
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#c8ede9");
  if (map.getLayer("admin_country")) {
    map.setPaintProperty("admin_country", "line-color", "#264653");
    map.setPaintProperty("admin_country", "line-width", 2);
  }

  // Mata el "ring": el globo de MapLibre dibuja una atmósfera (halo difuso más
  // grande que la esfera). `atmosphere-blend: 0` la apaga ⇒ el globo se recorta
  // limpio. El área alrededor queda transparente y muestra el crema del wrapper.
  map.setSky({ "atmosphere-blend": 0 });
}

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { activeScene, setActiveScene, progress } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);
  const { resolved: viewportResolved } = useViewportMode();

  // One scroll engine serves every viewport. It is gated until matchMedia has
  // resolved, preventing a desktop frame from ever advancing a phone to CTA.
  useJourneyScroll({
    containerRef: outerRef,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
    enabled: viewportResolved,
  });

  useHeroIdleMotion(mapRef, progress, activeScene === "hero");

  // Los enlaces de nav/footer (`trigger-<escena>`) van al keyframe de la escena
  // en ambos modos, en vez de al borde de su banda de scroll.
  useEffect(() => {
    return registerSceneJumper((scene) => {
      const i = SCENE_BANDS.findIndex((b) => b.name === scene);
      if (i < 0) return false;
      scrollToSceneCenter(outerRef.current, i);
      return true;
    });
  }, []);

  // On load: brand paint + posiciona la cámara según el progreso actual, así no
  // se queda en el view inicial hasta la primera interacción.
  const handleLoad = useCallback(
    (map: maplibregl.Map) => {
      applyBrandPaint(map);
      measureViewport();
      applyJourneyFrame(map, progress.get());
    },
    [progress]
  );

  return (
    <div
      ref={outerRef}
      className="crd-journey"
      data-active-scene={activeScene}
      style={{
        "--crd-track-vh": TRIGGER_TOTAL_VH,
        "--crd-mobile-track-dvh": MOBILE_TRIGGER_TOTAL_DVH,
      } as React.CSSProperties}
    >
      {/* Sticky layer — map stays fixed while scroll track advances below.
          Fondo crema (con halos cálidos de marca) detrás del canvas: el globo,
          ya sin atmósfera, flota sobre este crema en el hero. En las escenas con
          zoom el mapa es opaco y tapa el gradiente. */}
      {/* h-[100dvh] y no 100vh: en móvil la barra de URL cambia el 100vh y el
          globo se movía verticalmente al aparecer/desaparecer. El fondo son tres
          radial-gradients de marca; como utilidad arbitraria sería ilegible, así
          que vive en .crd-journey-sticky. */}
      <div className="crd-journey-sticky sticky top-0 h-[100dvh] w-full overflow-hidden">
        <Map
          ref={mapRef}
          theme="light"
          projection={{ type: "globe" }}
          initialViewState={{
            longitude: -70.1627,
            latitude: 18.7357,
            zoom: 2.5,
            pitch: 0,
            bearing: -20,
          }}
          onLoad={handleLoad}
          interactive={false}
          scrollZoom={false}
          dragPan={false}
          dragRotate={false}
          touchZoomRotate={false}
          attributionControl={false}
        >
          <HeroPinMarker />
          <DestinosSection />
          {/* Áreas en rework: ?var-mapa=N / ?var-vn=N / ?var-equipo=N montan
              la variante N; sin query se rinde la sección actual. */}
          <VariantSlot area="mapa">
            <MapaSection />
          </VariantSlot>
          <VariantSlot area="vn">
            <ViajerosSection />
            <NegociosSection />
          </VariantSlot>
          <VariantSlot area="equipo">
            <EquipoSection />
          </VariantSlot>
          <CTASection />
        </Map>

        {/* Fuera del <Map>: el mapa se carga con `ssr: false` y todo lo que
            cuelgue de él desaparece del HTML inicial. El hero es lo primero
            que se ve y su logo es el LCP, así que se sirve renderizado desde
            el servidor y se pinta sin esperar a MapLibre (audit 5.6). */}
        <HeroOverlay />
      </div>

      {/* Anchor divs — pista nativa de scroll; en móvil se comprime con dvh. */}
      {SCENES.map((scene) => (
        <div
          key={scene.name}
          id={`trigger-${scene.name}`}
          className="crd-journey-anchor pointer-events-none"
          data-scene={scene.name}
          // Altura por escena: es dato, no estilo, así que sigue inline.
          style={{
            height: `${scene.height}vh`,
            "--crd-mobile-scene-height": `${scene.height * MOBILE_TRACK_SCALE}dvh`,
          } as React.CSSProperties}
        />
      ))}

    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function MapScrollJourney() {
  const mapRef = useRef<maplibregl.Map | null>(null);

  return (
    <SceneProvider>
      <MapScrollInner mapRef={mapRef} />
    </SceneProvider>
  );
}
