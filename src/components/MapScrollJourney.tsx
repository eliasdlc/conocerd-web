"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { useJourneyScroll, scrollToSceneCenter } from "@/hooks/useJourneyScroll";
import { useHeroIdleMotion } from "@/hooks/useHeroIdleMotion";
import { useViewportMode } from "@/hooks/useIsMobile";
import { SCENES, SCENE_BANDS, TRIGGER_TOTAL_VH } from "@/lib/journey";
import { applyJourneyFrame, measureViewport } from "@/lib/journeyCamera";
import { registerSceneJumper } from "@/lib/journeyNav";
import HeroOverlay from "@/sections/HeroOverlay";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosSection from "@/sections/ViajerosSection";
import NegociosSection from "@/sections/NegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";

// MapLibre is the journey's signature but not a prerequisite for readable Hero
// HTML. Keep it in a separate client chunk so text and navigation can paint
// before the WebGL runtime arrives.
const Map = dynamic(() => import("@/components/map/Map").then((mod) => mod.Map), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "#FDF8F0" }} />,
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
      style={{ "--crd-track-vh": TRIGGER_TOTAL_VH } as React.CSSProperties}
    >
      {/* Sticky layer — map stays fixed while scroll track advances below.
          Fondo crema (con halos cálidos de marca) detrás del canvas: el globo,
          ya sin atmósfera, flota sobre este crema en el hero. En las escenas con
          zoom el mapa es opaco y tapa el gradiente. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          // dvh: en móvil la barra de URL cambia el 100vh y el globo se movía
          // verticalmente al aparecer/desaparecer.
          height: "100dvh",
          width: "100%",
          overflow: "hidden",
          background:
            "radial-gradient(60% 50% at 18% 16%,rgba(37,204,184,.10),transparent 70%),radial-gradient(55% 45% at 84% 24%,rgba(255,141,22,.10),transparent 70%),radial-gradient(60% 50% at 50% 98%,rgba(247,108,77,.08),transparent 70%), #FDF8F0",
        }}
      >
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
          <HeroOverlay />
          <DestinosSection />
          <MapaSection />
          <ViajerosSection />
          <NegociosSection />
          <EquipoSection />
          <CTASection />
        </Map>
      </div>

      {/* Anchor divs — pista de scroll en desktop (display:none en móvil) */}
      {SCENES.map((scene) => (
        <div
          key={scene.name}
          id={`trigger-${scene.name}`}
          className="crd-journey-anchor"
          data-scene={scene.name}
          style={{ height: `${scene.height}vh`, pointerEvents: "none" }}
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
