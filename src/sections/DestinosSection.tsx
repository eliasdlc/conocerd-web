"use client";


import Image from "next/image";
import CategoryChip from "@/components/CategoryChip";
import PolaroidDeck from "@/sections/PolaroidDeck";
import { useScene } from "@/context/SceneContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/Map";
import { FEATURED_DESTINATIONS, CATEGORY_META } from "@/data/destinations";
import { type LngLat } from "@/lib/geo";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Los 6 destinos del journey vienen de la fuente de verdad única (#5).
const POLAROIDS = FEATURED_DESTINATIONS;

// Polilínea que une los 6 destinos en orden (para la ruta + chevron del finale).
const ROUTE_COORDS: LngLat[] = POLAROIDS.map((d) => d.coords);

// Final rotation for each card in the pile = original rotate + extra scatter
const PILE_OFFSETS = [
  { left: "4%", bottom: "8%", extraRotate: 0 },
  { left: "7%", bottom: "6%", extraRotate: -1 },
  { left: "5%", bottom: "10%", extraRotate: 1.5 },
  { left: "9%", bottom: "7%", extraRotate: -2 },
  { left: "3%", bottom: "12%", extraRotate: 0.5 },
  { left: "8%", bottom: "9%", extraRotate: -1 },
];

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
  const isMobile = useIsMobile();
  const isVisible = DESTINOS_SCENES.has(activeScene);
  const visibleCount = SCENE_TO_COUNT[activeScene] ?? 0;
  // The title introduces the chapter immediately; leaving destinos-intro empty
  // made the first full scroll interval read as a broken frame.
  const headingVisible = isVisible;
  const isFinale = activeScene === "destinos-finale";

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
        aria-hidden={!isVisible}
        inert={!isVisible}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: isVisible ? "auto" : "none",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
          zIndex: 10,
        }}
      >
        {/* Velo crema en móvil: el titular y la pila caen sobre el mapa. Entra
            con el primer destino — en la intro no hay contenido que velar y un
            degradado sobre el mapa vacío solo se ve como un hueco. */}
        <div
          className="crd-mobile-scrim"
          style={{
            height: "66%",
            opacity: headingVisible ? 1 : 0,
            transition: "opacity 0.45s ease",
          }}
        />

        {/* Section heading — appears above the pile on first polaroid */}
        <div
          className={`crd-destinos-heading${isFinale ? " crd-destinos-heading-finale" : ""}`}
          style={{
            position: "absolute",
            zIndex: 20,
            left: "4%",
            bottom: isMobile ? "48%" : "50%",
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

        {/* Polaroid pile */}
        {POLAROIDS.map((pol, i) => {
          const offset = PILE_OFFSETS[i];
          const totalRotate = (pol.rotate ?? 0) + offset.extraRotate;
          const isCardVisible = i < visibleCount;

          return (
            <figure
              key={pol.id}
              className="crd-destinos-card"
              style={{
                position: "absolute",
                // En 390px el desparrame de la pila (3–9%) sacaba las cartas de
                // atrás por el borde izquierdo: en móvil se desplaza a la derecha.
                left: isMobile ? `calc(${offset.left} + 6%)` : offset.left,
                bottom: offset.bottom,
                margin: 0,
                width: "clamp(210px,17vw,270px)",
                background: "#fff",
                padding: "12px 12px 0",
                borderRadius: 6,
                boxShadow: "0 14px 34px rgba(38,70,83,.22)",
                // En el finale la pila desaparece para dar paso al deck interactivo (#7).
                opacity: isFinale ? 0 : isCardVisible ? 1 : 0,
                transform: isCardVisible
                  ? `translateY(0) rotate(${totalRotate}deg) scale(1)`
                  : `translateY(-80px) rotate(${totalRotate}deg) scale(0.88)`,
                transition: isCardVisible
                  ? `transform 0.55s cubic-bezier(0.2,0.8,0.3,1) ${i * 0.06}s, opacity 0.4s ease ${i * 0.06}s`
                  : "transform 0.3s ease, opacity 0.25s ease",
                zIndex: i + 1,
                cursor: "default",
              } as React.CSSProperties}
            >
              <div
                className="crd-destinos-card-media"
                style={{
                  position: "relative",
                  width: "100%",
                  height: 196,
                  borderRadius: 3,
                  overflow: "hidden",
                  background: "#F5EFE2",
                }}
              >
                <Image
                  src={pol.image}
                  alt={pol.name}
                  fill
                  sizes="(max-width: 899px) 196px, (max-width: 1440px) 17vw, 270px"
                  style={{ objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0, right: 0, bottom: 0,
                    padding: "14px 12px 12px",
                    background:
                      "linear-gradient(transparent,rgba(38,70,83,.55) 35%,rgba(38,70,83,.94))",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    alignItems: "flex-start",
                  }}
                >
                  <CategoryChip icon={CATEGORY_META[pol.category].icon}>{pol.tagline}</CategoryChip>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.92)", lineHeight: 1.4 }}>
                    {pol.desc}
                  </p>
                </div>
              </div>
              <figcaption style={{ padding: "12px 4px 14px" }}>
                <div
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontWeight: 700,
                    fontSize: 24,
                    lineHeight: 1,
                    color: "#264653",
                  }}
                >
                  {pol.name}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: "#5B6B72",
                    marginTop: 3,
                  }}
                >
                  {pol.meta}
                </div>
              </figcaption>
            </figure>
          );
        })}

        {/* #7 — deck interactivo: aparece cuando la pila queda completa (finale) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: isFinale ? 1 : 0,
            pointerEvents: isFinale ? "auto" : "none",
            transition: "opacity 0.5s ease",
          }}
        >
          <PolaroidDeck items={POLAROIDS} />
        </div>
      </div>
    </>
  );
}
