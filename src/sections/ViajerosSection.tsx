"use client";

import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import PhoneMockup from "@/sections/PhoneMockup";
import Kicker from "@/components/Kicker";
import { PANEL_GLASS } from "@/lib/surfaces";

// ─── Data ─────────────────────────────────────────────────────────────────────

// `color` is the icon ink — accessible on its tinted surface.
const FEATURES: { icon: IconName; bg: string; color: string; title: string; desc: string }[] = [
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
        {/* En móvil el sheet no tiene fondo propio y el H2 caía directo sobre
            "DOMINICAN / HAITI" (audit 2.1) → chip crema con blur, como el del
            heading de Destinos en desktop. */}
        <div
          className={`mb-3.5 max-desk:w-fit max-desk:rounded-card max-desk:border max-desk:border-line/80 max-desk:bg-cream/88 max-desk:px-3.5 max-desk:py-3 max-desk:backdrop-blur-[8px] ${isVisible ? "animate-slide-up" : ""}`}
        >
          <Kicker icon="hiking" className="mb-2.5">Para viajeros</Kicker>
          {/* El text-shadow crema despega el titular de las etiquetas del mapa. */}
          <h2 className="m-0 font-display text-[clamp(18px,2.2vw,28px)] font-bold leading-[1.1] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            Viaja como local,<br /><em className="crd-accent">descubre como nadie</em>
          </h2>
        </div>

        {/* Feature cards (glassmorphism, bordes unidos). first:/last: sustituyen
            la lógica por índice que antes calculaba borde y radios. */}
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`flex items-start gap-[11px] border-t-0 ${PANEL_GLASS} px-[15px] py-[13px]
              first:rounded-t-2xl first:border-t last:rounded-b-2xl
              ${isVisible ? "animate-slide-up" : ""}`}
            style={isVisible ? { animationDelay: `${i * 0.08 + 0.1}s` } : undefined}
          >
            <div
              className="flex size-[38px] shrink-0 items-center justify-center rounded-tile"
              style={{ background: f.bg }}
            >
              <Icon name={f.icon} className="text-xl" style={{ color: f.color }} />
            </div>
            <div>
              <h3 className="m-0 mb-[3px] text-copy font-bold text-ink">{f.title}</h3>
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
