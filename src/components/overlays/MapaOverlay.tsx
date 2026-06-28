"use client";

import { useState } from "react";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent } from "@/components/map/Map";

// ─── Data ─────────────────────────────────────────────────────────────────────

// `color` = bright brand hue for the map dot + chip border/tint.
// `ink`   = accessible (WCAG AA) variant used only for the chip TEXT + icon.
const CATEGORIES = [
  { id: "playa",      label: "Playas",     icon: "beach_access",    color: "#25CCB8", ink: "#0C6A60" },
  { id: "naturaleza", label: "Naturaleza", icon: "forest",          color: "#4CAF50", ink: "#2E7D32" },
  { id: "gastro",     label: "Gastro",     icon: "restaurant",      color: "#F76C4D", ink: "#B23410" },
  { id: "cultura",    label: "Cultura",    icon: "account_balance", color: "#2D9CDB", ink: "#1F6FA8" },
  { id: "aventura",   label: "Aventura",   icon: "kayaking",        color: "#FF8D16", ink: "#985409" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

const CATEGORY_COLOR: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.color])
) as Record<CategoryId, string>;

const MAP_PINS: { name: string; lng: number; lat: number; category: CategoryId }[] = [
  { name: "Bahía de las Águilas", lng: -71.77, lat: 17.89, category: "playa"      },
  { name: "Playa Rincón",         lng: -69.55, lat: 19.33, category: "playa"      },
  { name: "Playa Frontón",        lng: -69.47, lat: 19.38, category: "playa"      },
  { name: "Las Terrenas",         lng: -69.54, lat: 19.30, category: "playa"      },
  { name: "Barahona",             lng: -71.10, lat: 18.21, category: "playa"      },
  { name: "Los Haitises",         lng: -69.66, lat: 19.13, category: "naturaleza" },
  { name: "Salto El Limón",       lng: -69.58, lat: 19.15, category: "naturaleza" },
  { name: "Lago Enriquillo",      lng: -71.62, lat: 18.48, category: "naturaleza" },
  { name: "Constanza",            lng: -70.72, lat: 18.91, category: "naturaleza" },
  { name: "Santiago",             lng: -70.70, lat: 19.45, category: "gastro"     },
  { name: "La Romana",            lng: -68.97, lat: 18.43, category: "gastro"     },
  { name: "Zona Colonial",        lng: -69.89, lat: 18.47, category: "cultura"    },
  { name: "Altos de Chavón",      lng: -68.97, lat: 18.42, category: "cultura"    },
  { name: "Puerto Plata",         lng: -70.69, lat: 19.79, category: "cultura"    },
  { name: "Pico Duarte",          lng: -70.99, lat: 19.05, category: "aventura"   },
  { name: "27 Charcos",           lng: -70.58, lat: 19.62, category: "aventura"   },
  { name: "Cabarete",             lng: -70.40, lat: 19.76, category: "aventura"   },
  { name: "Jarabacoa",            lng: -70.64, lat: 19.11, category: "aventura"   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapaOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    new Set(CATEGORIES.map((c) => c.id))
  );

  function toggleCategory(id: CategoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <>
      {/* Category pins — only mounted when scene is active */}
      {isVisible &&
        MAP_PINS.map((pin) => {
          const color = CATEGORY_COLOR[pin.category];
          const pinActive = activeCategories.has(pin.category);
          return (
            <MapMarker key={pin.name} longitude={pin.lng} latitude={pin.lat}>
              <MarkerContent>
                <div
                  title={pin.name}
                  style={{
                    width: 12,
                    height: 12,
                    background: color,
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    boxShadow: `0 0 0 4px ${color}33`,
                    opacity: pinActive ? 1 : 0,
                    transform: pinActive ? "scale(1)" : "scale(0.4)",
                    transition: "opacity 0.25s ease, transform 0.25s ease",
                    cursor: "default",
                  }}
                />
              </MarkerContent>
            </MapMarker>
          );
        })}

      {/* Glassmorphism filter card */}
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
        <div
          style={{
            position: "absolute",
            left: "clamp(16px, 3%, 40px)",
            bottom: "clamp(24px, 4%, 48px)",
            background: "rgba(253,248,240,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid #EBE6D9",
            borderRadius: 20,
            padding: "18px 20px",
            minWidth: 240,
            boxShadow: "0 8px 32px rgba(38,70,83,0.10)",
          }}
        >
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: "#264653",
              marginBottom: 14,
            }}
          >
            Arma tu recorrido
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategories.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${isActive ? cat.color : "#EBE6D9"}`,
                    background: isActive ? `${cat.color}1A` : "transparent",
                    color: isActive ? cat.ink : "#5B6B72",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s, color 0.2s",
                  }}
                  aria-pressed={isActive}
                >
                  <span className="ms" style={{ fontSize: 14 }}>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
