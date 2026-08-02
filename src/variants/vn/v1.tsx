"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  VN · Variante 1 — "Espejo exacto"
//
//  Viajeros y Negocios comparten UN solo sistema visual, espejado:
//    · Viajeros  = panel de argumento a la IZQUIERDA + teléfono a la DERECHA.
//    · Negocios  = teléfono a la IZQUIERDA + panel de argumento a la DERECHA.
//  El mismo componente <ArgumentPanel> (pasos con línea punteada mint, gancho
//  numérico en mango, CTA sticker mint) se instancia dos veces con datos
//  distintos: la coherencia no es una convención, es literalmente el mismo
//  código. El teléfono también es compartido (PhoneMockup) y solo cambia la
//  pantalla: app del viajero (mapa con ruta + cards) vs dashboard del negocio
//  (métricas en vivo + llegadas). Mismos radios, sombras, kickers y ritmo de
//  animación en ambas escenas.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import PhoneMockup from "@/sections/PhoneMockup";
import { MapMarker, MarkerContent, MapArc } from "@/components/map/Map";
import { CategoryPin, SelfPin, PIN_CHROME } from "@/components/map/pins";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { PANEL_SOLID } from "@/lib/surfaces";
import type { LngLat } from "@/lib/geo";

// ─── Datos compartidos ────────────────────────────────────────────────────────

type Step = { icon: IconName; title: string; desc: string };

const TRAVELER_STEPS: Step[] = [
  { icon: "explore", title: "Descubre lo que no sale en las guías", desc: "Destinos verificados por exploradores reales, fuera del circuito de siempre." },
  { icon: "route", title: "Arma tu ruta por carretera", desc: "Distancias y tiempos reales de manejo, parada por parada." },
  { icon: "auto_stories", title: "Viaja y colecciona sellos", desc: "Tu diario guarda cada destino visitado y desbloquea insignias." },
];

const BUSINESS_STEPS: Step[] = [
  { icon: "visibility", title: "Apareces en la ruta del viajero", desc: "Perfil con fotos, reseñas y contacto directo por WhatsApp." },
  { icon: "insights", title: "Métricas en vivo en tu panel", desc: "Visitas, llegadas y procedencia de clientes, en tiempo real." },
  { icon: "qr_code_2", title: "Reconoce a quien llega con QR", desc: "Trato especial al escanear, sin intermediarios ni comisiones." },
];

// #11 — el negocio (Santiago) y las provincias desde donde vienen los clientes.
const BUSINESS: LngLat = [-70.6901, 19.4517];

const ARC_ORIGINS: { name: string; coords: LngLat; color: string }[] = [
  { name: "Santo Domingo", coords: [-69.93, 18.47], color: "#F76C4D" },
  { name: "Puerto Plata", coords: [-70.69, 19.79], color: "#FF8D16" },
  { name: "La Romana", coords: [-68.97, 18.43], color: "#25CCB8" },
  { name: "Samaná", coords: [-69.34, 19.2], color: "#FF8D16" },
  { name: "Barahona", coords: [-71.1, 18.21], color: "#F76C4D" },
  { name: "Punta Cana", coords: [-68.4, 18.58], color: "#25CCB8" },
];

const ARRIVING = ARC_ORIGINS.length;

// Pool de llegadas para el feed en vivo del dashboard. Se rota por evento
// (nunca en reposo): cada nueva llegada entra con slide-up.
const ARRIVAL_POOL: { group: string; from: string; color: string }[] = [
  { group: "Grupo de 3", from: "Sto. Dgo.", color: "#F76C4D" },
  { group: "Pareja", from: "Pto. Plata", color: "#FF8D16" },
  { group: "Familia de 4", from: "La Romana", color: "#25CCB8" },
  { group: "Viajera sola", from: "Samaná", color: "#FF8D16" },
  { group: "Grupo de 5", from: "Barahona", color: "#F76C4D" },
  { group: "Pareja", from: "Punta Cana", color: "#25CCB8" },
];

const FEED_TIMES = ["ahora", "hace 2 min", "hace 6 min"];

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

// ─── Hooks utilitarios ────────────────────────────────────────────────────────

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false
  );
}

// ─── Sistema compartido: pasos con línea punteada ────────────────────────────

/** Card de pasos conectados por línea punteada mint. El MISMO componente se usa
 *  en Viajeros y en Negocios: iconos en tiles de 34px, numeración mono y la
 *  línea que une los centros de los tiles. */
function RouteSteps({ steps, visible, label }: { steps: Step[]; visible: boolean; label: string }) {
  return (
    <div
      role="list"
      aria-label={label}
      className="relative mb-3 flex flex-col gap-3 rounded-card border border-line bg-cream px-3 py-3"
    >
      {/* Línea punteada entre el primer y el último tile (detrás de los tiles). */}
      <span
        aria-hidden="true"
        className="absolute bottom-[52px] left-[28px] top-[46px] w-px opacity-65"
        style={{ background: "repeating-linear-gradient(to bottom, #25CCB8 0 4px, transparent 4px 8px)" }}
      />
      {steps.map((s, i) => (
        <div
          role="listitem"
          key={s.title}
          className={`relative flex items-start gap-2.5 ${visible ? "animate-slide-up" : ""}`}
          style={visible ? { animationDelay: `${i * 0.07 + 0.15}s` } : undefined}
        >
          <span className="z-[1] flex size-[34px] shrink-0 items-center justify-center rounded-tile border border-mint-soft bg-white shadow-[0_1px_2px_rgba(38,70,83,0.08)]">
            <Icon name={s.icon} className="text-base text-mint-ink" />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-micro font-bold text-mint-ink">0{i + 1}</span>
              <span className="text-xs font-bold leading-[1.25] text-ink">{s.title}</span>
            </div>
            <div className="mt-0.5 text-micro leading-[1.35] text-muted">{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Sistema compartido: gancho numérico + CTA ───────────────────────────────

/** Bloque destacado en mango con cifra grande mono y chip de urgencia. Idéntico
 *  en ambas escenas; solo cambian número, texto y chip. */
function StatHook({
  visible,
  number,
  unit,
  chipIcon,
  chip,
}: {
  visible: boolean;
  number: string;
  unit: string;
  chipIcon: IconName;
  chip: string;
}) {
  return (
    <div
      className={`mb-3 rounded-card bg-mango px-4 py-3.5 text-ink-2 ${visible ? "animate-slide-up" : ""}`}
      style={visible ? { animationDelay: "0.36s" } : undefined}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[34px] font-bold leading-none">{number}</span>
        <span className="text-xs font-semibold leading-[1.3] opacity-[0.92]">{unit}</span>
      </div>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-micro font-bold text-mango-ink">
        <Icon name={chipIcon} className="text-sm" />
        {chip}
      </span>
    </div>
  );
}

/** CTA sticker mint — el mismo botón en ambas escenas. */
function StickerCTA({
  visible,
  icon,
  onClick,
  children,
}: {
  visible: boolean;
  icon: IconName;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-card border-none bg-mint px-[18px] py-[11px] text-copy font-bold text-ink-2 crd-sticker transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-mint-ink hover:text-white focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-ink-2 ${visible ? "animate-slide-up" : ""}`}
      style={visible ? { animationDelay: "0.42s" } : undefined}
    >
      <Icon name={icon} className="text-lg" />
      {children}
    </button>
  );
}

// ─── Sistema compartido: panel de argumento ──────────────────────────────────

/** El panel completo de una escena. Se instancia DOS veces (izquierda para
 *  Viajeros, derecha para Negocios) — el espejo es el mismo componente. */
function ArgumentPanel({
  visible,
  side,
  kickerIcon,
  index,
  kickerLabel,
  title,
  lead,
  steps,
  stepsLabel,
  hook,
  cta,
}: {
  visible: boolean;
  side: "left" | "right";
  kickerIcon: IconName;
  index: string;
  kickerLabel: string;
  title: React.ReactNode;
  lead: string;
  steps: Step[];
  stepsLabel: string;
  hook: { number: string; unit: string; chipIcon: IconName; chip: string };
  cta: { icon: IconName; label: string; onClick: () => void };
}) {
  const pos =
    side === "left"
      ? "left-[clamp(16px,3%,40px)]"
      : "right-[clamp(16px,3%,40px)]";
  return (
    <div
      className={`crd-ol-panel absolute box-border ${pos} top-1/2 w-[clamp(250px,26vw,320px)] -translate-y-1/2 rounded-panel ${PANEL_SOLID} max-h-[calc(100dvh-120px)] overflow-y-auto p-[18px] shadow-modal [scrollbar-width:thin]
        ${visible ? "animate-slide-up" : ""}`}
    >
      <Kicker icon={kickerIcon} index={index} className="mb-3">{kickerLabel}</Kicker>

      <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.04] tracking-[-.012em] text-ink-2">
        {title}
      </h2>
      <p className="mb-[15px] mt-2 text-xs leading-[1.45] text-muted">{lead}</p>

      <RouteSteps steps={steps} visible={visible} label={stepsLabel} />

      <StatHook visible={visible} number={hook.number} unit={hook.unit} chipIcon={hook.chipIcon} chip={hook.chip} />

      <StickerCTA visible={visible} icon={cta.icon} onClick={cta.onClick}>
        {cta.label}
      </StickerCTA>
    </div>
  );
}

// ─── Pantalla del teléfono: app del viajero ──────────────────────────────────

/** UI de alta fidelidad de la app: mapa con ruta trazada, chips de categoría,
 *  card de destino y bottom nav. Construida con divs/SVG (no hay captura real). */
function TravelerScreen() {
  return (
    <div className="absolute inset-0 flex flex-col bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      {/* ── Mapa (capa de fondo) ── */}
      <svg viewBox="0 0 264 548" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        {/* parque / zona verde */}
        <path d="M-20,60 C60,40 120,90 90,150 C70,190 -10,180 -20,140 Z" fill="#D3EBD8" opacity="0.8" />
        <path d="M280,330 C220,320 200,380 240,420 C270,440 290,400 290,360 Z" fill="#D3EBD8" opacity="0.7" />
        {/* trazas de calles */}
        <path d="M-10,200 C80,170 150,280 290,230" fill="none" stroke="#ffffff" strokeWidth="13" opacity="0.75" />
        <path d="M40,-10 C70,140 20,320 110,560" fill="none" stroke="#ffffff" strokeWidth="11" opacity="0.65" />
        <path d="M-10,340 C90,330 180,390 280,350" fill="none" stroke="#ffffff" strokeWidth="9" opacity="0.6" />
        <path d="M200,-10 C190,120 240,260 210,420" fill="none" stroke="#ffffff" strokeWidth="8" opacity="0.55" />
        {/* ruta activa dashed mango: del self-pin al destino */}
        <path d="M148,352 C120,310 168,252 102,192" fill="none" stroke="#FF8D16" strokeWidth="4" strokeDasharray="2 6" strokeLinecap="round" />
      </svg>

      {/* ── Búsqueda + chips (sobre el mapa) ── */}
      <div className="absolute inset-x-3.5 top-11 z-[2]">
        <div className="flex h-[36px] items-center gap-2 rounded-full bg-white px-3.5 shadow-card">
          <Icon name="search" className="text-base text-muted" />
          <span className="text-tiny text-muted">¿A dónde vamos?</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-micro font-bold text-ink-2 shadow-card">
            <Icon name="forest" className="text-xs" />
            Naturaleza
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-micro font-semibold text-muted shadow-card">
            <Icon name="beach_access" className="text-xs" />
            Playas
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-micro font-semibold text-muted shadow-card">
            <Icon name="hiking" className="text-xs" />
            Aventura
          </span>
        </div>
      </div>

      {/* ── Pin de destino + etiqueta ── */}
      <div className="absolute left-[100px] top-[152px] z-[1] flex -translate-x-1/2 flex-col items-center gap-1">
        <span className="whitespace-nowrap rounded-full bg-ink/92 px-2 py-[3px] text-micro font-bold text-white shadow-card">
          Salto El Limón
        </span>
        <CategoryPin category="naturaleza" size={34} />
      </div>

      {/* ── Chip de ETA sobre la ruta ── */}
      <div className="absolute left-[124px] top-[252px] z-[1] whitespace-nowrap rounded-full bg-white px-2.5 py-1 font-mono text-micro font-bold text-ink shadow-card">
        45 min · 32 km
      </div>

      {/* ── Self-pin (inicio de la ruta) ── */}
      <div className="absolute left-[148px] top-[334px] z-[1] -translate-x-1/2">
        <SelfPin heading={-24} size={40} />
      </div>

      {/* ── Card de destino (bottom-sheet) ── */}
      <div className="absolute inset-x-3 bottom-[58px] z-[2] rounded-panel bg-white p-2.5 shadow-card">
        <div className="flex items-center gap-2.5">
          <div className="relative size-[52px] shrink-0 overflow-hidden rounded-xl bg-cream-2">
            <Image src="/assets/destino-limon.webp" alt="" fill sizes="52px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-ink">Salto El Limón</div>
            <div className="mt-0.5 font-mono text-micro text-muted">★ 4.7 · Samaná</div>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-mint-soft px-1.5 py-px text-micro font-bold text-mint-ink">
              <Icon name="forest" className="text-[10px]" />
              Naturaleza
            </span>
          </div>
          <div className="shrink-0 rounded-full bg-coral-ink px-3 py-1.5 text-xs font-bold text-white">
            Ir
          </div>
        </div>
      </div>

      {/* ── Bottom nav ── */}
      <div className="absolute inset-x-0 bottom-0 z-[2] flex h-[50px] items-stretch border-t border-line bg-white">
        {(
          [
            { icon: "explore", label: "Explora", active: true },
            { icon: "route", label: "Rutas", active: false },
            { icon: "auto_stories", label: "Diario", active: false },
            { icon: "star", label: "Sellos", active: false },
          ] as { icon: IconName; label: string; active: boolean }[]
        ).map((t) => (
          <div key={t.label} className="flex flex-1 flex-col items-center justify-center gap-px">
            <Icon name={t.icon} className={`text-base ${t.active ? "text-coral-ink" : "text-muted-2"}`} />
            <span className={`text-micro font-bold ${t.active ? "text-coral-ink" : "text-muted-2"}`}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pantalla del teléfono: dashboard del negocio ────────────────────────────

/** Dashboard web-app del negocio con métricas EN VIVO y feed de llegadas que
 *  entra por evento (respeta reduced-motion mostrando el estado estático). */
function BusinessScreen({ visible }: { visible: boolean }) {
  const reduce = usePrefersReducedMotion();

  // Barras: crecen una vez, 350 ms tras entrar la escena.
  const [barsActive, setBarsActive] = useState(false);
  const barsStarted = useRef(false);
  useEffect(() => {
    if (!visible || barsStarted.current) return;
    barsStarted.current = true;
    const t = setTimeout(() => setBarsActive(true), 350);
    return () => clearTimeout(t);
  }, [visible]);

  // Feed de llegadas: una nueva entra cada 3 s mientras la escena está activa.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible || reduce) return;
    const iv = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(iv);
  }, [visible, reduce]);

  const feed = FEED_TIMES.map((time, i) => {
    const idx = (((tick - i) % ARRIVAL_POOL.length) + ARRIVAL_POOL.length) % ARRIVAL_POOL.length;
    return { ...ARRIVAL_POOL[idx], time, key: `${tick - i}` };
  });

  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      {/* ── Header de la web-app ── */}
      <div className="shrink-0 bg-ink-2 px-3.5 pb-3 pt-10 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-tile bg-mango">
              <Icon name="storefront" className="text-sm text-ink-2" />
            </span>
            <div>
              <div className="whitespace-nowrap text-xs font-bold leading-tight">Tu panel</div>
              <div className="whitespace-nowrap font-mono text-micro leading-tight text-white/60">Demo · Santiago</div>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2 py-[3px]">
            <span className="block size-[6px] animate-live-dot rounded-full bg-mint" />
            <span className="text-micro font-bold text-mint-ink">EN VIVO</span>
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
        {/* ── Viajeros en camino ── */}
        <div className="rounded-card bg-mango px-3 py-2.5 text-ink-2">
          <div className="text-micro font-bold uppercase tracking-[.08em] opacity-[0.85]">Viajeros en camino</div>
          <div className="mt-px flex items-baseline gap-1.5">
            <span className="font-mono text-[30px] font-bold leading-none">{ARRIVING}</span>
            <span className="text-micro font-semibold opacity-90">personas llegando</span>
          </div>
        </div>

        {/* ── Stats por período ── */}
        <div className="grid shrink-0 grid-cols-3 gap-1.5">
          {PERIODS.map((p) => (
            <div key={p.label} className="rounded-xl bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
              <div className="text-micro font-semibold text-muted-2">{p.label}</div>
              <div className="font-mono text-sm font-bold text-ink">{p.count}</div>
            </div>
          ))}
        </div>

        {/* ── Feed de llegadas en vivo ── */}
        <div className="rounded-card bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
          <div className="mb-1.5 text-micro font-bold text-ink">Llegadas recientes</div>
          <div className="flex flex-col gap-1">
            {feed.map((f, i) => (
              <div
                key={f.key}
                className={`flex items-center gap-1.5 ${i === 0 && !reduce ? "animate-slide-up" : ""}`}
              >
                <span className="size-[7px] shrink-0 rounded-full" style={{ background: f.color }} />
                <span className="min-w-0 flex-1 truncate text-micro font-semibold text-ink">
                  {f.group} · {f.from}
                </span>
                <span className="shrink-0 font-mono text-micro text-muted-2">{f.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Procedencia ── */}
        <div className="rounded-card bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
          <div className="mb-1.5 text-micro font-bold text-ink">Procedencia de clientes</div>
          <div className="flex flex-col gap-[6px]">
            {BARS.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <span className="w-[52px] shrink-0 text-micro text-muted">{b.label}</span>
                <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-[width] duration-[1200ms] ease-[cubic-bezier(.2,.8,.3,1)]"
                    style={{ width: barsActive ? `${b.pct}%` : "0%", background: b.color, transitionDelay: b.delay }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right font-mono text-micro font-bold text-ink">{b.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Salud del perfil ── */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5">
          <div className="rounded-xl bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
            <div className="text-micro font-semibold text-muted-2">Perfil visto hoy</div>
            <div className="font-mono text-sm font-bold text-ink">89</div>
          </div>
          <div className="rounded-xl bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
            <div className="text-micro font-semibold text-muted-2">Rutas contigo</div>
            <div className="font-mono text-sm font-bold text-ink">12</div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between px-1 pb-0.5">
          <span className="font-mono text-micro text-muted-2">Hace 5 s</span>
          <span className="flex items-center gap-1 font-mono text-micro font-bold text-mint-ink">
            <Icon name="check_circle" className="text-xs" />
            Sincronizado
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Teléfono espejado ───────────────────────────────────────────────────────

function PhoneSide({ visible, side, screen }: { visible: boolean; side: "left" | "right"; screen: React.ReactNode }) {
  const pos = side === "left" ? "left-[clamp(20px,6%,96px)]" : "right-[clamp(20px,6%,96px)]";
  return (
    <div
      className={`crd-phone-wrap absolute ${pos} top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      <PhoneMockup screen={screen} />
    </div>
  );
}

// ─── Variante ────────────────────────────────────────────────────────────────

export default function VNVariant1() {
  const { activeScene } = useScene();
  const viajerosVisible = activeScene === "viajeros";
  const negociosVisible = activeScene === "negocios";

  return (
    <>
      {/* ── Escena Negocios: arcos de viajeros convergiendo al negocio ── */}
      {negociosVisible &&
        ARC_ORIGINS.map((o, i) => (
          <MapArc
            key={o.name}
            id={`vn1-arc-${i}`}
            from={o.coords}
            to={BUSINESS}
            color={o.color}
            width={2.4}
            bend={0.22}
            animated
          />
        ))}

      {/* Puntos de origen de los arcos */}
      {negociosVisible &&
        ARC_ORIGINS.map((o) => (
          <MapMarker key={`dot-${o.name}`} longitude={o.coords[0]} latitude={o.coords[1]} anchor="center">
            <MarkerContent>
              <span
                className="block size-[11px] rounded-full border-2 border-cream/95 shadow-[0_1px_3px_rgba(0,0,0,.3)]"
                style={{ background: o.color }}
              />
            </MarkerContent>
          </MapMarker>
        ))}

      {/* Pin "Tu negocio" en Santiago */}
      {negociosVisible && (
        <MapMarker longitude={BUSINESS[0]} latitude={BUSINESS[1]} anchor="bottom">
          <MarkerContent>
            <div className="flex flex-col items-center gap-1">
              <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] text-micro font-bold text-white shadow-card">
                Tu negocio
              </div>
              <div className={`flex size-10 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
                <Icon name="storefront" className="text-feature text-ink-2" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* ══ Escena VIAJEROS: panel izquierda + teléfono derecha ══ */}
      <div
        aria-hidden={!viajerosVisible}
        inert={!viajerosVisible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          viajerosVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ArgumentPanel
          visible={viajerosVisible}
          side="left"
          kickerIcon="hiking"
          index="03"
          kickerLabel="Viajeros"
          title={
            <>
              Viaja como local, <em className="crd-accent">descubre como nadie</em>
            </>
          }
          lead="La app que te saca del resort y te lleva a la República Dominicana de verdad."
          steps={TRAVELER_STEPS}
          stepsLabel="Cómo funciona ConoceRD para viajeros"
          hook={{
            number: "127",
            unit: "lugares esperándote",
            chipIcon: "workspace_premium",
            chip: "Insignia de fundador si entras hoy",
          }}
          cta={{
            icon: "notifications_active",
            label: "Unirme a la lista",
            onClick: () => requestSubscribe("viajero"),
          }}
        />
        <PhoneSide visible={viajerosVisible} side="right" screen={<TravelerScreen />} />
      </div>

      {/* ══ Escena NEGOCIOS: teléfono izquierda + panel derecha (espejo) ══ */}
      <div
        aria-hidden={!negociosVisible}
        inert={!negociosVisible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          negociosVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ArgumentPanel
          visible={negociosVisible}
          side="right"
          kickerIcon="storefront"
          index="04"
          kickerLabel="Negocios"
          title={
            <>
              Tu negocio, <em className="crd-accent">dentro de la ruta</em>
            </>
          }
          lead="Convierte el interés de los viajeros en visitas reales a tu local."
          steps={BUSINESS_STEPS}
          stepsLabel="Cómo funciona ConoceRD para tu negocio"
          hook={{
            number: String(ARRIVING),
            unit: "viajeros en camino ahora",
            chipIcon: "visibility",
            chip: "Míralos llegar en tu panel",
          }}
          cta={{
            icon: "add_business",
            label: "Registrar mi negocio",
            onClick: () => requestSubscribe("negocio"),
          }}
        />
        <PhoneSide visible={negociosVisible} side="left" screen={<BusinessScreen visible={negociosVisible} />} />
      </div>
    </>
  );
}
