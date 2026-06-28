"use client";

import { useCallback, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { Map } from "@/components/map/Map";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { useJourneyScroll } from "@/hooks/useJourneyScroll";
import { SCENES, TRIGGER_TOTAL_VH, cameraAtProgress } from "@/lib/journey";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosSection from "@/sections/ViajerosSection";
import NegociosSection from "@/sections/NegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";

// Applied once on map load — aligns water/border colors with brand palette
function applyBrandPaint(map: maplibregl.Map) {
  // El estilo Carto no siempre expone estas capas → guardar con getLayer para
  // no ensuciar la consola con "Cannot style non-existing layer".
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#c8ede9");
  if (map.getLayer("admin_country")) {
    map.setPaintProperty("admin_country", "line-color", "#264653");
    map.setPaintProperty("admin_country", "line-width", 2);
  }
}

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { setActiveScene, progress } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);

  // Scroll-linked engine: cámara = función continua del scroll (#3).
  useJourneyScroll({
    containerRef: outerRef,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
  });

  // On load: brand paint + posiciona la cámara según el progreso actual,
  // así no se queda en el view inicial (globo) hasta el primer scroll.
  const handleLoad = useCallback(
    (map: maplibregl.Map) => {
      applyBrandPaint(map);
      const c = cameraAtProgress(progress.get());
      map.jumpTo({ center: c.center, zoom: c.zoom, pitch: c.pitch, bearing: c.bearing });
    },
    [progress]
  );

  return (
    <div ref={outerRef} style={{ position: "relative", height: `calc(100vh + ${TRIGGER_TOTAL_VH}vh)` }}>

      {/* Sticky layer — map stays fixed while scroll track advances below */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
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
            bearing: 0,
          }}
          onLoad={handleLoad}
          interactive={false}
          scrollZoom={false}
          dragPan={false}
          dragRotate={false}
          touchZoomRotate={false}
          attributionControl={false}
        >
          <DestinosSection />
          <MapaSection />
          <ViajerosSection />
          <NegociosSection />
          <EquipoSection />
          <CTASection />
        </Map>
      </div>

      {/* Anchor divs — drive scroll height + nav targets (id=trigger-<scene>) */}
      {SCENES.map((scene) => (
        <div
          key={scene.name}
          id={`trigger-${scene.name}`}
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
