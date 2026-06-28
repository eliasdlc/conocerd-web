"use client";

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { Map } from "@/components/map/Map";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { useSceneTrigger } from "@/hooks/useSceneTrigger";
import DestinosOverlay from "@/components/overlays/DestinosOverlay";
import MapaOverlay from "@/components/overlays/MapaOverlay";
import ViajerosOverlay from "@/components/overlays/ViajerosOverlay";
import NegociosOverlay from "@/components/overlays/NegociosOverlay";
import EquipoOverlay from "@/components/overlays/EquipoOverlay";
import CTAOverlay from "@/components/overlays/CTAOverlay";

// ─── Scene registry ───────────────────────────────────────────────────────────

const SCENES = [
  { name: "destinos-intro",  height: 80  },
  { name: "polaroid-0",      height: 100 },
  { name: "polaroid-1",      height: 100 },
  { name: "polaroid-2",      height: 100 },
  { name: "polaroid-3",      height: 100 },
  { name: "polaroid-4",      height: 100 },
  { name: "polaroid-5",      height: 100 },
  { name: "destinos-finale", height: 80  },
  { name: "mapa",            height: 120 },
  { name: "viajeros",        height: 120 },
  { name: "negocios",        height: 140 },
  { name: "equipo",          height: 100 },
  { name: "cta",             height: 100 },
] as const;

type SceneName = (typeof SCENES)[number]["name"];

// Outer div = sticky map (100vh) + all trigger divs (1340vh) = 1440vh total
const TRIGGER_TOTAL_VH = SCENES.reduce((sum, s) => sum + s.height, 0);

// ─── Dominican Republic flyTo targets ─────────────────────────────────────────

type Viewport = { center: [number, number]; zoom: number; pitch: number; bearing: number };

const LOCATIONS: Record<string, Viewport> = {
  rdOverview:   { center: [-70.35, 18.85],     zoom: 7.2,  pitch: 0,  bearing: 0   },
  bahiaAquilas: { center: [-71.77, 17.89],     zoom: 11.5, pitch: 45, bearing: -20 },
  picoDuarte:   { center: [-70.99, 19.05],     zoom: 10.5, pitch: 50, bearing: 15  },
  saltoLimon:   { center: [-69.58, 19.15],     zoom: 11.0, pitch: 40, bearing: 5   },
  charcos27:    { center: [-70.58, 19.62],     zoom: 11.5, pitch: 35, bearing: -10 },
  constanza:    { center: [-70.72, 18.91],     zoom: 11.5, pitch: 50, bearing: 20  },
  losHaitises:  { center: [-69.66, 19.13],     zoom: 11.0, pitch: 30, bearing: 0   },
  rdCaribbean:  { center: [-70.35, 18.85],     zoom: 6.5,  pitch: 0,  bearing: 0   },
  rdNorth:      { center: [-70.30, 19.00],     zoom: 8.5,  pitch: 20, bearing: 0   },
  santiago:     { center: [-70.6901, 19.4517], zoom: 12.5, pitch: 30, bearing: 5   },
  globeOut:     { center: [-69.00, 17.00],     zoom: 3.5,  pitch: 15, bearing: -5  },
};

const SCENE_TO_LOCATION: Record<SceneName, string> = {
  "destinos-intro":  "rdOverview",
  "polaroid-0":      "bahiaAquilas",
  "polaroid-1":      "picoDuarte",
  "polaroid-2":      "saltoLimon",
  "polaroid-3":      "charcos27",
  "polaroid-4":      "constanza",
  "polaroid-5":      "losHaitises",
  "destinos-finale": "rdOverview",
  "mapa":            "rdOverview",
  "viajeros":        "rdCaribbean",
  "negocios":        "rdNorth",
  "equipo":          "santiago",
  "cta":             "globeOut",
};

// Polaroid sub-transitions are faster; CTA is cinematic
const SCENE_DURATION: Partial<Record<SceneName, number>> = {
  "polaroid-0": 1600,
  "polaroid-1": 1600,
  "polaroid-2": 1600,
  "polaroid-3": 1600,
  "polaroid-4": 1600,
  "polaroid-5": 1600,
  "cta":        3500,
};

// Applied once on map load — aligns water/border colors with brand palette
function applyBrandPaint(map: maplibregl.Map) {
  try { map.setPaintProperty("water", "fill-color", "#c8ede9"); } catch {}
  try { map.setPaintProperty("admin_country", "line-color", "#264653"); } catch {}
  try { map.setPaintProperty("admin_country", "line-width", 2); } catch {}
}

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { activeScene } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);

  // Wire up IntersectionObserver on all [data-scene] divs in outerRef
  useSceneTrigger(outerRef);

  // Animate map to the location that corresponds to the active scene
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeScene) return;
    const locationKey = SCENE_TO_LOCATION[activeScene as SceneName];
    const location = LOCATIONS[locationKey];
    if (!location) return;
    const duration = SCENE_DURATION[activeScene as SceneName] ?? 2200;
    map.flyTo({ ...location, duration, essential: true });
  }, [activeScene, mapRef]);

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
          onLoad={applyBrandPaint}
          interactive={false}
          scrollZoom={false}
          dragPan={false}
          dragRotate={false}
          touchZoomRotate={false}
          attributionControl={false}
        >
          <DestinosOverlay />
          <MapaOverlay />
          <ViajerosOverlay />
          <NegociosOverlay />
          <EquipoOverlay />
          <CTAOverlay />
        </Map>
        {/* Additional overlay components added in steps 7–11 */}
      </div>

      {/* Invisible trigger divs — each one drives a scene change via IntersectionObserver */}
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
