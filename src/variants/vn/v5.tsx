"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 5 — "Testimonio y producto".
//
//  Cada sección abre con una voz humana en Fraunces (cita editorial de la beta
//  o del piloto, atribuida honestamente como tal) y debajo repite la MISMA
//  estructura: card punteada de 3 pasos → teléfono de producto → CTA. La
//  simetría es deliberada: viajeros y negocios son dos lados de la misma ruta.
//  En Viajeros vende la emoción (descubrir lo que no sale en guías); en
//  Negocios vende la economía (mesas llenas y datos), con arcos animados
//  llegando al comedor piloto y un dashboard con llegadas EN VIVO que se
//  actualiza por eventos.
// ─────────────────────────────────────────────────────────────────────────────

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import Button from "@/components/Button";
import PhoneMockup from "@/sections/PhoneMockup";
import { MapMarker, MarkerContent, MapArc } from "@/components/map/Map";
import { SelfPin, PIN_CHROME } from "@/components/map/pins";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { PANEL_SOLID } from "@/lib/surfaces";
import type { LngLat } from "@/lib/geo";

// ─── Datos ────────────────────────────────────────────────────────────────────

type Step = { num: string; title: string; desc: string };

const STEPS_VIAJERO: Step[] = [
  { num: "01", title: "Descarga la app", desc: "Acceso anticipado gratis para la lista de espera." },
  { num: "02", title: "Arma tu ruta", desc: "Elige destinos poco conocidos y traza el camino por carretera." },
  { num: "03", title: "Descubre y guarda", desc: "Vive el lugar, sube fotos y gana insignias en tu diario." },
];

const STEPS_NEGOCIO: Step[] = [
  { num: "01", title: "Crea tu perfil", desc: "Fotos, horario y contacto directo. Gratis en el lanzamiento." },
  { num: "02", title: "Entra en las rutas", desc: "Los viajeros te ven en el camino que ya están recorriendo." },
  { num: "03", title: "Recibe y mide", desc: "Llegadas en vivo y procedencia real de tus clientes." },
];

// El comedor piloto vive en Santiago (la cámara de la escena está tuneada ahí).
const BUSINESS: LngLat = [-70.6901, 19.4517];

const ORIGINS: { name: string; coords: LngLat; color: string; people: number }[] = [
  { name: "Santo Domingo", coords: [-69.93, 18.47], color: "#F76C4D", people: 2 },
  { name: "Puerto Plata", coords: [-70.69, 19.79], color: "#FF8D16", people: 3 },
  { name: "La Romana", coords: [-68.97, 18.43], color: "#25CCB8", people: 1 },
  { name: "Samaná", coords: [-69.34, 19.2], color: "#FF8D16", people: 2 },
  { name: "Barahona", coords: [-71.1, 18.21], color: "#F76C4D", people: 1 },
  { name: "Punta Cana", coords: [-68.4, 18.58], color: "#25CCB8", people: 2 },
];

type Arrival = { id: number; name: string; color: string; people: number; mins: number };

const SEED_ARRIVALS: Arrival[] = [
  { id: 3, name: "Puerto Plata", color: "#FF8D16", people: 3, mins: 1 },
  { id: 2, name: "Samaná", color: "#FF8D16", people: 2, mins: 4 },
  { id: 1, name: "Santo Domingo", color: "#F76C4D", people: 2, mins: 7 },
];

const BARS = [
  { label: "Santiago", pct: 82, color: "#F76C4D", delay: "0s" },
  { label: "Sto. Dgo.", pct: 61, color: "#FF8D16", delay: ".15s" },
  { label: "Extranjero", pct: 38, color: "#25CCB8", delay: ".30s" },
];

// ─── Cita editorial ───────────────────────────────────────────────────────────

function QuoteCard({
  kicker,
  quote,
  name,
  role,
  initial,
  initialClass,
  visible,
}: {
  kicker: React.ReactNode;
  quote: React.ReactNode;
  name: string;
  role: string;
  initial: string;
  initialClass: string;
  visible: boolean;
}) {
  return (
    <div className={`${PANEL_SOLID} rounded-panel p-[18px] shadow-modal ${visible ? "animate-slide-up" : ""}`}>
      {kicker}
      <blockquote className="m-0 mt-2.5">
        <div aria-hidden="true" className="font-display text-[38px] font-bold leading-[0.6] text-coral">
          &ldquo;
        </div>
        <p className="m-0 mt-1.5 font-display text-[clamp(20px,1.85vw,25px)] font-semibold leading-[1.18] tracking-[-.012em] text-ink-2">
          {quote}
        </p>
        <footer className="mt-3.5 flex items-center gap-2.5 border-t border-dashed border-line pt-3">
          <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${initialClass}`}
          >
            {initial}
          </span>
          <div>
            <div className="text-xs font-bold leading-tight text-ink">{name}</div>
            <div className="mt-px font-mono text-micro uppercase tracking-[.12em] text-muted-2">{role}</div>
          </div>
        </footer>
      </blockquote>
    </div>
  );
}

// ─── Card punteada de pasos ───────────────────────────────────────────────────

const STEP_TONES = {
  coral: {
    card: "border-coral/45",
    badge: "border-coral/70 text-coral-ink",
    label: "text-coral-ink",
    line: "#F76C4D",
  },
  mint: {
    card: "border-mint/55",
    badge: "border-mint/80 text-mint-ink",
    label: "text-mint-ink",
    line: "#25CCB8",
  },
} as const;

function StepsCard({
  tone,
  label,
  steps,
  visible,
}: {
  tone: keyof typeof STEP_TONES;
  label: string;
  steps: Step[];
  visible: boolean;
}) {
  const t = STEP_TONES[tone];
  return (
    <div
      className={`relative mt-3 rounded-card border-[1.5px] border-dashed ${t.card} bg-cream px-3.5 pb-3.5 pt-3 ${
        visible ? "animate-slide-up" : ""
      }`}
      style={visible ? { animationDelay: "0.12s" } : undefined}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className={`font-mono text-micro font-bold uppercase tracking-[.14em] ${t.label}`}>{label}</span>
        <span className="font-mono text-micro uppercase tracking-[.14em] text-muted-2">3 pasos</span>
      </div>
      {/* Línea punteada que une los badges (misma idea que crd-business-route,
          dibujada inline para no tocar globals). */}
      <div
        aria-hidden="true"
        className="absolute bottom-[54px] left-[26.5px] top-[68px] w-px opacity-60"
        style={{ background: `repeating-linear-gradient(to bottom, ${t.line} 0 4px, transparent 4px 8px)` }}
      />
      <ol className="relative m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((s, i) => (
          <li
            key={s.num}
            className={`flex items-start gap-2.5 ${visible ? "animate-slide-up" : ""}`}
            style={visible ? { animationDelay: `${i * 0.07 + 0.2}s` } : undefined}
          >
            <span
              className={`flex size-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed bg-white font-mono text-micro font-bold ${t.badge}`}
            >
              {s.num}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold leading-[1.3] text-ink">{s.title}</div>
              <div className="mt-0.5 text-micro leading-[1.4] text-muted">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Pantalla del teléfono: app viajero ──────────────────────────────────────

function TravelerScreen() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      <svg viewBox="0 0 270 560" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M-10,200 C80,170 160,280 300,230" fill="none" stroke="#ffffff" strokeWidth="14" opacity="0.7" />
        <path d="M50,-10 C80,150 30,330 130,580" fill="none" stroke="#ffffff" strokeWidth="12" opacity="0.6" />
        <path d="M-10,390 C100,370 190,420 300,380" fill="none" stroke="#ffffff" strokeWidth="10" opacity="0.5" />
        {/* ruta activa hacia la joya escondida */}
        <path
          d="M92,352 C120,300 110,240 168,192"
          fill="none"
          stroke="#FF8D16"
          strokeWidth="4"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
      </svg>

      {/* búsqueda */}
      <div className="absolute inset-x-3.5 top-10 flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-card">
        <Icon name="search" className="text-base text-muted" />
        <span className="text-tiny text-muted">¿A dónde vamos?</span>
      </div>

      {/* filtros por categoría — Playas activo */}
      <div className="absolute inset-x-3.5 top-[86px] flex gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-mint-ink px-2 py-1 text-micro font-bold text-white shadow-card">
          <Icon name="beach_access" className="text-xs" />
          Playas
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-micro font-bold text-muted shadow-card">
          <Icon name="forest" className="text-xs" />
          Ríos
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-micro font-bold text-muted shadow-card">
          <Icon name="restaurant" className="text-xs" />
          Comida
        </span>
      </div>

      {/* destino descubierto */}
      <div className="absolute left-[57%] top-[152px] flex flex-col items-center gap-1">
        <div className="whitespace-nowrap rounded-full bg-ink/92 px-2 py-0.5 text-micro font-bold text-white shadow-card">
          Playa Frontón
        </div>
        <div className={`flex size-8 items-center justify-center rounded-full bg-mint ${PIN_CHROME}`}>
          <Icon name="beach_access" className="text-sm text-ink-2" />
        </div>
      </div>

      {/* tú, en camino */}
      <div className="absolute left-[26%] top-[320px]">
        <SelfPin heading={35} size={40} />
      </div>

      {/* ficha del destino */}
      <div className="absolute inset-x-2.5 bottom-3.5 rounded-panel bg-white p-2.5 shadow-card">
        <div className="flex items-center gap-2.5">
          <div className="relative size-[52px] shrink-0 overflow-hidden rounded-xl bg-cream-2">
            <Image src="/assets/ph-playa.png" alt="" fill sizes="52px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-tiny font-bold text-ink">Playa Frontón</div>
            <div className="mt-0.5 font-mono text-micro text-muted">★ 4.9 · Las Galeras</div>
            <span className="mt-1 inline-block rounded-full bg-mint-soft px-1.5 py-0.5 text-micro font-bold text-mint-ink">
              Fuera de guía
            </span>
          </div>
          <div className="shrink-0 self-center rounded-full bg-coral-ink px-3.5 py-2 text-xs font-bold text-white">
            Ir
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pantalla del teléfono: dashboard negocio ────────────────────────────────

function BusinessScreen({ today, arrivals, barsActive }: { today: number; arrivals: Arrival[]; barsActive: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream px-3 pb-3 pt-10">
      {/* header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-tiny font-bold text-ink">Comedor Doña Mirla</div>
          <div className="font-mono text-micro text-muted-2">Panel demo · datos de muestra</div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-mint-soft px-2 py-1">
          <span className="block size-1.5 animate-live-dot rounded-full bg-mint" />
          <span className="text-micro font-bold text-mint-ink">EN VIVO</span>
        </div>
      </div>

      {/* visitas del día — el número se re-monta en cada llegada (evento) */}
      <div className="mt-2.5 rounded-card bg-mango px-3 py-2.5 text-ink-2">
        <div className="text-micro font-semibold opacity-[0.92]">Visitas por la ruta · hoy</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span key={today} className="inline-block animate-slide-up font-mono text-[30px] font-bold leading-none">
            {today}
          </span>
          <span className="text-micro opacity-90">personas</span>
        </div>
      </div>

      {/* llegadas en vivo */}
      <div className="mt-2.5 min-h-0 flex-1">
        <div className="mb-1.5 font-mono text-micro font-bold uppercase tracking-[.13em] text-muted-2">
          Llegadas en vivo
        </div>
        <div className="flex flex-col gap-1.5">
          {arrivals.map((a) => (
            <div key={a.id} className="flex animate-slide-up items-center gap-1.5 rounded-xl bg-white px-2 py-1.5">
              <span aria-hidden="true" className="block size-1.5 shrink-0 rounded-full" style={{ background: a.color }} />
              <span className="min-w-0 flex-1 truncate text-micro font-bold text-ink">{a.name}</span>
              <span className="shrink-0 font-mono text-micro text-muted">
                +{a.people} · {a.mins === 0 ? "ahora" : `hace ${a.mins} min`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* procedencia */}
      <div className="mt-2 rounded-card bg-white px-2.5 py-2">
        <div className="mb-1.5 text-micro font-bold text-ink">Procedencia de clientes</div>
        <div className="flex flex-col gap-1.5">
          {BARS.map((b) => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="w-[52px] shrink-0 text-micro text-muted">{b.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full transition-[width] duration-[1200ms] ease-[cubic-bezier(.2,.8,.3,1)]"
                  style={{ width: barsActive ? `${b.pct}%` : "0%", background: b.color, transitionDelay: b.delay }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Escena Viajeros ─────────────────────────────────────────────────────────

function ViajerosV5() {
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
      <h2 className="sr-only">Para viajeros</h2>

      <div className="crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 w-[clamp(264px,29vw,372px)] -translate-y-1/2 max-desk:bg-cream/95 max-desk:backdrop-blur-[8px] desk:max-h-[calc(100dvh-124px)] desk:overflow-y-auto desk:[scrollbar-width:thin]">
        <QuoteCard
          kicker={<Kicker icon="hiking" index="03">Viajeros</Kicker>}
          quote={
            <>
              Llegué a una playa que <em className="crd-accent">no sale en ninguna guía</em>. Me llevó una app hecha
              aquí.
            </>
          }
          name="Carolina Peña"
          role="Viajera beta · Santiago"
          initial="C"
          initialClass="bg-coral-soft text-coral-ink"
          visible={isVisible}
        />

        <StepsCard tone="coral" label="Cómo se descubre" steps={STEPS_VIAJERO} visible={isVisible} />

        <div
          className={`mt-4 flex items-center gap-3 ${isVisible ? "animate-slide-up" : ""}`}
          style={isVisible ? { animationDelay: "0.28s" } : undefined}
        >
          <Button icon="notifications_active" onClick={() => requestSubscribe("viajero")}>
            Unirme a la lista
          </Button>
          <span className="font-mono text-micro uppercase tracking-[.1em] text-muted-2">Gratis al lanzar</span>
        </div>
      </div>

      {/* producto: app del viajero */}
      <div
        aria-hidden="true"
        className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <PhoneMockup screen={<TravelerScreen />} />
      </div>
    </div>
  );
}

// ─── Escena Negocios ─────────────────────────────────────────────────────────

function NegociosV5() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "negocios";
  const reducedMotion = useReducedMotion();

  const [arrivals, setArrivals] = useState<Arrival[]>(SEED_ARRIVALS);
  const [today, setToday] = useState(34);
  const idRef = useRef(10);

  // Barras del dashboard: animan una vez, 350 ms tras entrar la escena.
  const [barsActive, setBarsActive] = useState(false);
  const barsRef = useRef(false);
  useEffect(() => {
    if (!isVisible || barsRef.current) return;
    barsRef.current = true;
    const t = setTimeout(() => setBarsActive(true), 350);
    return () => clearTimeout(t);
  }, [isVisible]);

  // Llegadas simuladas: cada 3.4 s "llega" un grupo desde la próxima provincia.
  // Es el evento que alimenta el contador, el feed y el pulso del pin.
  useEffect(() => {
    if (!isVisible) return;
    let i = 1; // Puerto Plata ya está sembrado como "hace 1 min"
    const t = setInterval(() => {
      const o = ORIGINS[(i += 1) % ORIGINS.length];
      idRef.current += 1;
      const id = idRef.current;
      setArrivals((prev) =>
        [{ id, name: o.name, color: o.color, people: o.people, mins: 0 }, ...prev.map((a) => ({ ...a, mins: a.mins + 1 }))].slice(0, 4),
      );
      setToday((v) => v + o.people);
    }, 3400);
    return () => clearInterval(t);
  }, [isVisible]);

  const latest = arrivals[0];

  return (
    <>
      {/* arcos animados: los clientes llegando por la ruta al comedor piloto */}
      {isVisible &&
        ORIGINS.map((o, i) => (
          <MapArc
            key={o.name}
            id={`v5-negocio-arc-${i}`}
            from={o.coords}
            to={BUSINESS}
            color={o.color}
            width={2.2}
            bend={0.22}
          />
        ))}

      {/* pin del comedor piloto, con pulso por cada llegada */}
      {isVisible && (
        <MapMarker longitude={BUSINESS[0]} latitude={BUSINESS[1]} anchor="bottom">
          <MarkerContent>
            <div className="flex flex-col items-center gap-1">
              <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] text-micro font-bold text-white shadow-card">
                Comedor Doña Mirla
              </div>
              <div className="relative">
                {!reducedMotion && (
                  <motion.span
                    key={latest.id}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-mint"
                    initial={{ scale: 0.6, opacity: 0.65 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                )}
                <div className={`relative flex size-10 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
                  <Icon name="storefront" className="text-feature text-ink-2" />
                </div>
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <h2 className="sr-only">Para negocios</h2>

        <div className="crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 w-[clamp(264px,29vw,372px)] -translate-y-1/2 max-desk:bg-cream/95 max-desk:backdrop-blur-[8px] desk:max-h-[calc(100dvh-124px)] desk:overflow-y-auto desk:[scrollbar-width:thin]">
          <QuoteCard
            kicker={<Kicker icon="storefront" index="04">Negocios</Kicker>}
            quote={
              <>
                Un martes cualquiera <em className="crd-accent">se me llenó el comedor</em>. Todos llegaron por la ruta.
              </>
            }
            name="Mirla Rodríguez"
            role="Comedor piloto · Santiago"
            initial="M"
            initialClass="bg-mint-soft text-mint-ink"
            visible={isVisible}
          />

          {/* móvil: el teléfono se oculta, así que la señal EN VIVO baja al sheet */}
          <div className="mt-3 hidden items-center justify-between gap-2 rounded-card border border-line bg-white px-3 py-2.5 max-desk:flex">
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="block size-1.5 animate-live-dot rounded-full bg-mint" />
              <span className="font-mono text-micro font-bold uppercase tracking-[.13em] text-mint-ink">En vivo</span>
            </span>
            <span className="min-w-0 truncate text-right text-mini text-ink">
              <b className="font-mono">{today}</b> visitas hoy · última desde {latest.name}
            </span>
          </div>

          <StepsCard tone="mint" label="Cómo se llena" steps={STEPS_NEGOCIO} visible={isVisible} />

          <div
            className={`mt-4 flex items-center gap-3 ${isVisible ? "animate-slide-up" : ""}`}
            style={isVisible ? { animationDelay: "0.28s" } : undefined}
          >
            <Button variant="mint" icon="add_business" onClick={() => requestSubscribe("negocio")}>
              Registrar mi negocio
            </Button>
            <span className="font-mono text-micro uppercase tracking-[.1em] text-muted-2">Sin costo inicial</span>
          </div>
        </div>

        {/* producto: dashboard del negocio con llegadas en vivo */}
        <div
          aria-hidden="true"
          className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <PhoneMockup screen={<BusinessScreen today={today} arrivals={arrivals} barsActive={barsActive} />} />
        </div>
      </div>
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function VNVariant5() {
  return (
    <>
      <ViajerosV5 />
      <NegociosV5 />
    </>
  );
}
