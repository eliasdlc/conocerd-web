"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante FINAL de Viajeros + Negocios — v3 como base, con lo pedido:
//
//  · Fuera: "PARADA N/3", la píldora sobre el teléfono, los numeritos de cada
//    parada, la línea de los 500 fundadores y "gratis durante el lanzamiento".
//    La información no se repite: el rail cuenta, el teléfono enseña.
//  · Viajeros: en el centro ya no hay una mini-ruta ilegible — la ruta real
//    del país (featured-route.json, 1,148 km por carretera) se dibuja con el
//    estilo de siempre y un avatar navega sobre ella como un GPS: avanza,
//    llega a cada parada, pausa, sigue… en loop infinito (como el live demo
//    de la v4). El tramo recorrido queda "apagado" detrás, como en un
//    navegador de verdad.
//  · Negocios: se acabaron los arcos curvos. Los clientes viajan por las
//    carreteras reales (pairs.json) hacia UN negocio — la historia es "tu
//    negocio recibe gente" — y el panel del teléfono suma cada llegada en
//    sincronía.
//  · La insignia de fundador se reemplaza por la estampa ConoceRD (stamp.tsx),
//    pegada en la esquina de cada card.
//  · Móvil: el teléfono mockup no aporta en un teléfono real — el mapa ES la
//    demo. El bottom-sheet lleva un chip EN VIVO que espeja lo que pasa arriba
//    (rumbo y km restantes en Viajeros; llegadas en Negocios).
//
//  Todo el movimiento nace de la escena activa (trigger), nunca en reposo:
//  el reloj corre solo mientras la escena está en cámara y con
//  prefers-reduced-motion se muestra el estado final estático.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import Button from "@/components/Button";
import PhoneMockup from "@/sections/PhoneMockup";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/Map";
import { CategoryPin, GoalFlag, SelfPin, PIN_CHROME } from "@/components/map/pins";
import { PANEL_SOLID } from "@/lib/surfaces";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { DESTINATIONS, type Destination } from "@/data/destinations";
import type { LngLat } from "@/lib/geo";
import StampCRD from "@/variants/stamp";
import pairs from "@/data/routes/pairs.json";
import featured from "@/data/routes/featured-route.json";

// ─── Utilidades geográficas ──────────────────────────────────────────────────

const dest = (id: string): Destination => DESTINATIONS.find((d) => d.id === id) as Destination;

/** Km aproximados entre dos puntos (equirectangular; sobra para animar). */
function kmApprox(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * rad) * 111.32;
  const dy = (b[1] - a[1]) * 110.57;
  return Math.hypot(dx, dy);
}

/** Rumbo (deg, 0 = norte) del punto a al b — para orientar el SelfPin. */
function bearing(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dx = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * rad);
  const dy = b[1] - a[1];
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

/** Rumbos por punto, DESENROLLADOS a un dominio continuo: cada rumbo se ajusta
 *  al de su vecino por el camino corto, así la transición CSS del avatar nunca
 *  da la vuelta larga (359°→1° gira 2°, no 358°). Mirar 3 puntos adelante
 *  suaviza el zigzag de la polilínea simplificada. */
function headingsDe(pts: [number, number][]): number[] {
  const out: number[] = [];
  let prev = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = Math.min(i + 3, pts.length - 1);
    const raw = j === i ? prev : bearing(pts[i], pts[j]);
    if (i === 0) prev = raw;
    else prev = prev + (((raw - prev + 540) % 360) - 180);
    out.push(prev);
  }
  return out;
}

const idxDe = (id: string) => pairs.ids.indexOf(id);

/** Tramo por carretera A→B de pairs.json (invierte la clave si hace falta). */
function tramo(a: string, b: string): [number, number][] {
  const ia = idxDe(a);
  const ib = idxDe(b);
  const key = ia < ib ? `${a}|${b}` : `${b}|${a}`;
  const leg = (pairs.legs as Record<string, number[][]>)[key] ?? [];
  const pts = leg.map((c) => [c[0], c[1]] as [number, number]);
  return ia < ib ? pts : [...pts].reverse();
}

/** Polilínea con acumulado de km por punto (para animar a velocidad real). */
function conCumulado(pts: [number, number][]) {
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + kmApprox(pts[i - 1], pts[i]));
  return { pts, cum, total: cum[cum.length - 1] };
}

/** Punto (+índice) a `km` del inicio de una polilínea con acumulado. */
function puntoEnKm(
  line: { pts: [number, number][]; cum: number[] },
  km: number
): { pos: [number, number]; idx: number } {
  const { pts, cum } = line;
  if (km <= 0) return { pos: pts[0], idx: 0 };
  if (km >= cum[cum.length - 1]) return { pos: pts[pts.length - 1], idx: pts.length - 1 };
  let lo = 0;
  let hi = cum.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= km) lo = mid;
    else hi = mid;
  }
  const f = (km - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
  const a = pts[lo];
  const b = pts[lo + 1];
  return { pos: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], idx: lo };
}

// ─── Reloj de demo (corre solo con la escena en cámara) ──────────────────────

function useDemoTime(active: boolean, disabled: boolean): number {
  const running = active && !disabled;
  const [clock, setClock] = useState({ running, t: 0 });
  // Reinicio al entrar/salir de la escena: ajuste durante render (patrón
  // "derive from previous render"), no un setState dentro de un efecto.
  if (clock.running !== running) setClock({ running, t: 0 });
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    let last = -100;
    const tick = (now: number) => {
      const e = now - start;
      if (e - last >= 33) {
        last = e;
        setClock((c) => (c.running ? { running: true, t: e } : c));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return clock.running === running ? clock.t : 0;
}

// ─── Pasos (rail de la card, sin numeritos) ──────────────────────────────────

type Paso = {
  titulo: string;
  desc: string;
  icon?: IconName;
  color?: string;
  meta?: boolean; // true = bandera de meta
};

const PASOS_VIAJERO: Paso[] = [
  { icon: "explore", color: "#F76C4D", titulo: "Descubre lugares reales", desc: "Destinos poco conocidos, recomendados por gente que ya fue. No el mismo top 10 de siempre." },
  { icon: "route", color: "#FF8D16", titulo: "Arma tu ruta", desc: "Paradas, distancias y tiempos por carreteras reales. El plan completo, en tu bolsillo." },
  { meta: true, titulo: "Vive y guarda el recuerdo", desc: "Fotos, sellos por destino y tu diario de viaje para presumir después." },
];

const PASOS_NEGOCIO: Paso[] = [
  { icon: "add_business", color: "#25CCB8", titulo: "Regístrate gratis", desc: "Perfil con fotos, horario y contacto directo por WhatsApp. Listo en minutos." },
  { icon: "location_on", color: "#FF8D16", titulo: "Te encuentran en la ruta", desc: "Apareces en el mapa justo cuando el viajero planifica su parada cerca de ti." },
  { meta: true, titulo: "Ves llegar clientes", desc: "Panel en vivo: cuántos vienen, de dónde salen y qué andan buscando." },
];

// Línea punteada de la ruta — la firma de la card (v3), compartida por ambas.
const PUNTEADA = {
  backgroundImage: "repeating-linear-gradient(to bottom, #25CCB8 0 4px, transparent 4px 9px)",
};

/** `&v6paso=1..3` en la URL fija la parada activa inicial (demo/capturas). */
function pasoInicial(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(new URLSearchParams(window.location.search).get("v6paso"));
    return v >= 1 && v <= 3 ? v - 1 : 0;
  } catch {
    return 0;
  }
}

// ─── Piezas compartidas de la card ───────────────────────────────────────────

function PinDeParada({ paso, activo }: { paso: Paso; activo: boolean }) {
  return (
    <span className="relative block size-9 shrink-0">
      {paso.meta ? (
        <span className={`absolute -left-0.5 -top-1 transition-transform duration-200 ${activo ? "scale-110" : ""}`}>
          <GoalFlag size={44} />
        </span>
      ) : (
        <span
          className={`flex size-9 items-center justify-center rounded-full ${PIN_CHROME} transition-transform duration-200 ${activo ? "scale-110" : ""}`}
          style={{ background: paso.color }}
        >
          <Icon name={paso.icon as IconName} className="text-lg text-white" />
        </span>
      )}
    </span>
  );
}

function RailDePasos({
  pasos,
  activo,
  onActivo,
  visible,
  label,
}: {
  pasos: Paso[];
  activo: number;
  onActivo: (i: number) => void;
  visible: boolean;
  label: string;
}) {
  return (
    <ol aria-label={label} className="relative m-0 flex list-none flex-col gap-1 p-0">
      {/* la línea punteada que une las paradas — el alma de la card */}
      <span
        aria-hidden="true"
        className="absolute bottom-[30px] left-[25.5px] top-[30px] w-px opacity-70"
        style={PUNTEADA}
      />
      {pasos.map((p, i) => (
        <li
          key={p.titulo}
          className={visible ? "animate-slide-up" : ""}
          style={visible ? { animationDelay: `${i * 0.07 + 0.12}s` } : undefined}
        >
          <button
            type="button"
            onClick={() => onActivo(i)}
            onMouseEnter={() => onActivo(i)}
            onFocus={() => onActivo(i)}
            aria-current={activo === i ? "step" : undefined}
            className={`relative flex w-full min-h-[44px] cursor-pointer items-start gap-3 rounded-card border p-2 pr-2.5 text-left transition-colors duration-200 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2 ${
              activo === i
                ? "border-line bg-cream"
                : "border-transparent bg-transparent hover:bg-cream/60"
            }`}
          >
            <PinDeParada paso={p} activo={activo === i} />
            <span className="min-w-0 flex-1">
              <span className={`block text-copy font-bold leading-[1.25] ${activo === i ? "text-ink-2" : "text-ink"}`}>
                {p.titulo}
              </span>
              <span className="mt-0.5 block text-xs leading-[1.4] text-muted">{p.desc}</span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Pila de pantallas con crossfade — solo la activa es visible. */
function PilaDePantallas({ pantallas, activo }: { pantallas: React.ReactNode[]; activo: number }) {
  return (
    <div className="relative size-full overflow-hidden">
      {pantallas.map((p, i) => (
        <div
          key={i}
          aria-hidden={i !== activo}
          className={`absolute inset-0 transition-opacity duration-300 ease-out ${
            i === activo ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {p}
        </div>
      ))}
    </div>
  );
}

/** Chip EN VIVO del bottom-sheet móvil: espeja lo que pasa en el mapa. */
function ChipEnVivo({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 hidden items-center gap-2 rounded-card border border-line bg-cream px-3 py-2 max-desk:flex">
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-mint-soft px-2 py-[3px]">
        <span className="block size-[6px] animate-live-dot rounded-full bg-mint" />
        <span className="text-micro font-bold text-mint-ink">EN VIVO</span>
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-micro font-bold text-ink">{children}</span>
    </div>
  );
}

/** Teléfono de la derecha (solo desktop), sin píldora encima. */
function Telefono({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <PhoneMockup screen={children} />
    </div>
  );
}

// ─── Pantallas de la app — Viajeros ──────────────────────────────────────────

function ChipCategoria({ label, activo }: { label: string; activo?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-micro font-bold ${
        activo ? "bg-ink-2 text-white" : "border border-line bg-white text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function PantallaExplorar() {
  const lugares = [
    { d: dest("charcos"), chip: "Sin multitudes", chipCls: "bg-mint-soft text-mint-ink" },
    { d: dest("limon"), chip: "Guía local", chipCls: "bg-coral-soft text-coral-ink" },
    { d: dest("haitises"), chip: "En bote", chipCls: "bg-mango-soft text-mango-ink" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F6F1E7]">
      <div className="px-3 pt-10">
        <div className="flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-card">
          <Icon name="search" className="text-base text-muted" />
          <span className="text-tiny text-muted">¿A dónde vamos?</span>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-hidden px-3 pt-2.5">
        <ChipCategoria label="Cerca de ti" activo />
        <ChipCategoria label="Playas" />
        <ChipCategoria label="Aventura" />
      </div>
      <div className="px-3 pb-1.5 pt-3 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
        Poco visitados
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3">
        {lugares.map(({ d, chip, chipCls }) => (
          <div key={d.id} className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-card">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cream-2">
              <Image src={d.image} alt="" fill sizes="48px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-tiny font-bold text-ink">{d.name}</div>
              <div className="font-mono text-micro text-muted">
                {d.province} · ★ {d.rating}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-micro font-bold ${chipCls}`}>{chip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RUTA_A = dest("jarabacoa");
const RUTA_B = dest("constanza");
const RUTA_C = dest("duarte");
const kmEntre = (a: string, b: string) => Math.round(pairs.km[idxDe(a)][idxDe(b)]);
const minEntre = (a: string, b: string) => pairs.min[idxDe(a)][idxDe(b)];
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);

function PantallaRuta() {
  const [a, b, c] = [RUTA_A, RUTA_B, RUTA_C];
  const total = kmEntre(a.id, b.id) + kmEntre(b.id, c.id);
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      {/* cartografía falsa + trazo de la ruta */}
      <svg viewBox="0 0 236 490" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M-10,150 C70,120 150,220 250,180" fill="none" stroke="#fff" strokeWidth="13" opacity="0.7" />
        <path d="M60,-10 C90,120 30,300 130,500" fill="none" stroke="#fff" strokeWidth="11" opacity="0.6" />
        <path d="M55,235 C95,215 120,170 105,120 C97,92 130,75 160,70" fill="none" stroke="#FF8D16" strokeWidth="3.5" strokeDasharray="1.5 6" strokeLinecap="round" />
      </svg>
      <div className="absolute left-[43px] top-[222px]"><SelfPin heading={24} size={30} /></div>
      <div className="absolute left-[96px] top-[110px]">
        <span className="block"><CategoryPin category={RUTA_B.category} size={20} /></span>
      </div>
      <div className="absolute left-[150px] top-[42px]"><GoalFlag size={26} /></div>

      <div className="absolute inset-x-2 bottom-2 rounded-panel bg-white p-2.5 shadow-card">
        {[
          { d: a, dato: "salida" },
          { d: b, dato: `${kmEntre(a.id, b.id)} km · ${fmtMin(minEntre(a.id, b.id))}` },
          { d: c, dato: `${kmEntre(b.id, c.id)} km · ${fmtMin(minEntre(b.id, c.id))}`, meta: true },
        ].map((fila) => (
          <div key={fila.d.id} className="flex items-center gap-2 py-[3px]">
            <span className="flex w-5 justify-center">
              {fila.meta ? (
                <GoalFlag size={18} />
              ) : (
                <CategoryPin category={fila.d.category} size={16} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-tiny font-bold text-ink">{fila.d.name}</span>
            <span className="shrink-0 font-mono text-micro text-muted">{fila.dato}</span>
          </div>
        ))}
        <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-line pt-1.5">
          <span className="font-mono text-micro font-bold text-ink">{total} km · 2 días</span>
          <span className="rounded-full bg-mango px-3 py-1 text-micro font-bold text-white">Empezar</span>
        </div>
      </div>
    </div>
  );
}

function PantallaDiario() {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="flex items-center justify-between px-3 pt-10">
        <span className="text-sm font-bold text-ink">Mi diario</span>
        <Icon name="auto_stories" className="text-lg text-mango-ink" />
      </div>
      {/* polaroid con sello de visitado */}
      <div className="mx-4 mt-2 -rotate-2 rounded-md bg-white p-1.5 pb-1 shadow-card">
        <div className="relative h-[104px] overflow-hidden rounded-sm bg-cream-2">
          <Image src={dest("duarte").image} alt="" fill sizes="200px" className="object-cover" />
          <span className="absolute right-1.5 top-1.5 -rotate-6 rounded border-2 border-[#43A047] bg-white/80 px-1 py-px font-mono text-[8px] font-bold tracking-[.1em] text-[#2E7D32]">
            VISITADO
          </span>
        </div>
        <div className="flex items-baseline justify-between px-0.5 pt-1">
          <span className="font-hand text-sm text-ink">¡3,087 metros!</span>
          <span className="font-mono text-[8px] text-muted-2">Pico Duarte</span>
        </div>
      </div>
      {/* sellos ganados */}
      <div className="px-3 pt-2.5 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
        Tus sellos
      </div>
      <div className="flex items-center gap-1.5 px-3 pt-1">
        {(["hiking", "forest", "beach_access"] as IconName[]).map((n, i) => (
          <span
            key={n}
            className="flex size-7 items-center justify-center rounded-full border border-line bg-white"
            style={{ color: ["#985409", "#2E7D32", "#0C6A60"][i] }}
          >
            <Icon name={n} className="text-sm" />
          </span>
        ))}
        <span className="font-mono text-micro text-muted">+9</span>
      </div>
      {/* la estampa ConoceRD cierra el diario (antes: insignia de fundador) */}
      <div className="mx-3 mb-2 mt-auto flex items-center justify-between gap-2 rounded-card bg-white p-2 shadow-card">
        <div className="min-w-0 pl-1">
          <div className="text-tiny font-bold leading-tight text-ink">Diario estampado</div>
          <div className="text-micro leading-[1.35] text-muted">Cada viaje deja su sello.</div>
        </div>
        <StampCRD size={62} rotate={9} line1="MI DIARIO" line2="· DE VIAJE ·" />
      </div>
    </div>
  );
}

// ─── Sección VIAJEROS: GPS por el país en loop ───────────────────────────────

// La ruta destacada del finale de Destinos: 6 paradas reales de punta a punta
// del país. Se concatena en una sola polilínea con acumulado de km y con el
// índice de cada parada, para animar a velocidad constante por carretera.
const F_IDS = featured.stops as string[];
const F_STOPS = F_IDS.map(dest);
const F_ROUTE = (() => {
  const legs = featured.legs as unknown as [number, number][][];
  const pts: [number, number][] = [];
  const stopIdx: number[] = [0];
  legs.forEach((leg, i) => {
    pts.push(...(i === 0 ? leg : leg.slice(1)));
    stopIdx.push(pts.length - 1);
  });
  return { ...conCumulado(pts), stopIdx, headings: headingsDe(pts) };
})();

// Guion del loop: manejar tramo → pausa en la parada → … → reset y de nuevo.
const GPS_SPEED = 26; // km/s de demo (~44 s el país completo)
const GPS_DWELL = 1700; // ms de pausa en cada parada
const GPS_RESET = 1800; // ms de respiro al cerrar el loop

type GpsSeg =
  | { kind: "drive"; t0: number; t1: number; km0: number; km1: number; hacia: number }
  | { kind: "dwell"; t0: number; t1: number; stop: number };

const GPS_SEGS: GpsSeg[] = (() => {
  const segs: GpsSeg[] = [];
  let t = 600; // respiro inicial: la escena entra y el avatar arranca
  segs.push({ kind: "dwell", t0: 0, t1: t, stop: 0 });
  for (let s = 0; s < F_ROUTE.stopIdx.length - 1; s++) {
    const km0 = F_ROUTE.cum[F_ROUTE.stopIdx[s]];
    const km1 = F_ROUTE.cum[F_ROUTE.stopIdx[s + 1]];
    const dur = ((km1 - km0) / GPS_SPEED) * 1000;
    segs.push({ kind: "drive", t0: t, t1: t + dur, km0, km1, hacia: s + 1 });
    t += dur;
    segs.push({ kind: "dwell", t0: t, t1: t + GPS_DWELL, stop: s + 1 });
    t += GPS_DWELL;
  }
  return segs;
})();

const GPS_LOOP = GPS_SEGS[GPS_SEGS.length - 1].t1 + GPS_RESET;

type GpsFrame = {
  pos: [number, number];
  km: number;
  idx: number; // índice del último punto recorrido
  enParada: number | null; // parada donde está pausado
  hacia: number; // próxima parada
};

function gpsFrameAt(t: number): GpsFrame {
  const tt = t % GPS_LOOP;
  for (const seg of GPS_SEGS) {
    if (tt > seg.t1) continue;
    if (seg.kind === "dwell") {
      const i = F_ROUTE.stopIdx[seg.stop];
      return {
        pos: F_ROUTE.pts[i],
        km: F_ROUTE.cum[i],
        idx: i,
        enParada: seg.stop,
        hacia: Math.min(seg.stop + 1, F_STOPS.length - 1),
      };
    }
    const f = (tt - seg.t0) / (seg.t1 - seg.t0);
    const km = seg.km0 + (seg.km1 - seg.km0) * f;
    const { pos, idx } = puntoEnKm(F_ROUTE, km);
    return { pos, km, idx, enParada: null, hacia: seg.hacia };
  }
  // Respiro final del loop: quieto en la meta.
  const last = F_ROUTE.pts.length - 1;
  return {
    pos: F_ROUTE.pts[last],
    km: F_ROUTE.total,
    idx: last,
    enParada: F_STOPS.length - 1,
    hacia: F_STOPS.length - 1,
  };
}

function ViajerosFinal() {
  const { activeScene } = useScene();
  const visible = activeScene === "viajeros";
  const reduced = !!useReducedMotion();
  const [paso, setPaso] = useState(pasoInicial);

  const t = useDemoTime(visible, reduced);
  // Reduced motion: fotograma fijo a mitad del segundo tramo (ruta visible,
  // avatar en carretera) — sin reloj.
  const frame = reduced ? gpsFrameAt(GPS_SEGS[3].t0 + (GPS_SEGS[3].t1 - GPS_SEGS[3].t0) * 0.55) : gpsFrameAt(t);

  // Rumbo continuo precalculado por punto; la transición CSS del wrapper lo
  // suaviza entre frames (ver el marker del avatar más abajo).
  const heading = F_ROUTE.headings[frame.idx];

  // El tramo recorrido se "apaga" detrás del avatar, como en un GPS real.
  // Cuantizado cada 6 puntos para no rehacer la línea en cada frame.
  const bucket = Math.floor(frame.idx / 6);
  const traveled = useMemo(() => {
    const upto = Math.min(bucket * 6 + 1, F_ROUTE.pts.length);
    return upto >= 2 ? F_ROUTE.pts.slice(0, upto) : null;
  }, [bucket]);

  const pantallas = [<PantallaExplorar key="e" />, <PantallaRuta key="r" />, <PantallaDiario key="d" />];

  const proxima = F_STOPS[frame.hacia];
  const kmRestantes = Math.max(0, Math.round(F_ROUTE.cum[F_ROUTE.stopIdx[frame.hacia]] - frame.km));

  return (
    <>
      {/* La ruta del país, con el estilo de siempre: casing blanco + mango. */}
      {visible && (
        <>
          <MapRoute id="vn6-ruta-casing" coordinates={F_ROUTE.pts} color="#FFFFFF" width={6.5} opacity={0.9} />
          <MapRoute id="vn6-ruta" coordinates={F_ROUTE.pts} color="#FF8D16" width={3.2} opacity={0.95} />
          {traveled && (
            <MapRoute id="vn6-ruta-recorrida" coordinates={traveled} color="#264653" width={3.2} opacity={0.32} />
          )}
        </>
      )}

      {/* Paradas: pin de la app; visitada = done; la meta lleva bandera. */}
      {visible &&
        F_STOPS.map((d, i) => {
          const esMeta = i === F_STOPS.length - 1;
          const visitada = F_ROUTE.stopIdx[i] <= frame.idx;
          const llegando = frame.enParada === i;
          return (
            <MapMarker key={d.id} longitude={d.coords[0]} latitude={d.coords[1]} anchor={esMeta ? "bottom" : "center"}>
              <MarkerContent>
                <div className="relative">
                  {llegando && !reduced && (
                    <span key={`ping-${i}-${Math.floor(t / GPS_LOOP)}`} className="vn6-ping absolute inset-[-6px] rounded-full border-2 border-mango" />
                  )}
                  {esMeta ? (
                    <GoalFlag size={40} />
                  ) : (
                    <CategoryPin category={d.category} state={visitada ? "done" : "default"} size={28} />
                  )}
                  {llegando && <MarkerLabel position={esMeta ? "right" : "top"}>{d.name}</MarkerLabel>}
                </div>
              </MarkerContent>
            </MapMarker>
          );
        })}

      {/* El avatar navegando (SelfPin estilo Waze, rumbo real del tramo). */}
      {visible && (
        <MapMarker longitude={frame.pos[0]} latitude={frame.pos[1]}>
          <MarkerContent>
            <div
              className="transition-transform duration-200 ease-linear motion-reduce:transition-none"
              style={{ transform: `rotate(${heading}deg)` }}
            >
              <SelfPin heading={0} size={34} />
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      <div
        aria-hidden={!visible}
        inert={!visible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* La gran card de viaje (v3), sin contador ni línea de fundadores.
            El centrado vertical va con prefijo min-[900px]: el reset móvil de
            .crd-ol-panel anula `transform`, pero Tailwind v4 traduce
            -translate-y-1/2 a la propiedad `translate`, que sobreviviría y
            dejaría el sheet flotando a media pantalla. */}
        <div
          className={`crd-ol-panel absolute left-[clamp(16px,3%,40px)] box-border w-[clamp(280px,30vw,400px)] rounded-panel min-[900px]:top-1/2 min-[900px]:-translate-y-1/2 ${PANEL_SOLID} p-[18px] shadow-modal ${
            visible ? "animate-slide-up" : ""
          }`}
        >
          {/* La estampa ConoceRD, pegada en la esquina (solo desktop: en el
              sheet móvil el overflow la recortaría). */}
          <div aria-hidden="true" className="absolute -right-6 -top-7 max-[899px]:hidden">
            <StampCRD size={92} rotate={10} line1="EST. 2026" line2="· LO NUESTRO ·" />
          </div>

          <div className="mb-2.5">
            <Kicker icon="hiking" index="03">Viajeros</Kicker>
          </div>
          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Tu próximo viaje, <em className="crd-accent">en tres paradas</em>
          </h2>
          <p className="mb-3 mt-1.5 text-xs leading-[1.45] text-muted">
            Así funciona ConoceRD de principio a fin. Cada parada enseña la app de verdad.
          </p>

          {/* Móvil: el mapa de arriba ES la demo; este chip la espeja. */}
          <ChipEnVivo>
            {frame.enParada !== null
              ? `Llegó a ${F_STOPS[frame.enParada].name}`
              : `Rumbo a ${proxima.name} · ${kmRestantes} km`}
          </ChipEnVivo>

          <RailDePasos
            pasos={PASOS_VIAJERO}
            activo={paso}
            onActivo={setPaso}
            visible={visible}
            label="Cómo funciona ConoceRD para viajeros, en 3 pasos"
          />

          <div className="mt-3 border-t border-dashed border-line pt-3">
            <Button variant="primary" icon="notifications_active" onClick={() => requestSubscribe("viajero")}>
              Unirme a la lista
            </Button>
          </div>
        </div>

        <Telefono visible={visible}>
          <PilaDePantallas pantallas={pantallas} activo={paso} />
        </Telefono>
      </div>
    </>
  );
}

// ─── Pantallas de la app — Negocios ──────────────────────────────────────────

function PantallaRegistro() {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="px-3 pt-10">
        <div className="text-sm font-bold text-ink">Crea tu perfil</div>
        <div className="font-mono text-micro text-muted-2">Gratis · listo en minutos</div>
      </div>
      <div className="flex flex-col gap-1.5 px-3 pt-2.5">
        <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
          <div className="text-micro text-muted-2">Nombre del negocio</div>
          <div className="text-tiny font-bold text-ink">Rancho La Cumbre</div>
        </div>
        <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
          <div className="text-micro text-muted-2">Categoría</div>
          <div className="mt-1 flex gap-1">
            <span className="rounded-full bg-coral-soft px-2 py-0.5 text-micro font-bold text-coral-ink">Comida criolla</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-micro text-muted">Hospedaje</span>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
          <div className="text-micro text-muted-2">Fotos</div>
          <div className="mt-1 flex gap-1.5">
            {["/assets/ph-sunset.png", "/assets/ph-pueblo.png"].map((src) => (
              <div key={src} className="relative size-11 overflow-hidden rounded-md bg-cream-2">
                <Image src={src} alt="" fill sizes="44px" className="object-cover" />
              </div>
            ))}
            <span className="flex size-11 items-center justify-center rounded-md border border-dashed border-muted-2 text-muted">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div className="mx-3 mb-3 mt-auto flex h-10 items-center justify-center rounded-full bg-mango text-tiny font-bold text-white shadow-card">
        Publicar mi perfil
      </div>
    </div>
  );
}

function PantallaEnElMapa() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      <svg viewBox="0 0 236 490" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M-10,160 C80,130 150,240 250,190" fill="none" stroke="#fff" strokeWidth="13" opacity="0.7" />
        <path d="M50,-10 C80,140 30,320 130,500" fill="none" stroke="#fff" strokeWidth="11" opacity="0.6" />
        {/* ruta del viajero pasando junto al negocio */}
        <path d="M120,420 C105,330 150,250 128,170 C118,132 140,100 165,80" fill="none" stroke="#FF8D16" strokeWidth="3.5" strokeDasharray="1.5 6" strokeLinecap="round" />
      </svg>
      {/* el viajero, en ruta */}
      <div className="absolute left-[100px] top-[382px]">
        <SelfPin heading={12} size={38} />
      </div>
      {/* tu negocio, visible en su camino */}
      <div className="absolute left-[128px] top-[150px] flex -translate-x-1/2 flex-col items-center gap-1">
        <div className="whitespace-nowrap rounded-full bg-ink/92 px-2 py-[3px] text-micro font-bold text-white shadow-card">
          Rancho La Cumbre
        </div>
        <div className={`flex size-8 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
          <Icon name="storefront" className="text-base text-white" />
        </div>
      </div>
      <div className="absolute inset-x-2 bottom-2 rounded-panel bg-white p-2.5 shadow-card">
        <div className="flex items-center gap-2">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream-2">
            <Image src="/assets/ph-sunset.png" alt="" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-tiny font-bold text-ink">Rancho La Cumbre</div>
            <div className="font-mono text-micro text-muted">★ 4.8 · desvío de 8 min</div>
          </div>
          <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-micro font-bold text-ink-2">
            Añadir parada
          </span>
        </div>
      </div>
    </div>
  );
}

type Llegada = { key: string; nombre: string; origen: string; color: string; hace: number };

const ETIQUETA_TIEMPO = ["ahora mismo", "hace 2 min", "hace 5 min"];

function PantallaPanel({ llegadas, total }: { llegadas: Llegada[]; total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="flex items-center justify-between px-3 pt-10">
        <span className="text-sm font-bold text-ink">Tu panel</span>
        <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5">
          <span className="block size-[6px] animate-live-dot rounded-full bg-mint" />
          <span className="text-micro font-bold text-mint-ink">EN VIVO</span>
        </span>
      </div>
      <div className="mx-3 mt-2 rounded-card bg-mango px-3 py-2.5 text-ink-2">
        <div className="text-micro font-semibold opacity-90">Clientes hoy</div>
        <div className="flex items-baseline gap-1.5">
          <span key={total} className="vn6-pop inline-block font-mono text-[30px] font-bold leading-none">{total}</span>
          <span className="text-micro opacity-90">y subiendo</span>
        </div>
      </div>
      <div className="px-3 pb-1 pt-2.5 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
        Llegadas
      </div>
      <div className="flex flex-col gap-1 px-3">
        {llegadas.slice(0, 3).map((ll, i) => (
          <div
            key={ll.key}
            className={`flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 shadow-card ${i === 0 ? "vn6-in" : ""}`}
          >
            <span className="size-[7px] shrink-0 rounded-full" style={{ background: ll.color }} />
            <span className="min-w-0 flex-1 truncate text-micro text-ink">
              <b>{ll.nombre}</b> · desde {ll.origen}
            </span>
            <span className="shrink-0 font-mono text-[8px] text-muted-2">{ETIQUETA_TIEMPO[i]}</span>
          </div>
        ))}
      </div>
      <div className="mx-3 mb-3 mt-auto grid grid-cols-2 gap-1.5">
        {[
          { label: "Hoy", val: String(28 + total) },
          { label: "Semana", val: "212" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white px-2 py-1.5 shadow-card">
            <div className="text-micro text-muted-2">{s.label}</div>
            <div className="font-mono text-sm font-bold text-ink">{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sección NEGOCIOS: clientes por carreteras reales ────────────────────────

const NEGOCIO: LngLat = [-70.6901, 19.4517]; // Santiago

// Cada cliente sale de un destino real y maneja hasta el negocio por la
// carretera de pairs.json. Fases negativas ⇒ al entrar a la escena ya hubo
// llegadas y el panel nunca se ve vacío.
const CLIENTES = (() => {
  const speed = 11; // km/s de demo
  const defs = [
    { id: "puerto-plata", nombre: "María", color: "#F76C4D", phase: -46000 },
    { id: "cabarete", nombre: "Luis", color: "#FF8D16", phase: -32000 },
    { id: "jarabacoa", nombre: "Carmen", color: "#25CCB8", phase: -12000 },
    { id: "zona-colonial", nombre: "Joel", color: "#2D9CDB", phase: -2500 },
    { id: "charcos", nombre: "Ana", color: "#B23410", phase: 4000 },
  ];
  return defs.map((c) => {
    const line = conCumulado([dest(c.id).coords, ...tramo(c.id, "santiago"), NEGOCIO as [number, number]]);
    const travel = (line.total / speed) * 1000;
    const rest = 9000;
    return { ...c, line, travel, period: travel + rest, origen: dest(c.id).province };
  });
})();

function NegociosFinal() {
  const { activeScene } = useScene();
  const visible = activeScene === "negocios";
  const reduced = !!useReducedMotion();
  const [paso, setPaso] = useState(pasoInicial);

  const t = useDemoTime(visible, reduced);
  // Reduced motion: fotograma fijo con dos clientes a medio camino.
  const tv = reduced ? 6000 : t;

  // Todo se deriva del reloj — posiciones, llegadas y contador — así el mapa
  // y el panel del teléfono no pueden desincronizarse.
  const enRuta = CLIENTES.map((c) => {
    const local = tv - c.phase;
    const enCiclo = local % c.period;
    const activo = local >= 0 && enCiclo <= c.travel;
    const km = activo ? (enCiclo / c.travel) * c.line.total : 0;
    return { c, activo: activo && !(reduced && c.phase > 0), km };
  });

  const llegadas: Llegada[] = CLIENTES.flatMap((c) => {
    const local = tv - c.phase;
    if (local < c.travel) return [];
    const completadas = Math.floor((local - c.travel) / c.period) + 1;
    const ultima = c.phase + c.travel + (completadas - 1) * c.period;
    return [{ key: `${c.id}-${completadas}`, nombre: c.nombre, origen: c.origen, color: c.color, hace: tv - ultima }];
  })
    .sort((a, b) => a.hace - b.hace);

  const total = CLIENTES.reduce((acc, c) => {
    const local = tv - c.phase;
    return acc + (local >= c.travel ? Math.floor((local - c.travel) / c.period) + 1 : 0);
  }, 0);

  const ultima = llegadas[0] ?? null;
  const llegadaReciente = ultima !== null && ultima.hace < 1600;

  const pantallas = [
    <PantallaRegistro key="reg" />,
    <PantallaEnElMapa key="mapa" />,
    <PantallaPanel key="panel" llegadas={llegadas} total={total} />,
  ];

  return (
    <>
      {/* Las carreteras reales hacia el negocio, con el estilo de la casa. */}
      {visible &&
        CLIENTES.map((c) => (
          <MapRoute
            key={`road-${c.id}`}
            id={`vn6-road-${c.id}`}
            coordinates={c.line.pts}
            color="#FFFFFF"
            width={5}
            opacity={0.8}
          />
        ))}
      {visible &&
        CLIENTES.map((c) => (
          <MapRoute
            key={`road-top-${c.id}`}
            id={`vn6-road-top-${c.id}`}
            coordinates={c.line.pts}
            color="#FF8D16"
            width={2.4}
            opacity={0.8}
          />
        ))}

      {/* Los clientes manejando hacia el negocio (avatar con inicial). */}
      {visible &&
        enRuta.map(({ c, activo, km }) => {
          if (!activo) return null;
          const { pos } = puntoEnKm(c.line, km);
          return (
            <MapMarker key={`cli-${c.id}`} longitude={pos[0]} latitude={pos[1]}>
              <MarkerContent>
                <span
                  className={`flex size-[22px] items-center justify-center rounded-full font-mono text-[10px] font-bold text-white ${PIN_CHROME}`}
                  style={{ background: c.color }}
                >
                  {c.nombre[0]}
                </span>
              </MarkerContent>
            </MapMarker>
          );
        })}

      {/* Tu negocio + toast de la última llegada */}
      {visible && (
        <MapMarker longitude={NEGOCIO[0]} latitude={NEGOCIO[1]} anchor="bottom">
          <MarkerContent>
            <div className="flex flex-col items-center gap-1">
              <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] text-micro font-bold text-white shadow-card">
                Tu negocio
              </div>
              <div className="relative">
                {llegadaReciente && !reduced && (
                  <span key={ultima.key} className="vn6-ping absolute inset-[-5px] rounded-full border-2 border-mango" />
                )}
                <div className={`flex size-10 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
                  <Icon name="storefront" className="text-feature text-ink-2" />
                </div>
              </div>
            </div>
            {ultima && (
              <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2">
                <div
                  key={ultima.key}
                  className="vn6-in whitespace-nowrap rounded-full border border-line bg-white/95 px-2.5 py-1 text-micro font-bold text-ink shadow-card"
                >
                  <span className="mr-1.5 inline-block size-[6px] rounded-full align-middle" style={{ background: ultima.color }} />
                  {ultima.nombre} llegó desde {ultima.origen}
                </div>
              </div>
            )}
          </MarkerContent>
        </MapMarker>
      )}

      <div
        aria-hidden={!visible}
        inert={!visible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* La gran card del negocio — misma anatomía que la de viajeros
            (mismo prefijo min-[900px] para no flotar en móvil). */}
        <div
          className={`crd-ol-panel crd-business-story absolute left-[clamp(16px,3%,40px)] box-border w-[clamp(280px,30vw,400px)] rounded-panel min-[900px]:top-1/2 min-[900px]:-translate-y-1/2 ${PANEL_SOLID} p-[18px] shadow-modal ${
            visible ? "animate-slide-up" : ""
          }`}
        >
          <div aria-hidden="true" className="absolute -right-6 -top-7 max-[899px]:hidden">
            <StampCRD size={92} rotate={-9} color="#0C6A60" line1="EST. 2026" line2="· NEGOCIO LOCAL ·" />
          </div>

          <div className="mb-2.5">
            <Kicker icon="storefront" index="04">Negocios</Kicker>
          </div>
          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Tres pasos para <em className="crd-accent">estar en la ruta</em>
          </h2>
          <p className="mb-3 mt-1.5 text-xs leading-[1.45] text-muted">
            Del registro a ver clientes llegando. Cada parada enseña tu panel real.
          </p>

          {/* Móvil: espejo del panel — el teléfono no se muestra. */}
          <ChipEnVivo>
            {ultima ? `${total} hoy · ${ultima.nombre} llegó desde ${ultima.origen}` : "esperando llegadas…"}
          </ChipEnVivo>

          <RailDePasos
            pasos={PASOS_NEGOCIO}
            activo={paso}
            onActivo={setPaso}
            visible={visible}
            label="Cómo funciona ConoceRD para tu negocio, en 3 pasos"
          />

          <div className="mt-3 border-t border-dashed border-line pt-3">
            <Button variant="mint" icon="add_business" onClick={() => requestSubscribe("negocio")}>
              Registrar mi negocio
            </Button>
          </div>
        </div>

        <Telefono visible={visible}>
          <PilaDePantallas pantallas={pantallas} activo={paso} />
        </Telefono>
      </div>
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

const VN6_CSS = `
@keyframes vn6-pop { from { transform: scale(1.3); } to { transform: scale(1); } }
.vn6-pop { animation: vn6-pop .32s cubic-bezier(.2,.8,.3,1) both; }
@keyframes vn6-ping { from { transform: scale(.55); opacity: .7; } to { transform: scale(1.8); opacity: 0; } }
.vn6-ping { animation: vn6-ping .85s ease-out both; pointer-events: none; }
@keyframes vn6-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.vn6-in { animation: vn6-in .3s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .vn6-pop, .vn6-in { animation: none; }
  .vn6-ping { animation: none; opacity: 0; }
}
`;

export default function VNFinal() {
  return (
    <>
      <style>{VN6_CSS}</style>
      <ViajerosFinal />
      <NegociosFinal />
    </>
  );
}
