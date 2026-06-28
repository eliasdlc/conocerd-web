"use client";

import Image from "next/image";
import CategoryChip from "@/components/CategoryChip";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel } from "@/components/map/Map";

// ─── Data ─────────────────────────────────────────────────────────────────────

const POLAROIDS = [
  {
    id: "aguilas",
    src: "/assets/ph-playa.png",
    rotate: -4,
    name: "Bahía de las Águilas",
    meta: "Pedernales · 17.88°N",
    icon: "beach_access",
    chip: "Playa virgen",
    desc: "8 km de arena sin un solo edificio.",
    mapCoords: [-71.77, 17.89] as [number, number],
  },
  {
    id: "duarte",
    src: "/assets/ph-montana.png",
    rotate: 3,
    name: "Pico Duarte",
    meta: "La Vega · 3,098 m",
    icon: "landscape",
    chip: "Montaña",
    desc: "El techo del Caribe, a tu alcance.",
    mapCoords: [-70.99, 19.05] as [number, number],
  },
  {
    id: "limon",
    src: "/assets/ph-cascada.png",
    rotate: -2,
    name: "Salto El Limón",
    meta: "Samaná · 40 m",
    icon: "water_drop",
    chip: "Cascada",
    desc: "A caballo entre montañas verdes.",
    mapCoords: [-69.58, 19.15] as [number, number],
  },
  {
    id: "charcos",
    src: "/assets/ph-rio.png",
    rotate: 4,
    name: "27 Charcos",
    meta: "Puerto Plata · Damajagua",
    icon: "kayaking",
    chip: "Ecoturismo",
    desc: "Salta y nada entre cascadas turquesa.",
    mapCoords: [-70.58, 19.62] as [number, number],
  },
  {
    id: "constanza",
    src: "/assets/ph-pueblo.png",
    rotate: -3,
    name: "Constanza",
    meta: "La Vega · 1,200 m",
    icon: "cottage",
    chip: "Pueblo & valle",
    desc: "Clima fresco, fresas y pinares.",
    mapCoords: [-70.72, 18.91] as [number, number],
  },
  {
    id: "haitises",
    src: "/assets/ph-sunset.png",
    rotate: 2,
    name: "Los Haitises",
    meta: "Samaná · Parque Nacional",
    icon: "forest",
    chip: "Naturaleza",
    desc: "Manglares, cuevas y cayos en bote.",
    mapCoords: [-69.66, 19.13] as [number, number],
  },
];

// Final rotation for each card in the pile = original rotate + extra scatter
const PILE_OFFSETS = [
  { left: "4%",  bottom: "8%",  extraRotate: 0    },
  { left: "7%",  bottom: "6%",  extraRotate: -1   },
  { left: "5%",  bottom: "10%", extraRotate: 1.5  },
  { left: "9%",  bottom: "7%",  extraRotate: -2   },
  { left: "3%",  bottom: "12%", extraRotate: 0.5  },
  { left: "8%",  bottom: "9%",  extraRotate: -1   },
];

const SCENE_TO_COUNT: Record<string, number> = {
  "destinos-intro":  0,
  "polaroid-0":      1,
  "polaroid-1":      2,
  "polaroid-2":      3,
  "polaroid-3":      4,
  "polaroid-4":      5,
  "polaroid-5":      6,
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

  return (
    <>
      {/* Map pins rendered via MapMarker portals (positioned by maplibre on the canvas) */}
      {POLAROIDS.filter((_, i) => i < visibleCount).map((pol) => (
        <MapMarker key={pol.id} longitude={pol.mapCoords[0]} latitude={pol.mapCoords[1]}>
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
            bottom: "43%",
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
          const totalRotate = pol.rotate + offset.extraRotate;
          const isCardVisible = i < visibleCount;

          return (
            <figure
              key={pol.id}
              style={{
                position: "absolute",
                left: offset.left,
                bottom: offset.bottom,
                margin: 0,
                width: 220,
                background: "#fff",
                padding: "12px 12px 0",
                borderRadius: 6,
                boxShadow: "0 14px 34px rgba(38,70,83,.22)",
                opacity: isCardVisible ? 1 : 0,
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
                style={{
                  position: "relative",
                  width: "100%",
                  height: 196,
                  borderRadius: 3,
                  overflow: "hidden",
                  background: "#F5EFE2",
                }}
              >
                <Image src={pol.src} alt={pol.name} fill style={{ objectFit: "cover" }} />
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
                  <CategoryChip icon={pol.icon}>{pol.chip}</CategoryChip>
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
      </div>
    </>
  );
}
