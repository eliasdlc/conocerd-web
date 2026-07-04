"use client";

import { useEffect, useState } from "react";
import { animate } from "motion/react";
import PolaroidDeck from "@/sections/PolaroidDeck";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/Map";
import { SelfPin } from "@/components/map/pins";
import { FEATURED_DESTINATIONS } from "@/data/destinations";
import { pointAlongPath, smoothPath, type LngLat } from "@/lib/geo";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Los 6 destinos del journey vienen de la fuente de verdad única (#5).
const POLAROIDS = FEATURED_DESTINATIONS;

// Ruta curva que une los 6 destinos en orden (para la línea + chevron del
// finale). smoothPath la vuelve una curva orgánica en vez de tramos rectos.
const ROUTE_COORDS: LngLat[] = smoothPath(POLAROIDS.map((d) => d.coords));

const SCENE_TO_COUNT: Record<string, number> = {
  "destinos-intro": 0,
  "polaroid-0": 1,
  "polaroid-1": 2,
  "polaroid-2": 3,
  "polaroid-3": 4,
  "polaroid-4": 5,
  "polaroid-5": 6,
  "destinos-finale": 6,
};

const DESTINOS_SCENES = new Set([
  "destinos-intro",
  "polaroid-0", "polaroid-1", "polaroid-2",
  "polaroid-3", "polaroid-4", "polaroid-5",
  "destinos-finale",
]);

// ─── Component ────────────────────────────────────────────────────────────────

export default function DestinosOverlay() {
  const { activeScene } = useScene();
  const isVisible = DESTINOS_SCENES.has(activeScene);
  const visibleCount = SCENE_TO_COUNT[activeScene] ?? 0;
  const headingVisible = visibleCount >= 1;
  const isFinale = activeScene === "destinos-finale";

  // #6 — chevron one-shot recorriendo la polilínea al entrar al pan-out.
  const [chevron, setChevron] = useState<{ point: LngLat; bearing: number } | null>(null);
  useEffect(() => {
    if (!isFinale) return;
    const controls = animate(0, 1, {
      duration: 3.4,
      ease: "easeInOut",
      delay: 0.5,
      onUpdate: (t) => setChevron(pointAlongPath(ROUTE_COORDS, t)),
    });
    return () => controls.stop();
  }, [isFinale]);

  return (
    <>
      {/* #6 — ruta dashed que une los 6 destinos (solo en el finale) */}
      {isFinale && (
        <MapRoute
          id="destinos-route"
          coordinates={ROUTE_COORDS}
          color="#F76C4D"
          width={3}
          opacity={0.9}
          dashArray={[2, 2]}
        />
      )}

      {/* #6 — chevron viajando por la ruta */}
      {isFinale && chevron && (
        <MapMarker longitude={chevron.point[0]} latitude={chevron.point[1]}>
          <MarkerContent>
            <SelfPin heading={chevron.bearing} size={40} />
          </MarkerContent>
        </MapMarker>
      )}

      {/* Map pins rendered via MapMarker portals (positioned by maplibre on the canvas) */}
      {POLAROIDS.filter((_, i) => i < visibleCount).map((pol) => (
        <MapMarker key={pol.id} longitude={pol.coords[0]} latitude={pol.coords[1]}>
          <MarkerContent>
            <div
              style={{
                width: 14,
                height: 14,
                background: "#F76C4D",
                borderRadius: "50%",
                border: "2.5px solid #fff",
                boxShadow: "0 0 0 6px rgba(247,108,77,0.25)",
              }}
            />
          </MarkerContent>
          <MarkerLabel position="top">{pol.name}</MarkerLabel>
        </MapMarker>
      ))}

      {/* Visual overlay — polaroid pile + heading */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: isVisible ? "auto" : "none",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
          zIndex: 10,
        }}
      >
        {/* Section heading — appears above the pile on first polaroid */}
        <div
          style={{
            position: "absolute",
            left: "4%",
            bottom: "50%",
            opacity: headingVisible ? 1 : 0,
            transform: headingVisible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.45s ease, transform 0.45s ease",
          }}
        >
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "#0C6A60",
              marginBottom: 8,
              textShadow: "0 1px 2px rgba(253,248,240,0.9)",
            }}
          >
            Hidden gems · Lo nuestro
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              letterSpacing: "-.025em",
              fontSize: "clamp(22px,3vw,38px)",
              lineHeight: 1.08,
              color: "#1D3A45",
              textShadow: "0 1px 2px rgba(253,248,240,0.95), 0 0 16px rgba(253,248,240,0.6)",
            }}
          >
            Recuerdos que aún
            <br />
            no has vivido
          </h2>
        </div>

        {/* #7 — pila única: se construye con el scroll (visibleCount) y en el
            finale se vuelve interactiva EN SU SITIO (sin cambiar de componente). */}
        <PolaroidDeck items={POLAROIDS} visibleCount={visibleCount} interactive={isFinale} />
      </div>
    </>
  );
}
