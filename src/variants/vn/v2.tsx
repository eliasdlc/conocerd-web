"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 2 · "Dos caras de la misma ruta"
//
//  Un solo evento contado desde los dos lados. En Viajeros, el teléfono es la
//  app de María navegando por carretera real (leg santiago→jarabacoa de
//  pairs.json) hacia el Comedor Doña Mercedes, con ETA veraz. En Negocios, el
//  MISMO teléfono (misma posición en pantalla) voltea al dashboard del comedor:
//  "María, viajera de Santiago, a 12 min", y el mapa real muestra su ruta, su
//  punto avanzando y las demás llegadas en arcos animados. El copy y la card
//  de pasos punteados se reflejan: cada sección cuenta su mitad del loop.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import PhoneMockup from "@/sections/PhoneMockup";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute, MapArc } from "@/components/map/Map";
import { CategoryPin, SelfPin, PIN_CHROME } from "@/components/map/pins";
import { PANEL_SOLID } from "@/lib/surfaces";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";
import pairs from "@/data/routes/pairs.json";

// ─── El viaje (datos reales por carretera) ────────────────────────────────────

const LEG = (pairs.legs as unknown as Record<string, [number, number][]>)["santiago|jarabacoa"];
const SI = pairs.ids.indexOf("santiago");
const JI = pairs.ids.indexOf("jarabacoa");
const TOTAL_KM = pairs.km[SI][JI]; // 49
const TOTAL_MIN = pairs.min[SI][JI]; // 51

const COMEDOR = LEG[LEG.length - 1];
const ETA_START = 12;

// Distancias acumuladas del leg para interpolar la posición de María.
const CUM: number[] = (() => {
  const out = [0];
  for (let i = 1; i < LEG.length; i++) {
    const dx = (LEG[i][0] - LEG[i - 1][0]) * Math.cos((19.3 * Math.PI) / 180);
    const dy = LEG[i][1] - LEG[i - 1][1];
    out.push(out[i - 1] + Math.hypot(dx, dy));
  }
  return out;
})();
const LEG_LEN = CUM[CUM.length - 1];

function pointAt(f: number): [number, number] {
  const d = Math.min(Math.max(f, 0), 1) * LEG_LEN;
  let i = 1;
  while (i < CUM.length - 1 && CUM[i] < d) i++;
  const t = (d - CUM[i - 1]) / (CUM[i] - CUM[i - 1] || 1);
  return [
    LEG[i - 1][0] + (LEG[i][0] - LEG[i - 1][0]) * t,
    LEG[i - 1][1] + (LEG[i][1] - LEG[i - 1][1]) * t,
  ];
}

const fracForEta = (eta: number) => Math.min(Math.max(1 - eta / TOTAL_MIN, 0), 1);
const kmLeft = (eta: number) => ((TOTAL_KM * eta) / TOTAL_MIN).toFixed(1).replace(".", ",");

// ─── Proyección del leg dentro de la pantalla del teléfono ───────────────────
// Heading-up: María viaja al sur, así que el destino queda ARRIBA (y chica).

const PHONE_VB = { w: 270, h: 560 };
const MAP_TOP = 152;
const MAP_H = 296;
const K_LAT = Math.cos((19.3 * Math.PI) / 180);
const LEG_LATS = LEG.map((p) => p[1]);
const LEG_LNGS = LEG.map((p) => p[0]);
const MIN_LAT = Math.min(...LEG_LATS);
const MAX_LAT = Math.max(...LEG_LATS);
const MID_LNG = (Math.min(...LEG_LNGS) + Math.max(...LEG_LNGS)) / 2;
const SCALE = MAP_H / (MAX_LAT - MIN_LAT);

function toPhone([lng, lat]: [number, number]) {
  return {
    x: PHONE_VB.w / 2 - (lng - MID_LNG) * K_LAT * SCALE,
    y: MAP_TOP + (lat - MIN_LAT) * SCALE,
  };
}

const path = (pts: { x: number; y: number }[]) =>
  "M" + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L");

/** Divide el leg proyectado en tramo recorrido / restante según la fracción. */
function splitPhonePath(f: number) {
  const d = f * LEG_LEN;
  const pts = LEG.map(toPhone);
  let i = 1;
  while (i < CUM.length - 1 && CUM[i] < d) i++;
  const cut = toPhone(pointAt(f));
  return {
    done: path([...pts.slice(0, i), cut]),
    left: path([cut, ...pts.slice(i)]),
    cut,
  };
}

// ─── Llegadas simuladas (además de María) ─────────────────────────────────────

const FEED: { name: string; origin: string; from: [number, number]; eta: number; color: string }[] = [
  { name: "Ana y Raúl", origin: "La Vega", from: [-70.5292, 19.2221], eta: 16, color: "#F76C4D" },
  { name: "Luis", origin: "Moca", from: [-70.5259, 19.3934], eta: 21, color: "#FF8D16" },
  { name: "Grupo de 4", origin: "Samaná", from: [-69.3363, 19.2056], eta: 42, color: "#25CCB8" },
];

// ─── Copy espejo ──────────────────────────────────────────────────────────────

type Step = { icon: IconName; title: string; desc: string };

const STEPS_VIAJERO: Step[] = [
  { icon: "explore", title: "Descubres un lugar real", desc: "Destinos y negocios verificados, fuera del circuito de siempre." },
  { icon: "route", title: "Armas tu ruta y sales", desc: "Tiempo de llegada por carretera real y aviso al negocio de que vas." },
  { icon: "restaurant", title: "Llegas y te reciben", desc: "Te esperan por tu nombre: trato de local, no de turista." },
];

const STEPS_NEGOCIO: Step[] = [
  { icon: "visibility", title: "Te descubren en la ruta", desc: "Tu perfil aparece a viajeros que ya vienen en camino cerca de ti." },
  { icon: "notifications_active", title: "Sabes quién viene", desc: "Nombre, procedencia y llegada estimada, en tiempo real." },
  { icon: "qr_code_2", title: "Recibes y fidelizas", desc: "Reconoce al viajero con su QR; su reseña trae al siguiente." },
];

// ─── Hooks utilitarios ────────────────────────────────────────────────────────

const mmQuery = "(max-width: 899px)";
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mm = window.matchMedia(mmQuery);
      mm.addEventListener("change", cb);
      return () => mm.removeEventListener("change", cb);
    },
    () => window.matchMedia(mmQuery).matches,
    () => false
  );
}

// ─── Card de pasos punteados (compartida, espejo) ─────────────────────────────

function LoopSteps({
  side,
  tone,
  steps,
  visible,
  children,
}: {
  side: string;
  tone: { line: string; chipBg: string; chipText: string; nodeBg: string; nodeBorder: string; nodeInk: string };
  steps: Step[];
  visible: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-cream px-3 pb-3 pt-[11px]">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="whitespace-nowrap font-mono text-micro font-bold uppercase tracking-[.11em] text-muted-2">
          Una ruta · dos lados
        </span>
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[.08em] ${tone.chipBg} ${tone.chipText}`}>
          {side}
        </span>
      </div>

      <ol className="relative m-0 flex list-none flex-col gap-[11px] p-0" aria-label={`Cómo funciona — ${side}`}>
        {/* Rail punteado que une los nodos, de centro a centro. */}
        <span
          aria-hidden="true"
          className="absolute bottom-[13px] left-[12.5px] top-[13px] w-px opacity-60"
          style={{ background: `repeating-linear-gradient(to bottom, ${tone.line} 0 4px, transparent 4px 8px)` }}
        />
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li
              key={s.title}
              className={`relative flex items-start gap-2.5 rounded-tile transition-colors duration-200 hover:bg-white/70 ${visible ? "animate-slide-up" : ""}`}
              style={visible ? { animationDelay: `${i * 0.07 + 0.15}s` } : undefined}
            >
              <span
                className={`z-[1] flex size-[26px] shrink-0 items-center justify-center rounded-full border leading-none ${
                  last ? `${tone.nodeBg} border-transparent` : `border-2 bg-white ${tone.nodeBorder}`
                }`}
              >
                <Icon name={s.icon} className={`text-sm ${last ? "text-white" : tone.nodeInk}`} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-micro font-bold text-muted-2">0{i + 1}</span>
                  <span className="text-xs font-bold leading-[1.25] text-ink">{s.title}</span>
                </div>
                <div className="mt-0.5 text-micro leading-[1.4] text-muted">{s.desc}</div>
              </div>
            </li>
          );
        })}
      </ol>
      {children}
    </div>
  );
}

const TONE_VIAJERO = {
  line: "#FF8D16",
  chipBg: "bg-mango-soft",
  chipText: "text-mango-ink",
  nodeBg: "bg-mango",
  nodeBorder: "border-mango-soft",
  nodeInk: "text-mango-ink",
};

const TONE_NEGOCIO = {
  line: "#25CCB8",
  chipBg: "bg-mint-soft",
  chipText: "text-mint-ink",
  nodeBg: "bg-mint",
  nodeBorder: "border-mint-soft",
  nodeInk: "text-mint-ink",
};

// ─── Pantalla 1 · app de María (navegación) ───────────────────────────────────

function TravelerScreen({ eta }: { eta: number }) {
  const arrived = eta <= 0;
  const f = fracForEta(eta);
  const { done, left, cut } = splitPhonePath(f);
  const dest = toPhone(COMEDOR);
  // Rumbo del self-pin: dirección de viaje en coordenadas de pantalla.
  const prev = toPhone(pointAt(Math.max(f - 0.03, 0)));
  const heading = (Math.atan2(cut.x - prev.x, prev.y - cut.y) * 180) / Math.PI;

  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      <svg viewBox={`0 0 ${PHONE_VB.w} ${PHONE_VB.h}`} className="absolute inset-0 size-full">
        {/* calles falsas de contexto */}
        <path d="M-10,210 C70,190 180,250 290,215" fill="none" stroke="#ffffff" strokeWidth="13" opacity="0.7" />
        <path d="M-10,360 C90,340 170,395 290,365" fill="none" stroke="#ffffff" strokeWidth="10" opacity="0.6" />
        <path d="M60,90 C90,220 40,380 110,570" fill="none" stroke="#ffffff" strokeWidth="9" opacity="0.5" />
        <path d="M215,80 C190,230 235,400 190,570" fill="none" stroke="#ffffff" strokeWidth="9" opacity="0.5" />
        {/* tramo ya recorrido */}
        <path d={done} fill="none" stroke="#9DB4AD" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        {/* tramo restante */}
        <path d={left} fill="none" stroke="#FF8D16" strokeWidth="4.5" strokeDasharray="1.5 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* banner de navegación */}
      <div className="absolute inset-x-3 top-10 flex items-center gap-2.5 rounded-card bg-white p-2.5 shadow-card">
        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-tile bg-mango-soft">
          <Icon name={arrived ? "check" : "arrow_upward"} className="text-lg text-mango-ink" />
        </div>
        <div className="min-w-0">
          <div className="text-tiny font-bold leading-tight text-ink">
            {arrived ? "Llegaste a tu destino" : `${eta} min · ${kmLeft(eta)} km`}
          </div>
          <div className="mt-px truncate font-mono text-micro text-muted">
            {arrived ? "Comedor Doña Mercedes" : "Autopista Duarte, sur"}
          </div>
        </div>
      </div>

      {/* destino: pin de gastronomía */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(dest.x / PHONE_VB.w) * 100}%`, top: `${(dest.y / PHONE_VB.h) * 100}%` }}
      >
        <CategoryPin category="gastronomia" size={30} />
      </div>

      {/* María (self-pin) sobre la ruta */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${(cut.x / PHONE_VB.w) * 100}%`, top: `${(cut.y / PHONE_VB.h) * 100}%` }}
      >
        <SelfPin heading={arrived ? 0 : heading} size={38} />
      </div>

      {/* card del negocio, estilo bottom-sheet */}
      <div className="absolute inset-x-3 bottom-3 rounded-panel bg-white p-3 shadow-card">
        <div className="flex items-center gap-[11px]">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-coral-soft">
            <Icon name="restaurant" className="text-xl text-coral-ink" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-tiny font-bold leading-tight text-ink">Comedor Doña Mercedes</div>
            <div className="mt-0.5 font-mono text-micro text-muted">★ 4,8 · Cocina criolla</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-tile bg-mint-soft px-2.5 py-[7px]">
          <Icon name="check_circle" className="shrink-0 text-sm text-mint-ink" />
          <span className="text-micro font-bold leading-tight text-mint-ink">
            {arrived ? "Doña Mercedes te espera" : "Le avisamos que vas — mesa lista"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Pantalla 2 · dashboard del comedor ──────────────────────────────────────

function DashboardScreen({ eta, feedCount, reduced }: { eta: number; feedCount: number; reduced: boolean }) {
  const arrived = eta <= 0;
  const pct = Math.round(fracForEta(eta) * 100);

  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      {/* header */}
      <div className="flex items-center gap-2 px-3 pb-2.5 pt-11">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mango">
          <Icon name="storefront" className="text-base text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-tiny font-bold leading-[1.15] text-ink">Comedor Doña Mercedes</div>
          <div className="font-mono text-micro text-muted-2">Demo · Panel ConoceRD</div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-mint-soft px-1.5 py-[3px]">
          <span className="block size-1.5 animate-live-dot rounded-full bg-mint" />
          <span className="text-micro font-bold text-mint-ink">VIVO</span>
        </div>
      </div>

      {/* llegada protagonista */}
      <div
        className={`mx-3 rounded-card p-3 transition-colors duration-500 ${arrived ? "bg-mint" : "bg-mango"} text-ink-2`}
      >
        <div className="text-micro font-bold uppercase tracking-[.1em] opacity-80">
          {arrived ? "Acaba de llegar" : "Llegando ahora"}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-display text-[21px] font-bold leading-none">María</span>
          <span className="font-mono text-sm font-bold">{arrived ? "en la puerta" : `a ${eta} min`}</span>
        </div>
        <div className="mt-1 text-micro font-semibold opacity-90">
          {arrived ? "Viajera de Santiago — dale la bienvenida" : "Viajera de Santiago · por la Autopista Duarte"}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-2/15">
          <div
            className="h-full rounded-full bg-white/90 transition-[width] duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* feed de llegadas */}
      <div className="mx-3 mt-2.5 flex-1 overflow-hidden">
        <div className="mb-1.5 text-mini font-bold text-ink">También en camino</div>
        <div className="flex flex-col gap-1.5">
          {FEED.slice(0, feedCount).map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 rounded-tile bg-white px-2.5 py-2 shadow-card"
              style={reduced ? undefined : { animation: "mapBubbleIn .35s ease both" }}
            >
              <span className="block size-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <div className="min-w-0 flex-1">
                <span className="text-micro font-bold text-ink">{p.name}</span>
                <span className="text-micro text-muted"> · {p.origin}</span>
              </div>
              <span className="shrink-0 font-mono text-micro font-bold text-muted">{p.eta} min</span>
            </div>
          ))}
        </div>
      </div>

      {/* mini stats */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
        {[
          { label: "Hoy", value: "23" },
          { label: "Semana", value: "96" },
          { label: "Reseñas", value: "★ 4,8" },
        ].map((s) => (
          <div key={s.label} className="rounded-tile bg-white px-2 py-1.5 shadow-card">
            <div className="text-micro font-semibold text-muted-2">{s.label}</div>
            <div className="font-mono text-tiny font-bold text-ink">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Variante ─────────────────────────────────────────────────────────────────

const PANEL_POS =
  "crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 box-border w-[clamp(248px,25vw,314px)] -translate-y-1/2 rounded-panel p-[18px] shadow-modal max-h-[calc(100dvh-128px)] overflow-y-auto";

const PHONE_POS = "crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2";

export default function VNVariant2() {
  const { activeScene } = useScene();
  const isVia = activeScene === "viajeros";
  const isNeg = activeScene === "negocios";
  const isMobile = useIsMobile();
  const reduced = useReducedMotion() ?? false;

  // Simulación "en tiempo real": el feed entra escalonado y la ETA de María
  // baja por ticks (como pings de GPS) hasta que llega. Corre una sola vez,
  // arranca cuando Negocios entra en cámara, y muere sola: nada queda animando
  // en reposo.
  const [feedState, setFeedCount] = useState(0);
  const [eta, setEta] = useState(ETA_START);
  const ranRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  // Con reduced motion no hay timeline: el estado final se deriva directo.
  const feedCount = reduced ? FEED.length : feedState;

  useEffect(() => {
    if (!isNeg || ranRef.current || reduced) return;
    ranRef.current = true;
    const t = timersRef.current;
    FEED.forEach((_, i) => t.push(window.setTimeout(() => setFeedCount(i + 1), 550 + i * 650)));
    for (let k = 1; k <= 4; k++) {
      t.push(window.setTimeout(() => setEta(ETA_START - k * 3), 5000 + (k - 1) * 4200));
    }
  }, [isNeg, reduced]);

  useEffect(() => {
    const t = timersRef.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const arrived = eta <= 0;
  const maria = pointAt(fracForEta(eta));
  const etaLabel = arrived ? "llegó" : `a ${eta} min`;

  return (
    <>
      {/* ══ Capa de mapa · Viajeros: la ruta de María como adelanto ══ */}
      {isVia && !isMobile && (
        <>
          <MapRoute id="vn2-via-ruta" coordinates={LEG} color="#FF8D16" width={2.6} opacity={0.9} dashArray={[0.2, 1.6]} />
          <MapMarker longitude={COMEDOR[0]} latitude={COMEDOR[1]} anchor="center">
            <MarkerContent>
              <CategoryPin category="gastronomia" size={26} />
              <MarkerLabel position="right">Comedor Doña Mercedes</MarkerLabel>
            </MarkerContent>
          </MapMarker>
          <MapMarker longitude={maria[0]} latitude={maria[1]} anchor="center">
            <MarkerContent>
              <div className="size-3 rounded-full border-2 border-white bg-coral shadow-card" />
            </MarkerContent>
          </MapMarker>
        </>
      )}

      {/* ══ Capa de mapa · Negocios: llegadas en tiempo real ══ */}
      {isNeg && (
        <>
          <MapRoute id="vn2-neg-ruta" coordinates={LEG} color="#F76C4D" width={3} opacity={0.85} dashArray={[0.2, 1.8]} />
          {FEED.slice(0, feedCount).map((p, i) => (
            <MapArc
              key={p.name}
              id={`vn2-arc-${i}`}
              from={p.from}
              to={COMEDOR}
              color={p.color}
              width={2.4}
              bend={0.2}
              animated
            />
          ))}

          {/* orígenes de los arcos */}
          {FEED.slice(0, feedCount).map((p) => (
            <MapMarker key={`dot-${p.name}`} longitude={p.from[0]} latitude={p.from[1]} anchor="center">
              <MarkerContent>
                <div className="size-2.5 rounded-full border-2 border-white shadow-card" style={{ background: p.color }} />
              </MarkerContent>
            </MapMarker>
          ))}

          {/* María avanzando por la carretera real */}
          {!arrived && (
            <MapMarker longitude={maria[0]} latitude={maria[1]} anchor="center">
              <MarkerContent>
                <div className="size-3.5 rounded-full border-2 border-white bg-coral shadow-card" />
                <MarkerLabel position="right">María · {eta} min</MarkerLabel>
              </MarkerContent>
            </MapMarker>
          )}

          {/* el comedor */}
          <MapMarker longitude={COMEDOR[0]} latitude={COMEDOR[1]} anchor="bottom">
            <MarkerContent>
              <div className="flex flex-col items-center gap-1">
                <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] text-micro font-bold text-white shadow-card">
                  Comedor Doña Mercedes
                </div>
                <div className="relative">
                  {/* pulso al registrar cada llegada nueva (y la de María) */}
                  {!reduced && (feedCount > 0 || arrived) && (
                    <motion.span
                      key={`pulse-${feedCount}-${arrived}`}
                      className="absolute inset-0 rounded-full bg-mango"
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
        </>
      )}

      {/* ══ Overlay · VIAJEROS — la mitad de María ══ */}
      <div
        aria-hidden={!isVia}
        inert={!isVia}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVia ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className={`${PANEL_POS} ${PANEL_SOLID} ${isVia ? "animate-slide-up" : ""}`}>
          <Kicker icon="hiking" index="03" className="mb-2.5">Viajeros</Kicker>
          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Tú descubres, <em className="crd-accent">ellos te esperan</em>
          </h2>
          <p className="mb-3 mt-2 text-xs leading-[1.45] text-muted">
            María va manejando a un comedor de Jarabacoa. Su ruta ya avisó que
            llega en {arrived ? "nada" : `${eta} minutos`}.
          </p>

          {/* móvil: resumen del teléfono, que aquí no cabe */}
          <div className="mb-3 hidden max-desk:flex items-center gap-2.5 rounded-card border border-line bg-cream px-3 py-2.5">
            <div className="flex size-[34px] shrink-0 items-center justify-center rounded-tile bg-mango-soft">
              <Icon name="route" className="text-lg text-mango-ink" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-ink">Comedor Doña Mercedes</div>
              <div className="font-mono text-micro text-muted">
                {arrived ? "María llegó · la esperaban" : `${eta} min · ${kmLeft(eta)} km · te esperan`}
              </div>
            </div>
          </div>

          <LoopSteps side="Lado viajero" tone={TONE_VIAJERO} steps={STEPS_VIAJERO} visible={isVia}>
            <p className="mb-0 mt-3 font-hand text-[15px] leading-[1.3] text-coral-ink">
              Cada ruta que armas apoya un negocio local de verdad.
            </p>
          </LoopSteps>

          <button
            onClick={() => scrollToSection("trigger-negocios")}
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-chip border-none bg-transparent p-1 text-xs font-bold text-ink underline decoration-mango decoration-2 underline-offset-4 transition-colors hover:text-mango-ink focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-ink-2"
          >
            Mira el otro lado de esta ruta
            <Icon name="arrow_downward" className="text-sm" />
          </button>
        </div>

        {/* teléfono de María */}
        <div className={`${PHONE_POS} transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${isVia ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
          <div className="relative">
            <div className="absolute -top-9 left-1/2 z-[2] w-max -translate-x-1/2 -rotate-2 rounded-full border border-line bg-white/92 px-3 py-1 font-hand text-[15px] font-bold text-ink shadow-card backdrop-blur-[6px]">
              lo que ve María
            </div>
            <PhoneMockup screen={<TravelerScreen eta={eta} />} />
          </div>
        </div>
      </div>

      {/* ══ Overlay · NEGOCIOS — la otra mitad del mismo viaje ══ */}
      <div
        aria-hidden={!isNeg}
        inert={!isNeg}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isNeg ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className={`${PANEL_POS} ${PANEL_SOLID} ${isNeg ? "animate-slide-up" : ""}`}>
          <Kicker icon="storefront" index="04" className="mb-2.5">Negocios</Kicker>
          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Ellos te descubren, <em className="crd-accent">tú los recibes</em>
          </h2>
          <p className="mb-3 mt-2 text-xs leading-[1.45] text-muted">
            El mismo viaje visto desde el mostrador: sabes quién viene antes de
            que cruce la puerta.
          </p>

          {/* móvil: la llegada protagonista, porque el dashboard no cabe */}
          <div className="mb-3 hidden max-desk:flex items-center gap-2.5 rounded-card border border-line bg-cream px-3 py-2.5">
            <span className="block size-2 shrink-0 animate-live-dot rounded-full bg-mint" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-ink">María · viajera de Santiago</div>
              <div className="font-mono text-micro text-muted">
                {etaLabel}
                {feedCount > 0 ? ` · +${feedCount} en camino` : ""}
              </div>
            </div>
          </div>

          <LoopSteps side="Lado negocio" tone={TONE_NEGOCIO} steps={STEPS_NEGOCIO} visible={isNeg} />

          <button
            onClick={() => requestSubscribe("negocio")}
            className="crd-sticker mt-3.5 inline-flex cursor-pointer items-center gap-2 rounded-card border-none bg-mint px-[18px] py-[11px] text-copy font-bold text-ink-2 transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-mint-ink hover:text-white focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-ink-2"
          >
            <Icon name="add_business" className="text-lg" />
            Registrar mi negocio
          </button>
        </div>

        {/* el mismo teléfono, volteado al dashboard */}
        <div className={`${PHONE_POS} transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${isNeg ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
          <div className="relative">
            <div className="absolute -top-9 left-1/2 z-[2] w-max -translate-x-1/2 rotate-2 rounded-full border border-line bg-white/92 px-3 py-1 font-hand text-[15px] font-bold text-ink shadow-card backdrop-blur-[6px]">
              lo que ve el comedor
            </div>
            <PhoneMockup screen={<DashboardScreen eta={eta} feedCount={feedCount} reduced={reduced} />} />
          </div>
        </div>
      </div>
    </>
  );
}
