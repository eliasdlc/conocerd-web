"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent } from "@/components/map/Map";

// ─── Data ─────────────────────────────────────────────────────────────────────

// `color` is the icon/number ink — accessible on its tinted/white surface.
const FEATURES = [
  { icon: "explore",      bg: "#FFE7DF", color: "#B23410", title: "Lugares auténticos",  desc: "Destinos poco conocidos fuera del circuito tradicional, recomendados de verdad." },
  { icon: "verified",     bg: "#C6F3EB", color: "#0C6A60", title: "Info confiable",       desc: "Datos actualizados y reseñas reales de otros exploradores como tú." },
  { icon: "auto_stories", bg: "#FFE6C8", color: "#985409", title: "Diario de viaje",      desc: "Guarda tu historial, sube fotos y gana insignias por cada destino visitado." },
  { icon: "chat",         bg: "#FFE7DF", color: "#B23410", title: "Contacto directo",     desc: "Habla con cada negocio por WhatsApp o Instagram, sin intermediarios." },
];

const STAT_BUBBLES = [
  { longitude: -70.30, latitude: 19.20, count: "97.7", dec: 1, suffix: "%", label: "quiere conocer más lugares", color: "#B23410" },
  { longitude: -69.93, latitude: 18.48, count: "90.3", dec: 1, suffix: "%", label: "ya hace turismo en RD",       color: "#0C6A60" },
  { longitude: -71.50, latitude: 18.50, count: "81",   dec: 0, suffix: "%", label: "quiere recomendaciones de hidden gems", color: "#985409" },
];

// ─── Stat bubble with count-up ────────────────────────────────────────────────

function StatBubble({
  stat,
  visible,
  delay,
}: {
  stat: (typeof STAT_BUBBLES)[number];
  visible: boolean;
  delay: number;
}) {
  const [display, setDisplay] = useState(`0${stat.suffix}`);
  const animated = useRef(false);

  useEffect(() => {
    if (!visible || animated.current) return;
    animated.current = true;

    const target = parseFloat(stat.count);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setDisplay(stat.count + stat.suffix));
      return;
    }
    const dur = 1300;
    const t0 = performance.now();
    const fmt = (v: number) =>
      stat.dec ? v.toFixed(stat.dec) : Math.round(v).toString();

    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - k, 3);
      setDisplay(fmt(target * ease) + stat.suffix);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, stat]);

  return (
    <MarkerContent>
      <div
        className="crd-stat-marker"
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "14px 18px",
          boxShadow: "0 8px 28px rgba(38,70,83,0.18)",
          border: "1px solid #EBE6D9",
          textAlign: "center",
          minWidth: 148,
          animation: visible
            ? `mapBubbleIn 0.5s cubic-bezier(0.2,0.8,0.3,1) ${delay}s both`
            : "none",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 34,
            lineHeight: 1,
            color: stat.color,
          }}
        >
          {display}
        </div>
        <p
          style={{
            margin: "7px 0 0",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            color: "#5B6B72",
            lineHeight: 1.35,
            maxWidth: 130,
          }}
        >
          {stat.label}
        </p>
      </div>
    </MarkerContent>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function ViajerosOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "viajeros";

  return (
    <>
      {/* Stat bubbles — mounted at geographic coordinates via MapMarker portals */}
      {isVisible &&
        STAT_BUBBLES.map((stat, i) => (
          <MapMarker
            key={stat.label}
            longitude={stat.longitude}
            latitude={stat.latitude}
            anchor="bottom"
          >
            <StatBubble stat={stat} visible={isVisible} delay={i * 0.12} />
          </MapMarker>
        ))}

      {/* Left column: heading + feature cards */}
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
          className="crd-ol-panel"
          style={{
            position: "absolute",
            left: "clamp(16px, 3%, 40px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: "clamp(240px, 26vw, 310px)",
          }}
        >
          {/* Compact section heading */}
          <div
            style={{
              marginBottom: 14,
              animation: isVisible ? "slideUpIn 0.45s cubic-bezier(0.16,1,0.3,1) both" : "none",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "#C6F3EB",
                color: "#0C6A60",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: 11,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                padding: "5px 12px",
                borderRadius: 999,
                marginBottom: 10,
              }}
            >
              <span className="ms" style={{ fontSize: 14 }}>hiking</span>
              Para viajeros
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                letterSpacing: "-.025em",
                fontSize: "clamp(18px, 2.2vw, 28px)",
                lineHeight: 1.1,
                color: "#1D3A45",
                textShadow: "0 1px 2px rgba(253,248,240,0.95), 0 0 16px rgba(253,248,240,0.6)",
              }}
            >
              Viaja como local,<br />descubre como nadie
            </h2>
          </div>

          {/* Stat chips — mobile only. On desktop these same numbers live as
              map bubbles (.crd-stat-marker); on narrow screens those overlap,
              so we surface them here instead. */}
          <div
            className="crd-stat-chips"
            style={{
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {STAT_BUBBLES.map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  background: "rgba(253,248,240,0.92)",
                  border: "1px solid #EBE6D9",
                  borderRadius: 999,
                  padding: "6px 12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 16,
                    color: stat.color,
                  }}
                >
                  {stat.count}
                  {stat.suffix}
                </span>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 11,
                    color: "#5B6B72",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Stacked feature cards (glassmorphism, joined borders) */}
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                background: "rgba(253,248,240,0.88)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid #EBE6D9",
                borderTopWidth: i === 0 ? 1 : 0,
                borderTopLeftRadius: i === 0 ? 16 : 0,
                borderTopRightRadius: i === 0 ? 16 : 0,
                borderBottomLeftRadius: i === FEATURES.length - 1 ? 16 : 0,
                borderBottomRightRadius: i === FEATURES.length - 1 ? 16 : 0,
                padding: "13px 15px",
                display: "flex",
                alignItems: "flex-start",
                gap: 11,
                animation: isVisible
                  ? `slideUpIn 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.08 + 0.1}s both`
                  : "none",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: f.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="ms" style={{ fontSize: 20, color: f.color }}>
                  {f.icon}
                </span>
              </div>
              <div>
                <h3
                  style={{
                    margin: "0 0 3px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: "#264653",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "#5B6B72",
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
