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
      className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Columna izquierda: encabezado + feature cards */}
      <div className="crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 w-[clamp(240px,26vw,310px)] -translate-y-1/2">
        <div className={`mb-3.5 ${isVisible ? "animate-slide-up" : ""}`}>
          <div className="mb-2.5 inline-flex items-center gap-[7px] rounded-full bg-mint-soft px-3 py-[5px] font-display text-[11px] font-extrabold uppercase tracking-[.12em] text-mint-ink">
            <span className="ms text-sm" aria-hidden="true">hiking</span>
            Para viajeros
          </div>
          {/* El text-shadow crema despega el titular de las etiquetas del mapa. */}
          <h2 className="m-0 font-display text-[clamp(18px,2.2vw,28px)] font-extrabold leading-[1.1] tracking-[-.025em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            Viaja como local,<br />descubre como nadie
          </h2>
        </div>

        {/* Feature cards (glassmorphism, bordes unidos). first:/last: sustituyen
            la lógica por índice que antes calculaba borde y radios. */}
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`flex items-start gap-[11px] border border-t-0 border-line bg-cream/88 px-[15px] py-[13px] backdrop-blur-[16px]
              first:rounded-t-2xl first:border-t last:rounded-b-2xl
              ${isVisible ? "animate-slide-up" : ""}`}
            style={isVisible ? { animationDelay: `${i * 0.08 + 0.1}s` } : undefined}
          >
            <div
              className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: f.bg }}
            >
              <span className="ms text-xl" aria-hidden="true" style={{ color: f.color }}>
                {f.icon}
              </span>
            </div>
            <div>
              <h3 className="m-0 mb-[3px] font-display text-[13.5px] font-bold text-ink">{f.title}</h3>
              <p className="m-0 text-xs leading-[1.45] text-muted">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* #10 — mockup de teléfono a la derecha (mapa visible al centro) */}
      <div
        className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        <PhoneMockup />
      </div>
    </div>
  );
}
