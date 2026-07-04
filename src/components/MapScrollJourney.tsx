"use client";

import { useCallback, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { Map } from "@/components/map/Map";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { useJourneyScroll } from "@/hooks/useJourneyScroll";
import { SCENES, TRIGGER_TOTAL_VH, cameraAtProgress } from "@/lib/journey";
import GlobeShading from "@/sections/GlobeShading";
import HeroOverlay from "@/sections/HeroOverlay";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosSection from "@/sections/ViajerosSection";
import NegociosSection from "@/sections/NegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";

// Applied once on map load — repinta el basemap positron (casi blanco) con una
// paleta tropical: tierra verde, agua turquesa, parques más saturados. Esto es
// lo que hace que el globo deje de verse plano y "blanco aburrido".
function applyBrandPaint(map: maplibregl.Map) {
  const set = (layer: string, prop: string, value: unknown) => {
    // El estilo Carto no siempre expone todas las capas → guardar con getLayer
    // para no ensuciar la consola con "Cannot style non-existing layer".
    if (map.getLayer(layer)) map.setPaintProperty(layer, prop, value as never);
  };

  // Tierra tropical (el `background` es el relleno de la esfera a bajo zoom).
  set("background", "background-color", "#CDE8C4");
  set("landcover", "fill-color", "#B8DEA8");
  set("landcover", "fill-opacity", 0.9);
  set("park_national_park", "fill-color", "#A6D695");
  set("park_nature_reserve", "fill-color", "#A6D695");
  set("landuse_residential", "fill-color", "#DCEAD1");
  set("landuse", "fill-color", "#C8E4BB");

  // Agua turquesa caribeña.
  set("water", "fill-color", "#8FD3D8");
  set("water_shadow", "fill-color", "#7BC7CE");

  // Fronteras de país con la tinta de marca.
  if (map.getLayer("admin_country")) {
    map.setPaintProperty("admin_country", "line-color", "#264653");
    map.setPaintProperty("admin_country", "line-width", 2);
  }
  set("boundary_state", "line-color", "#8FB78C");

  // Atmósfera nativa sutil: da un halo real que trackea la esfera y se apaga al
  // hacer zoom al mapa (el terminador/volumen extra lo pone <GlobeShading>).
  try {
    map.setSky({
      "sky-color": "#9BD9E6",
      "horizon-color": "#D7EFE8",
      "fog-color": "#FDF8F0",
      "atmosphere-blend": [
        "interpolate", ["linear"], ["zoom"],
        2.5, 0.5,
        5, 0.18,
        6.5, 0,
      ] as never,
    });
  } catch {
    // Si el runtime rechaza la expresión de zoom, cae a un blend constante bajo.
    map.setSky({ "atmosphere-blend": 0.35 });
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

      {/* Sticky layer — map stays fixed while scroll track advances below.
          Fondo crema (con halos cálidos de marca) detrás del canvas: el globo,
          ya sin atmósfera, flota sobre este crema en el hero. En las escenas con
          zoom el mapa es opaco y tapa el gradiente. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
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
          <GlobeShading />
          <HeroOverlay />
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
