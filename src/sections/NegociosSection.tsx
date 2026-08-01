"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import { MapMarker, MarkerContent, MapArc } from "@/components/map/Map";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import type { LngLat } from "@/lib/geo";

// ─── Data ─────────────────────────────────────────────────────────────────────

const BENEFITS: { icon: IconName; title: string; desc: string }[] = [
  { icon: "visibility", title: "Más visibilidad ante viajeros reales", desc: "Perfil digital con fotos, reseñas y contacto directo." },
  { icon: "insights", title: "Decisiones basadas en datos", desc: "Visitas, flujo de clientes y procedencia, en tiempo real." },
  { icon: "qr_code_2", title: "Trato especial con QR", desc: "Reconoce a tus clientes de ConoceRD al escanear." },
];

const BARS = [
  { label: "Santiago", pct: 86, color: "#F76C4D", delay: "0s" },
  { label: "Sto. Dgo.", pct: 64, color: "#FF8D16", delay: ".15s" },
  { label: "Extranjero", pct: 41, color: "#25CCB8", delay: ".30s" },
];

const PERIODS = [
  { label: "Hoy", count: "142" },
  { label: "Semana", count: "980" },
  { label: "Mes", count: "4.2k" },
];

// #11 — el negocio (Santiago) y las provincias desde donde "vienen" clientes.
// El nº de orígenes alimenta el dashboard ("Clientes en camino ahora").
const BUSINESS: LngLat = [-70.6901, 19.4517];

const ARC_ORIGINS: { name: string; coords: LngLat; color: string }[] = [
  { name: "Santo Domingo", coords: [-69.93, 18.47], color: "#F76C4D" },
  { name: "Puerto Plata", coords: [-70.69, 19.79], color: "#FF8D16" },
  { name: "La Romana", coords: [-68.97, 18.43], color: "#25CCB8" },
  { name: "Samaná", coords: [-69.34, 19.20], color: "#FF8D16" },
  { name: "Barahona", coords: [-71.10, 18.21], color: "#F76C4D" },
  { name: "Punta Cana", coords: [-68.40, 18.58], color: "#25CCB8" },
];

const ARRIVING = ARC_ORIGINS.length;

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function NegociosOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "negocios";

  // Bars animate to full width once, 350 ms after overlay fades in
  const [barsActive, setBarsActive] = useState(false);
  const barsRef = useRef(false);

  useEffect(() => {
    if (!isVisible || barsRef.current) return;
    barsRef.current = true;
    const t = setTimeout(() => setBarsActive(true), 350);
    return () => clearTimeout(t);
  }, [isVisible]);

  return (
    <>
      {/* #11 — arcos animados desde varias provincias convergiendo al negocio */}
      {isVisible &&
        ARC_ORIGINS.map((o, i) => (
          <MapArc
            key={o.name}
            id={`negocio-arc-${i}`}
            from={o.coords}
            to={BUSINESS}
            color={o.color}
            width={2.4}
            bend={0.22}
            animated={false}
          />
        ))}

      {/* #11 — pin "Tu negocio" en Santiago */}
      {isVisible && (
        <MapMarker longitude={BUSINESS[0]} latitude={BUSINESS[1]} anchor="bottom">
          <MarkerContent>
            <div className="flex flex-col items-center gap-1">
              <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] font-display text-[10.5px] font-extrabold text-white shadow-[0_4px_12px_rgba(38,70,83,0.25)]">
                Tu negocio
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border-[2.5px] border-[#FBF7EF] bg-mango shadow-[0_4px_14px_rgba(255,141,22,0.42)]">
                <Icon name="storefront" className="text-[22px] text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Overlay container */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* ── Left column ──
            Dos clases siguen en globals.css a propósito: .crd-ol-panel es
            compartida por Mapa/Viajeros/Negocios y aporta el reflow a
            bottom-sheet en móvil (incluido su ::before), y .crd-business-story
            resuelve el max-height scrolleable, que necesita ganarle a
            .crd-ol-panel en la cascada. El resto —posición, ancho y chrome— va
            en Tailwind. */}
        <div
          className={`crd-ol-panel crd-business-story absolute box-border rounded-[22px] border border-line/96 bg-white p-[18px] shadow-[0_24px_56px_rgba(38,70,83,.18),0_2px_6px_rgba(38,70,83,.06)]
            left-[clamp(16px,3%,40px)] top-[clamp(82px,11dvh,112px)] w-[clamp(240px,26vw,308px)]
            ${isVisible ? "animate-slide-up" : ""}`}
        >
          <div className="mb-3 flex items-center gap-2 font-mono text-[9.5px] font-bold uppercase tracking-[.085em] text-mint-ink">
            <Icon
              name="storefront"
              className="grid size-7 place-items-center rounded-[9px_9px_9px_2px] bg-mint text-base text-white shadow-[4px_4px_0_#C6F3EB]"
            />
            <span>ConoceRD para negocios</span>
          </div>

          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-extrabold leading-[1.04] tracking-[-.035em] text-ink-2">
            Tu negocio, dentro de la ruta
          </h2>
          <p className="mb-[15px] mt-2 text-xs leading-[1.45] text-muted">
            Haz que el interés de los viajeros se convierta en una visita real.
          </p>

          {/* La línea punteada que une los pasos es un ::before, por eso la ruta
              conserva clase propia en globals.css. */}
          <div
            className="crd-business-route mb-2 flex flex-col gap-[11px] rounded-[14px] border border-line bg-cream px-3 pb-[13px] pt-[11px]"
            aria-label="Cómo funciona ConoceRD para tu negocio"
          >
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className={`relative flex items-start gap-2.5 ${isVisible ? "animate-slide-up" : ""}`}
                style={isVisible ? { animationDelay: `${i * 0.07 + 0.15}s` } : undefined}
              >
                <Icon
                  name={b.icon}
                  className="flex size-[21px] shrink-0 items-center justify-center rounded-[7px] border border-mint-soft bg-white text-sm leading-none text-mint"
                />
                <div>
                  <div className="font-display text-xs font-bold leading-[1.25] text-ink">{b.title}</div>
                  <div className="mt-0.5 text-[10.5px] leading-[1.35] text-muted">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA — lleva al formulario con el toggle ya en "negocio" */}
          <button
            onClick={() => requestSubscribe("negocio")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-mint px-[18px] py-[11px] font-display text-[13.5px] font-extrabold text-white shadow-[0_8px_24px_rgba(37,204,184,0.38)] transition-[background-color,transform] duration-200 hover:bg-mint-ink hover:-translate-y-0.5 focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-ink-2"
          >
            <Icon name="add_business" className="text-lg text-white" />
            Registrar mi negocio
          </button>
        </div>

        {/* ── Right side — dashboard mockup ── */}
        <div
          className={`crd-ol-panel-right crd-business-dashboard absolute box-border rounded-[22px] bg-white p-[18px] shadow-[0_30px_70px_rgba(38,70,83,.22)]
            right-[clamp(16px,4%,56px)] top-[clamp(86px,14dvh,132px)] w-[clamp(250px,27vw,340px)]
            ${isVisible ? "animate-slide-up [animation-delay:0.2s]" : ""}`}
        >
          {/* Header */}
          <div className="mb-3.5 flex items-center justify-between">
            <div>
              <div className="font-display text-sm font-extrabold text-ink">Panel de tu negocio</div>
              <div className="font-mono text-[10px] text-muted-2">Datos de demostración</div>
            </div>
            <div className="flex items-center gap-[5px] rounded-full bg-mint-soft px-2.5 py-1">
              <span className="block size-[7px] animate-live-dot rounded-full bg-mint" />
              <span className="font-display text-[10px] font-bold text-[#1a9b8c]">EN VIVO</span>
            </div>
          </div>

          {/* Clientes en camino */}
          <div className="mb-3 rounded-[14px] bg-mango px-4 py-3.5 text-white">
            <div className="text-xs font-semibold opacity-[0.92]">Clientes en camino ahora</div>
            <div className="mt-[3px] flex items-baseline gap-2">
              <span className="font-mono text-[38px] font-bold leading-none">{ARRIVING}</span>
              <span className="text-xs opacity-90">personas llegando</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {PERIODS.map((item) => (
              <div key={item.label} className="rounded-xl bg-cream p-2.5">
                <div className="text-[10px] font-semibold text-muted-2">{item.label}</div>
                <div className="font-mono text-lg font-bold text-ink">{item.count}</div>
              </div>
            ))}
          </div>

          {/* Bar chart — procedencia */}
          <div className="rounded-[13px] bg-cream px-[13px] py-3">
            <div className="mb-[9px] font-display text-[11.5px] font-bold text-ink">Procedencia de clientes</div>
            <div className="flex flex-col gap-[7px]">
              {BARS.map((b) => (
                <div key={b.label} className="flex items-center gap-[9px]">
                  <span className="w-[58px] shrink-0 text-[11px] text-muted">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-[99px] bg-line">
                    <div
                      className="h-full rounded-[99px] transition-[width] duration-[1200ms] ease-[cubic-bezier(.2,.8,.3,1)]"
                      style={{
                        width: barsActive ? `${b.pct}%` : "0%",
                        background: b.color,
                        transitionDelay: b.delay,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
