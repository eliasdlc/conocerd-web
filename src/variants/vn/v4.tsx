"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 4 — "Demo en vivo" (área vn: Viajeros + Negocios).
//
//  Ambas escenas son una demo que se REPRODUCE al entrar (trigger: activeScene,
//  nunca en reposo). Un mismo reloj de demo alimenta:
//   · Viajeros: la pantalla del teléfono recorre sola 3 estados
//     (buscar → ruta trazada → llegando), con cards punteadas sincronizadas y
//     controles para pausar o tocar cada paso. La ruta usa geometría y tiempos
//     REALES por carretera (Santiago → Salto El Limón, pairs.json) y se dibuja
//     también sobre la isla de fondo.
//   · Negocios: los arcos llegan escalonados al pin del negocio y el dashboard
//     del teléfono incrementa contadores en sincronía (+1 en camino… 6 en
//     camino); las barras de procedencia crecen y al final queda estable.
//  Misma barra de progreso segmentada y mismo lenguaje visual en las dos.
//  Reduced motion ⇒ estado final directo, sin timers.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import PhoneMockup from "@/sections/PhoneMockup";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute, MapArc } from "@/components/map/Map";
import { CategoryPin, SelfPin, PIN_CHROME } from "@/components/map/pins";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { DESTINATIONS } from "@/data/destinations";
import type { LngLat } from "@/lib/geo";
import pairs from "@/data/routes/pairs.json";

// ─── Datos reales del viaje demo (Santiago → Salto El Limón) ─────────────────

const LIMON = DESTINATIONS.find((d) => d.id === "limon")!;

// La clave de pairs.legs usa el orden del array `ids` (limon va antes que
// santiago) ⇒ para Santiago → Limón se invierte la polilínea.
const LEG: [number, number][] = (
  (pairs.legs as unknown as Record<string, [number, number][]>)["limon|santiago"] ?? []
)
  .slice()
  .reverse();

const I_SANTIAGO = pairs.ids.indexOf("santiago");
const I_LIMON = pairs.ids.indexOf("limon");
const DRIVE_MIN = (pairs.min as number[][])[I_SANTIAGO][I_LIMON]; // 196
const DRIVE_KM = Math.round((pairs.km as number[][])[I_SANTIAGO][I_LIMON]); // 174
const DRIVE_LABEL = `${Math.floor(DRIVE_MIN / 60)} h ${DRIVE_MIN % 60} min`;

const START: LngLat = LEG[0] ?? [-70.6947, 19.4506];

// Proyección de la ruta real al mini-mapa del teléfono: rotación de 52° para
// que el trayecto (mayormente este-oeste) corra en diagonal por la pantalla
// vertical, y ajuste a caja conservando proporciones.
const PHONE_ROUTE = (() => {
  const th = (52 * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const rot = LEG.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos] as [number, number]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of rot) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const box = { x: 46, y: 132, w: 178, h: 266 }; // dentro del viewBox 270×560
  const s = Math.min(box.w / (maxX - minX || 1), box.h / (maxY - minY || 1));
  const ox = box.x + (box.w - (maxX - minX) * s) / 2;
  const oy = box.y + (box.h - (maxY - minY) * s) / 2;
  const pts = rot.map(([x, y]) => [ox + (x - minX) * s, oy + (maxY - y) * s] as [number, number]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  return { pts, d };
})();

function phonePointAt(frac: number): [number, number] {
  const pts = PHONE_ROUTE.pts;
  if (!pts.length) return [135, 280];
  const i = Math.min(pts.length - 1, Math.max(0, Math.round(frac * (pts.length - 1))));
  return pts[i];
}

// ─── Reloj de demo compartido ────────────────────────────────────────────────

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

function useDemoClock(active: boolean, duration: number, reduced: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startedRef = useRef(false);

  // (Re)arranca la demo cada vez que la escena entra. Con reduced motion salta
  // directo al estado final.
  useEffect(() => {
    if (!active) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    const t = setTimeout(
      () => {
        setElapsed(reduced ? duration : 0);
        setPlaying(!reduced);
      },
      reduced ? 0 : 350
    );
    return () => clearTimeout(t);
  }, [active, duration, reduced]);

  const ended = elapsed >= duration;
  const running = active && playing && !reduced && !ended;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed((e) => Math.min(duration, e + 80));
    }, 80);
    return () => clearInterval(id);
  }, [running, duration]);

  const toggle = () => {
    if (reduced) return;
    if (ended) {
      setElapsed(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  const seek = (ms: number) => {
    setElapsed(Math.min(ms, duration));
    setPlaying(false);
  };

  return { elapsed, ended, playing, running, toggle, seek };
}

// ─── Lenguaje visual compartido de la demo ───────────────────────────────────

function PlayGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.6 5.6v12.8L19 12Z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6.2v11.6M15 6.2v11.6" />
    </svg>
  );
}

/** Barra de progreso segmentada + botón pausa/replay: idéntica en ambas escenas. */
function DemoBar({
  label,
  values,
  colors,
  playing,
  ended,
  reduced,
  onToggle,
}: {
  label: string;
  values: number[];
  colors?: string[];
  playing: boolean;
  ended: boolean;
  reduced: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {!reduced && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={ended ? "Repetir la demo" : playing ? "Pausar la demo" : "Reanudar la demo"}
          className="flex size-8 max-desk:size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-ink/25 bg-white text-ink-2 transition-colors duration-150 hover:bg-cream-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-2"
        >
          {playing && !ended ? <PauseGlyph /> : <PlayGlyph />}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-[5px] truncate font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
          {label}
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {values.map((v, i) => (
            <div key={i} className="h-[5px] flex-1 overflow-hidden rounded-full bg-ink/12">
              <div
                className="h-full rounded-full transition-[width] duration-150 ease-linear"
                style={{ width: `${v * 100}%`, background: colors?.[i] ?? "#1D3A45" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Cards punteadas (requisito del dueño) con tonos de marca por paso.
const TONES = {
  coral: { border: "border-coral", tile: "bg-coral-soft", ink: "text-coral-ink", bar: "#F76C4D" },
  mango: { border: "border-mango", tile: "bg-mango-soft", ink: "text-mango-ink", bar: "#FF8D16" },
  mint: { border: "border-mint", tile: "bg-mint-soft", ink: "text-mint-ink", bar: "#25CCB8" },
} as const;

type ToneKey = keyof typeof TONES;

// ─── Escena VIAJEROS ─────────────────────────────────────────────────────────

const STEP_MS = 3400;
const V_DURATION = STEP_MS * 3;
const QUERY = "salto el limón";

const V_STEPS: { icon: IconName; tone: ToneKey; title: string; desc: string; detail: string }[] = [
  {
    icon: "search",
    tone: "coral",
    title: "Busca sin adivinar",
    desc: "Escribe un lugar y sale lo auténtico primero, no lo de siempre.",
    detail: `«${QUERY}»`,
  },
  {
    icon: "route",
    tone: "mango",
    title: "Ruta real por carretera",
    desc: "Kilómetros y tiempo de manejo de verdad, no línea recta.",
    detail: `${DRIVE_LABEL} · ${DRIVE_KM} km`,
  },
  {
    icon: "workspace_premium",
    tone: "mint",
    title: "Llega y desbloquea",
    desc: "Check-in, insignia de viajero y contacto directo con locales.",
    detail: `★ ${LIMON.rating} · Insignia «Cascada»`,
  },
];

function ViajerosScreen({ step, routeFrac, typed }: { step: number; routeFrac: number; typed: string }) {
  const dest = PHONE_ROUTE.pts[PHONE_ROUTE.pts.length - 1] ?? [180, 150];
  const self = phonePointAt(step >= 2 ? 0.93 : 0.02);
  const suggestionsOn = step === 0 && typed.length >= 4;

  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      {/* mini-mapa: calles falsas + ruta REAL proyectada */}
      <svg viewBox="0 0 270 560" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d="M-10,200 C80,170 150,280 300,230" fill="none" stroke="#ffffff" strokeWidth="13" opacity="0.7" />
        <path d="M50,-10 C80,150 30,330 130,580" fill="none" stroke="#ffffff" strokeWidth="11" opacity="0.6" />
        <path d="M-10,420 C90,400 190,450 290,410" fill="none" stroke="#ffffff" strokeWidth="9" opacity="0.5" />
        {/* halo + trazo de la ruta, dibujados por la demo */}
        <path
          d={PHONE_ROUTE.d}
          fill="none"
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - routeFrac}
          opacity={step >= 1 ? 0.9 : 0}
        />
        <path
          d={PHONE_ROUTE.d}
          fill="none"
          stroke="#FF8D16"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - routeFrac}
          opacity={step >= 1 ? 1 : 0}
        />
      </svg>

      {/* barra de estado */}
      <div className="absolute inset-x-4 top-[9px] flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[.02em] text-ink-2">9:41</span>
        <span className="flex items-center gap-1">
          <svg width={12} height={9} viewBox="0 0 12 9" aria-hidden="true">
            <rect x="0" y="6" width="2" height="3" rx="0.6" fill="#1D3A45" />
            <rect x="3.3" y="4" width="2" height="5" rx="0.6" fill="#1D3A45" />
            <rect x="6.6" y="2" width="2" height="7" rx="0.6" fill="#1D3A45" />
            <rect x="9.9" y="0" width="2" height="9" rx="0.6" fill="#1D3A45" opacity="0.35" />
          </svg>
          <svg width={18} height={9} viewBox="0 0 18 9" aria-hidden="true">
            <rect x="0.5" y="0.5" width="14" height="8" rx="2.4" fill="none" stroke="#1D3A45" strokeOpacity="0.5" />
            <rect x="2" y="2" width="9" height="5" rx="1.2" fill="#1D3A45" />
            <rect x="15.6" y="2.8" width="1.8" height="3.4" rx="0.9" fill="#1D3A45" opacity="0.5" />
          </svg>
        </span>
      </div>

      {/* estado 1 — búsqueda con tecleo */}
      <div
        className={`absolute inset-x-4 top-11 transition-opacity duration-400 ${step === 0 ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex h-[38px] items-center gap-2 rounded-full bg-white px-3.5 shadow-card">
          <Icon name="search" className="text-lg text-coral-ink" />
          <span className="min-w-0 truncate text-tiny text-ink">
            {typed}
            <span className="text-muted-2">{typed.length < QUERY.length ? "|" : ""}</span>
          </span>
        </div>
        <div
          className={`mt-2 overflow-hidden rounded-panel bg-white shadow-card transition-opacity duration-300 ${suggestionsOn ? "opacity-100" : "opacity-0"}`}
        >
          {[
            { icon: "forest" as IconName, c: "#2E7D32", t: "Salto El Limón", s: "Samaná · Cascada 40 m", hit: true },
            { icon: "beach_access" as IconName, c: "#0C6A60", t: "Playa Frontón", s: "Samaná · Playa", hit: false },
            { icon: "forest" as IconName, c: "#2E7D32", t: "Los Haitises", s: "Parque nacional", hit: false },
          ].map((r) => (
            <div
              key={r.t}
              className={`flex items-center gap-2.5 border-b border-line/70 px-3 py-[9px] last:border-b-0 ${r.hit ? "bg-cream" : ""}`}
            >
              <Icon name={r.icon} className="shrink-0 text-base" style={{ color: r.c }} />
              <span className="min-w-0">
                <span className="block truncate text-tiny font-bold leading-[1.2] text-ink">{r.t}</span>
                <span className="block truncate font-mono text-micro text-muted">{r.s}</span>
              </span>
              {r.hit && <Icon name="arrow_outward" className="ml-auto shrink-0 text-sm text-coral-ink" />}
            </div>
          ))}
        </div>
      </div>

      {/* estados 2 y 3 — píldora superior con el destino */}
      <div
        className={`absolute inset-x-4 top-11 flex h-[34px] items-center gap-2 rounded-full bg-white px-3 shadow-card transition-opacity duration-400 ${step >= 1 ? "opacity-100" : "opacity-0"}`}
      >
        <Icon name={step >= 2 ? "check_circle" : "route"} className={`text-base ${step >= 2 ? "text-mint-ink" : "text-mango-ink"}`} />
        <span className="min-w-0 truncate text-tiny font-bold text-ink">{LIMON.name}</span>
        <span className={`ml-auto shrink-0 font-mono text-micro font-bold ${step >= 2 ? "text-mint-ink" : "text-mango-ink"}`}>
          {step >= 2 ? "A 400 m" : "En ruta"}
        </span>
      </div>

      {/* pin destino */}
      <div
        className={`absolute transition-opacity duration-400 ${step >= 1 ? "opacity-100" : "opacity-0"}`}
        style={{ left: `${dest[0] / 2.7}%`, top: `${dest[1] / 5.6}%`, transform: "translate(-50%,-50%)" }}
      >
        {step >= 2 && (
          <span key="ping" className="vn4-ping absolute inset-[-6px] rounded-full border-2 border-mint" />
        )}
        <CategoryPin category={LIMON.category} state={step >= 2 ? "done" : "default"} size={30} />
      </div>

      {/* self-pin viajando por la ruta */}
      <div
        className="absolute transition-[left,top] duration-700 ease-in-out"
        style={{ left: `${self[0] / 2.7}%`, top: `${self[1] / 5.6}%`, transform: "translate(-50%,-50%)" }}
      >
        <SelfPin heading={step >= 2 ? 24 : 62} size={30} />
      </div>

      {/* estado 2 — tarjeta de ruta */}
      <div
        className={`absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-panel bg-white p-3 shadow-card transition-all duration-400 ${step === 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-tile bg-mango-soft">
          <Icon name="route" className="text-lg text-mango-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-copy font-bold leading-tight text-ink">{DRIVE_LABEL}</div>
          <div className="mt-0.5 font-mono text-micro text-muted">{DRIVE_KM} km · por carretera</div>
        </div>
        <div className="shrink-0 rounded-full bg-mango px-3.5 py-2 text-xs font-bold text-white">Iniciar</div>
      </div>

      {/* estado 3 — llegada + insignia */}
      <div
        className={`absolute inset-x-3 bottom-3 rounded-panel bg-white p-3 shadow-card transition-all duration-400 ${step >= 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
      >
        <div className="flex items-center gap-2">
          <Icon name="check_circle" className="shrink-0 text-lg text-mint-ink" />
          <div className="min-w-0">
            <div className="truncate text-copy font-bold leading-tight text-ink">Llegaste a {LIMON.name}</div>
            <div className="mt-0.5 font-mono text-micro text-muted">★ {LIMON.rating} · {LIMON.province} · check-in hecho</div>
          </div>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-chip bg-mango-soft px-2 py-1 text-micro font-bold text-mango-ink">
            <Icon name="workspace_premium" className="text-xs" />
            Insignia «Cascada»
          </span>
          <span className="inline-flex items-center gap-1 rounded-chip bg-mint-soft px-2 py-1 text-micro font-bold text-mint-ink">
            <Icon name="chat" className="text-xs" />
            Guía local
          </span>
        </div>
      </div>
    </div>
  );
}

function ViajerosDemo() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "viajeros";
  const reduced = !!useReducedMotion();
  const { elapsed, ended, playing, seek, toggle } = useDemoClock(isVisible, V_DURATION, reduced);

  const step = Math.min(2, Math.floor(elapsed / STEP_MS));
  const segValues = V_STEPS.map((_, i) => clamp01((elapsed - i * STEP_MS) / STEP_MS));
  const routeFrac = step >= 2 || ended ? 1 : step === 1 ? clamp01((elapsed - STEP_MS) / (STEP_MS * 0.7)) : 0;
  const typedCount = step > 0 || ended ? QUERY.length : Math.floor(clamp01((elapsed / STEP_MS) * 1.5) * QUERY.length);
  const typed = QUERY.slice(0, typedCount);

  // La misma ruta real se va trazando sobre la isla, sincronizada con el teléfono.
  const mapCoords = useMemo(() => {
    if (routeFrac <= 0) return null;
    return LEG.slice(0, Math.max(2, Math.ceil(routeFrac * LEG.length)));
  }, [routeFrac]);

  return (
    <>
      {isVisible && mapCoords && (
        <MapRoute id="vn4-viaje" coordinates={mapCoords} color="#FF8D16" width={3} opacity={0.9} />
      )}
      {isVisible && (
        <MapMarker longitude={START[0]} latitude={START[1]}>
          <MarkerContent>
            <SelfPin heading={80} size={28} />
          </MarkerContent>
        </MapMarker>
      )}
      {isVisible && step >= 1 && (
        <MapMarker longitude={LIMON.coords[0]} latitude={LIMON.coords[1]}>
          <MarkerContent>
            <MarkerLabel position="top">{LIMON.name}</MarkerLabel>
            <CategoryPin category={LIMON.category} state={step >= 2 ? "done" : "default"} size={28} />
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
        {/* Columna izquierda: encabezado + cards punteadas + barra de demo */}
        <div className="crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 w-[clamp(248px,27vw,330px)] -translate-y-1/2">
          <div
            className={`mb-3 max-desk:w-fit max-desk:rounded-card max-desk:border max-desk:border-line/80 max-desk:bg-cream/88 max-desk:px-3.5 max-desk:py-3 max-desk:backdrop-blur-[8px] ${isVisible ? "animate-slide-up" : ""}`}
          >
            <Kicker icon="hiking" index="03" className="mb-2.5">Viajeros</Kicker>
            <h2 className="m-0 font-display text-[clamp(18px,2.2vw,27px)] font-bold leading-[1.1] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
              De la búsqueda al destino,<br /><em className="crd-accent">paso a paso</em>
            </h2>
            <p className="m-0 mt-2 text-xs leading-[1.45] text-ink/80 [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
              La app hace el viaje completo sola. Dale pausa o toca un paso.
            </p>
          </div>

          <div role="group" aria-label="Pasos de la demo de viajeros" className="flex flex-col gap-2">
            {V_STEPS.map((s, i) => {
              const t = TONES[s.tone];
              const active = step === i;
              const done = elapsed >= (i + 1) * STEP_MS;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => seek(i * STEP_MS + 1)}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full cursor-pointer items-start gap-2.5 rounded-card border-[1.5px] border-dashed px-3 py-2.5 text-left backdrop-blur-[10px] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-2 ${
                    active ? `${t.border} bg-white/95 shadow-card` : "border-ink/25 bg-cream/90 hover:bg-cream"
                  } ${isVisible ? "animate-slide-up" : ""}`}
                  style={isVisible ? { animationDelay: `${i * 0.07 + 0.1}s` } : undefined}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-tile ${active || done ? t.tile : "bg-white"}`}>
                    <Icon name={done && !active ? "check" : s.icon} className={`text-base ${t.ink}`} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-copy font-bold leading-[1.25] text-ink">{s.title}</span>
                    <span className="mt-0.5 block text-mini leading-[1.4] text-muted">{s.desc}</span>
                    <span
                      className={`block overflow-hidden font-mono text-mini font-bold transition-all duration-300 ${t.ink} ${active ? "mt-1 max-h-5 opacity-100" : "mt-0 max-h-0 opacity-0"}`}
                    >
                      {s.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={`mt-2.5 rounded-card ${PANEL_GLASS} px-3 py-2.5 ${isVisible ? "animate-slide-up [animation-delay:0.3s]" : ""}`}>
            <DemoBar
              label={reduced ? "Demo · Paso 3 de 3" : `Demo · Paso ${step + 1} de 3${!playing && !ended ? " · En pausa" : ""}`}
              values={reduced ? [1, 1, 1] : segValues}
              colors={V_STEPS.map((s) => TONES[s.tone].bar)}
              playing={playing}
              ended={ended}
              reduced={reduced}
              onToggle={toggle}
            />
          </div>
        </div>

        {/* Teléfono a la derecha, espejo del paso activo */}
        <div
          className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <PhoneMockup screen={<ViajerosScreen step={reduced ? 2 : step} routeFrac={routeFrac} typed={typed} />} />
        </div>
      </div>
    </>
  );
}

// ─── Escena NEGOCIOS ─────────────────────────────────────────────────────────

const BUSINESS: LngLat = [-70.6901, 19.4517];

const N_LEAD = 700;
const N_GAP = 900;

const ORIGINS: { name: string; region: string; coords: LngLat; color: string }[] = [
  { name: "Santo Domingo", region: "Sto. Dgo.", coords: [-69.93, 18.47], color: "#F76C4D" },
  { name: "Puerto Plata", region: "Norte", coords: [-70.69, 19.79], color: "#FF8D16" },
  { name: "Punta Cana", region: "Este", coords: [-68.4, 18.58], color: "#25CCB8" },
  { name: "Barahona", region: "Sur", coords: [-71.1, 18.21], color: "#2D9CDB" },
  { name: "Samaná", region: "Norte", coords: [-69.34, 19.2], color: "#FF8D16" },
  { name: "La Romana", region: "Este", coords: [-68.97, 18.43], color: "#25CCB8" },
];

const N_DURATION = N_LEAD + ORIGINS.length * N_GAP;

const REGIONS = [
  { key: "Norte", color: "#FF8D16" },
  { key: "Este", color: "#25CCB8" },
  { key: "Sto. Dgo.", color: "#F76C4D" },
  { key: "Sur", color: "#2D9CDB" },
];

const N_BENEFITS: { icon: IconName; tone: ToneKey; title: string; desc: string }[] = [
  { icon: "visibility", tone: "coral", title: "Te descubren", desc: "Perfil con fotos, reseñas y contacto directo por WhatsApp." },
  { icon: "insights", tone: "mango", title: "Sabes quién viene", desc: "Procedencia y flujo de visitas, al momento." },
  { icon: "qr_code_2", tone: "mint", title: "Los reconoces", desc: "QR de ConoceRD para dar trato especial al llegar." },
];

function NegociosScreen({ count, lastName, live }: { count: number; lastName: string | null; live: boolean }) {
  const regionCounts = REGIONS.map((r) => ({
    ...r,
    n: ORIGINS.slice(0, count).filter((o) => o.region === r.key).length,
  }));

  return (
    <div className="absolute inset-0 flex flex-col bg-[#FBF6EE]">
      {/* barra de estado */}
      <div className="flex items-center justify-between px-4 pt-[9px]">
        <span className="text-[10px] font-bold tracking-[.02em] text-ink-2">9:41</span>
        <span className="flex items-center gap-1">
          <svg width={12} height={9} viewBox="0 0 12 9" aria-hidden="true">
            <rect x="0" y="6" width="2" height="3" rx="0.6" fill="#1D3A45" />
            <rect x="3.3" y="4" width="2" height="5" rx="0.6" fill="#1D3A45" />
            <rect x="6.6" y="2" width="2" height="7" rx="0.6" fill="#1D3A45" />
            <rect x="9.9" y="0" width="2" height="9" rx="0.6" fill="#1D3A45" opacity="0.35" />
          </svg>
          <svg width={18} height={9} viewBox="0 0 18 9" aria-hidden="true">
            <rect x="0.5" y="0.5" width="14" height="8" rx="2.4" fill="none" stroke="#1D3A45" strokeOpacity="0.5" />
            <rect x="2" y="2" width="9" height="5" rx="1.2" fill="#1D3A45" />
            <rect x="15.6" y="2.8" width="1.8" height="3.4" rx="0.9" fill="#1D3A45" opacity="0.5" />
          </svg>
        </span>
      </div>

      {/* encabezado de la app */}
      <div className="mt-3 flex items-center gap-2 px-3.5">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-tile bg-mango ${PIN_CHROME}`}>
          <Icon name="storefront" className="text-sm text-ink-2" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-tiny font-bold leading-[1.15] text-ink">Tu negocio</span>
          <span className="block truncate font-mono text-micro text-muted">Santiago de los Caballeros</span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-mint-soft px-2 py-[3px]">
          <span className={`block size-[6px] rounded-full bg-mint ${live ? "animate-live-dot" : ""}`} />
          <span className="text-micro font-bold text-mint-ink">EN VIVO</span>
        </span>
      </div>

      {/* en camino ahora */}
      <div className="mx-3.5 mt-3 rounded-card bg-mango px-3.5 py-3 text-ink-2">
        <div className="text-micro font-bold uppercase tracking-[.06em] opacity-[0.92]">En camino ahora</div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span key={count} className="vn4-pop inline-block font-mono text-[34px] font-bold leading-none">{count}</span>
          <span className="text-micro font-semibold opacity-90">{count === 1 ? "viajero" : "viajeros"}</span>
        </div>
        <div className="mt-1.5 h-[18px]">
          {lastName ? (
            <span key={lastName + count} className="vn4-in inline-flex items-center gap-1 rounded-chip bg-white/70 px-1.5 py-[2px] font-mono text-micro font-bold text-ink-2">
              <Icon name="arrow_outward" className="text-[10px]" />
              +1 desde {lastName}
            </span>
          ) : (
            <span className="font-mono text-micro opacity-80">esperando llegadas…</span>
          )}
        </div>
      </div>

      {/* visitas al perfil */}
      <div className="mx-3.5 mt-2 grid grid-cols-3 gap-1.5">
        {[
          { label: "Hoy", value: String(142 + count) },
          { label: "Semana", value: "980" },
          { label: "Mes", value: "4.2k" },
        ].map((s) => (
          <div key={s.label} className="rounded-tile bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
            <div className="text-micro font-semibold text-muted-2">{s.label}</div>
            <div className="font-mono text-tiny font-bold text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      {/* procedencia de hoy */}
      <div className="mx-3.5 mt-2 rounded-card bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(38,70,83,0.06)]">
        <div className="mb-1.5 text-micro font-bold text-ink">De dónde vienen hoy</div>
        <div className="flex flex-col gap-[6px]">
          {regionCounts.map((r) => (
            <div key={r.key} className="flex items-center gap-2">
              <span className="w-[52px] shrink-0 truncate text-micro text-muted">{r.key}</span>
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${(r.n / 2) * 100}%`, background: r.color }}
                />
              </div>
              <span className="w-3 shrink-0 text-right font-mono text-micro font-bold text-ink">{r.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* tab bar */}
      <div className="mt-auto flex items-center justify-around border-t border-line bg-white px-2 pb-3 pt-2">
        {(
          [
            { icon: "insights", label: "Panel", on: true },
            { icon: "storefront", label: "Perfil", on: false },
            { icon: "chat", label: "Chats", on: false },
            { icon: "notifications_active", label: "Avisos", on: false },
          ] as { icon: IconName; label: string; on: boolean }[]
        ).map((t) => (
          <span key={t.label} className={`flex flex-col items-center gap-[1px] ${t.on ? "text-mango-ink" : "text-muted-2"}`}>
            <Icon name={t.icon} className="text-base" />
            <span className="text-[8.5px] font-bold">{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function NegociosDemo() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "negocios";
  const reduced = !!useReducedMotion();
  const { elapsed, ended, playing, running, toggle } = useDemoClock(isVisible, N_DURATION, reduced);

  const count = elapsed < N_LEAD ? 0 : Math.min(ORIGINS.length, Math.floor((elapsed - N_LEAD) / N_GAP) + 1);
  const lastName = count > 0 ? ORIGINS[count - 1].name : null;
  const segValues = ORIGINS.map((_, i) => clamp01((elapsed - (N_LEAD + i * N_GAP)) / N_GAP));

  return (
    <>
      {/* arcos escalonados: cada uno aparece cuando "su" viajero sale */}
      {isVisible &&
        ORIGINS.slice(0, count).map((o, i) => (
          <MapArc
            key={o.name}
            id={`vn4-arc-${i}`}
            from={o.coords}
            to={BUSINESS}
            color={o.color}
            width={2.4}
            bend={0.22}
            animated={false}
          />
        ))}
      {isVisible &&
        ORIGINS.slice(0, count).map((o) => (
          <MapMarker key={`dot-${o.name}`} longitude={o.coords[0]} latitude={o.coords[1]}>
            <MarkerContent>
              <div
                className="size-[11px] rounded-full border-2 border-cream/95 shadow-[0_2px_5px_rgba(0,0,0,.28)]"
                style={{ background: o.color }}
              />
            </MarkerContent>
          </MapMarker>
        ))}

      {/* pin del negocio con pulso por llegada */}
      {isVisible && (
        <MapMarker longitude={BUSINESS[0]} latitude={BUSINESS[1]} anchor="bottom">
          <MarkerContent>
            <div className="flex flex-col items-center gap-1">
              <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] text-micro font-bold text-white shadow-card">
                Tu negocio
              </div>
              <div className="relative">
                {count > 0 && (
                  <span key={count} className="vn4-ping absolute inset-[-5px] rounded-full border-2 border-mango" />
                )}
                <div className={`flex size-10 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
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
        {/* Columna izquierda */}
        <div
          className={`crd-ol-panel crd-business-story absolute box-border rounded-panel ${PANEL_SOLID} p-[18px] shadow-modal
            left-[clamp(16px,3%,40px)] top-1/2 w-[clamp(248px,27vw,330px)] -translate-y-1/2
            ${isVisible ? "animate-slide-up" : ""}`}
        >
          <Kicker icon="storefront" index="04" className="mb-3">Negocios</Kicker>

          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,26px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Tus próximos clientes <em className="crd-accent">ya van en camino</em>
          </h2>
          <p className="mb-3 mt-2 text-xs leading-[1.45] text-muted">
            Demo de un viernes en la tarde: cada arco del mapa es un viajero que marcó tu negocio como destino.
          </p>

          {/* contador espejo para móvil (el teléfono se oculta en pantallas chicas) */}
          <div className="mb-3 hidden items-center gap-2 rounded-card bg-mango px-3 py-2.5 text-ink-2 max-desk:flex">
            <span key={count} className="vn4-pop inline-block font-mono text-[26px] font-bold leading-none">{count}</span>
            <span className="min-w-0">
              <span className="block text-xs font-bold leading-tight">en camino ahora</span>
              <span className="block truncate font-mono text-micro opacity-90">
                {lastName ? `+1 desde ${lastName}` : "esperando llegadas…"}
              </span>
            </span>
          </div>

          <div className="mb-3 flex flex-col gap-2" aria-label="Lo que gana tu negocio">
            {N_BENEFITS.map((b, i) => {
              const t = TONES[b.tone];
              return (
                <div
                  key={b.title}
                  className={`flex items-start gap-2.5 rounded-card border-[1.5px] border-dashed border-ink/25 bg-cream px-3 py-2.5 ${isVisible ? "animate-slide-up" : ""}`}
                  style={isVisible ? { animationDelay: `${i * 0.07 + 0.15}s` } : undefined}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-tile ${t.tile}`}>
                    <Icon name={b.icon} className={`text-base ${t.ink}`} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-copy font-bold leading-[1.25] text-ink">{b.title}</span>
                    <span className="mt-0.5 block text-mini leading-[1.4] text-muted">{b.desc}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className={`mb-3 rounded-card border border-line bg-cream-2/60 px-3 py-2.5 ${isVisible ? "animate-slide-up [animation-delay:0.3s]" : ""}`}>
            <DemoBar
              label={
                reduced || ended
                  ? "Demo · 6 llegadas hoy"
                  : `Demo · ${count} de 6 en camino${!playing ? " · En pausa" : ""}`
              }
              values={reduced ? ORIGINS.map(() => 1) : segValues}
              colors={ORIGINS.map((o) => o.color)}
              playing={playing}
              ended={ended}
              reduced={reduced}
              onToggle={toggle}
            />
          </div>

          <button
            onClick={() => requestSubscribe("negocio")}
            className="inline-flex cursor-pointer items-center gap-2 rounded-card border-none bg-mint px-[18px] py-[11px] text-copy font-bold text-ink-2 crd-sticker transition-[background-color,color,transform] duration-200 hover:bg-mint-ink hover:text-white hover:-translate-y-0.5 focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-ink-2"
          >
            <Icon name="add_business" className="text-lg" />
            Registrar mi negocio
          </button>
        </div>

        {/* Teléfono a la derecha: el dashboard del negocio en vivo */}
        <div
          className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.15s] ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <PhoneMockup screen={<NegociosScreen count={count} lastName={lastName} live={running || ended} />} />
        </div>
      </div>
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

const VN4_CSS = `
@keyframes vn4-pop { from { transform: scale(1.3); } to { transform: scale(1); } }
.vn4-pop { animation: vn4-pop .32s cubic-bezier(.2,.8,.3,1) both; }
@keyframes vn4-ping { from { transform: scale(.55); opacity: .7; } to { transform: scale(1.8); opacity: 0; } }
.vn4-ping { animation: vn4-ping .85s ease-out both; pointer-events: none; }
@keyframes vn4-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.vn4-in { animation: vn4-in .3s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .vn4-pop, .vn4-in { animation: none; }
  .vn4-ping { animation: none; opacity: 0; }
}
`;

export default function VNVariant4() {
  return (
    <>
      <style>{VN4_CSS}</style>
      <ViajerosDemo />
      <NegociosDemo />
    </>
  );
}
