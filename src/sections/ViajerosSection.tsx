"use client";

import { useScene } from "@/context/SceneContext";
import PhoneMockup from "@/sections/PhoneMockup";

// ─── Data ─────────────────────────────────────────────────────────────────────

// `color` is the icon ink — accessible on its tinted surface.
const FEATURES = [
  { icon: "explore",      bg: "#FFE7DF", color: "#B23410", title: "Lugares auténticos",  desc: "Destinos poco conocidos fuera del circuito tradicional, recomendados de verdad." },
  { icon: "verified",     bg: "#C6F3EB", color: "#0C6A60", title: "Info confiable",       desc: "Datos actualizados y reseñas reales de otros exploradores como tú." },
  { icon: "auto_stories", bg: "#FFE6C8", color: "#985409", title: "Diario de viaje",      desc: "Guarda tu historial, sube fotos y gana insignias por cada destino visitado." },
  { icon: "chat",         bg: "#FFE7DF", color: "#B23410", title: "Contacto directo",     desc: "Habla con cada negocio por WhatsApp o Instagram, sin intermediarios." },
];

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function ViajerosOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "viajeros";

  return (
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
      {/* Columna izquierda: encabezado + feature cards */}
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

        {/* Feature cards (glassmorphism, joined borders) */}
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
              <p style={{ margin: 0, color: "#5B6B72", fontSize: 12, lineHeight: 1.45 }}>
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* #10 — mockup de teléfono a la derecha (mapa visible al centro) */}
      <div
        className="crd-phone-wrap"
        style={{
          position: "absolute",
          right: "clamp(20px, 6%, 96px)",
          top: "50%",
          transform: "translateY(-50%)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease 0.1s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}
      >
        <PhoneMockup />
      </div>
    </div>
  );
}
