"use client";

import { useState } from "react";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent } from "@/components/map/Map";
import {
  DESTINATIONS,
  CATEGORIES,
  CATEGORY_META,
  type Category,
} from "@/data/destinations";

// ─── Component ────────────────────────────────────────────────────────────────
// Pines y categorías vienen de la fuente de verdad única (#5).

export default function MapaOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(CATEGORIES)
  );

  function toggleCategory(id: Category) {
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
        DESTINATIONS.map((pin) => {
          const color = CATEGORY_META[pin.category].color;
          const pinActive = activeCategories.has(pin.category);
          return (
            <MapMarker key={pin.id} longitude={pin.coords[0]} latitude={pin.coords[1]}>
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
              const meta = CATEGORY_META[cat];
              const isActive = activeCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${isActive ? meta.color : "#EBE6D9"}`,
                    background: isActive ? `${meta.color}1A` : "transparent",
                    color: isActive ? meta.ink : "#5B6B72",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s, color 0.2s",
                  }}
                  aria-pressed={isActive}
                >
                  <span className="ms" style={{ fontSize: 14 }}>{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
