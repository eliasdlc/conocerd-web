"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante FINAL de "Arma tu recorrido" — síntesis elegida por el dueño.
//
//  Desktop = dos cartas sobre el mapa y nada más:
//   · Izquierda (v1/v2): "Arma tu itinerario" con los viajes recomendados.
//   · Derecha (v1): el itinerario vivo — paradas en orden, km y tiempo de cada
//     tramo, totales (paradas · km · manejando) y "Ordena mejor".
//  Fuera: los chips de categoría de arriba y el mando de control del centro.
//  El mapa se ve completo entre las dos cartas.
//
//  Guardar viaje (idea de v3, el sello): la carta derecha se estampa con el
//  cuño ConoceRD y pide el correo ahí mismo. No manda a la lista de espera:
//  manda el itinerario por correo — cada parada con foto, descripción, cómo
//  llegar y cuánto se maneja entre una y otra (POST /api/itinerario).
//
//  Móvil (≤899px): aquí sí manda el mapa (idea de v4). No hay dos cartas —
//  hay un solo sheet abajo con asa: con la ruta vacía muestra la intro y los
//  viajes recomendados en fila deslizable; con paradas se vuelve el itinerario.
//
//  Params de demo para capturas (no afectan el uso normal):
//    ?demo-ruta=1|id1,id2  → precarga una ruta
//    ?demo-card=<id>       → abre la mini-card de ese destino
//    ?demo-sello=1         → muestra la carta ya estampada, pidiendo el correo
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORY_META,
  type Destination,
} from "@/data/destinations";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";
import StampCRD from "@/variants/stamp";
import pairs from "@/data/routes/pairs.json";

// ─── Datos de carretera (pares reales precalculados) ─────────────────────────

const IDS = pairs.ids as string[];
const KM = pairs.km as number[][];
const MIN = pairs.min as number[][];
const LEGS = pairs.legs as unknown as Record<string, [number, number][]>;

const DEST: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d])
);

function pairKm(a: string, b: string): number {
  return KM[IDS.indexOf(a)][IDS.indexOf(b)] ?? 0;
}
function pairMin(a: string, b: string): number {
  return MIN[IDS.indexOf(a)][IDS.indexOf(b)] ?? 0;
}

/** Geometría carretera a→b; invierte el leg si está guardado como b→a. */
function legCoords(a: string, b: string): [number, number][] {
  const direct = LEGS[`${a}|${b}`];
  if (direct) return direct;
  const rev = LEGS[`${b}|${a}`];
  if (rev) return [...rev].reverse();
  return [DEST[a].coords, DEST[b].coords];
}

function totalsFor(stops: string[]): { km: number; min: number } {
  let km = 0;
  let min = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    km += pairKm(stops[i], stops[i + 1]);
    min += pairMin(stops[i], stops[i + 1]);
  }
  return { km: Math.round(km), min: Math.round(min) };
}

function fmtDur(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Formato corto para la fila de totales: "6 h 59" cabe, "6 h 59 min" no. */
function fmtDurShort(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** Nearest-neighbor manteniendo la primera parada como origen (v1). */
function nearestNeighborOrder(ids: string[]): string[] {
  if (ids.length < 3) return ids;
  const [first, ...rest] = ids;
  const out = [first];
  const pool = new Set(rest);
  while (pool.size) {
    const last = out[out.length - 1];
    let best = "";
    let bestKm = Infinity;
    for (const c of pool) {
      const d = pairKm(last, c);
      if (d < bestKm) {
        bestKm = d;
        best = c;
      }
    }
    out.push(best);
    pool.delete(best);
  }
  return out;
}

// ─── Viajes recomendados (v2) ────────────────────────────────────────────────

type Preset = {
  id: string;
  name: string;
  tagline: string;
  cover: string; // id del destino cuya foto ilustra la carta
  stops: string[];
};

// El orden de paradas está pensado como se maneja de verdad (los km de la
// matriz lo confirman), no en el orden en que se nombran los lugares.
const PRESETS: Preset[] = [
  {
    id: "sur",
    name: "Sur salvaje",
    tagline: "Playa virgen, costa y lago",
    cover: "aguilas",
    stops: ["aguilas", "barahona", "lago-enriquillo"],
  },
  {
    id: "samana",
    name: "Samaná completo",
    tagline: "Cascada, playas y Los Haitises",
    cover: "limon",
    stops: ["las-terrenas", "limon", "playa-rincon", "playa-fronton", "haitises"],
  },
  {
    id: "cibao",
    name: "Cibao aventurero",
    tagline: "Charcos, kite y montaña",
    cover: "charcos",
    stops: ["charcos", "cabarete", "jarabacoa", "constanza"],
  },
];

// ─── Demo por URL (solo capturas; el registro monta esto con ssr:false) ──────

const DEMO_ROUTE = ["aguilas", "barahona", "constanza", "charcos"];

function readDemo(): { stops: string[]; card: string | null; sello: boolean } {
  if (typeof window === "undefined") return { stops: [], card: null, sello: false };
  try {
    const p = new URLSearchParams(window.location.search);
    const ruta = p.get("demo-ruta");
    const stops =
      ruta === "1"
        ? DEMO_ROUTE
        : ruta
          ? ruta.split(",").filter((id) => id in DEST)
          : [];
    const card = p.get("demo-card");
    return {
      stops,
      card: card && card in DEST ? card : null,
      sello: p.has("demo-sello"),
    };
  } catch {
    return { stops: [], card: null, sello: false };
  }
}

const DEMO = readDemo();

// ─── Glifos que faltan en el set (trazo 1.9 redondeado, 24×24) ───────────────

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

const GLYPH_PLUS = "M12 5v14M5 12h14";
const GLYPH_UNDO = "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11";
const GLYPH_SAVE = "M7 3.6h10a1.2 1.2 0 0 1 1.2 1.2V20.4L12 16.6l-6.2 3.8V4.8A1.2 1.2 0 0 1 7 3.6Z";
const GLYPH_SORT = "M7 20V5m0 15-3-3m3 3 3-3M17 4v15m0-15-3 3m3-3 3 3";
const GLYPH_MAIL = "M3 6.8h18v10.4H3zM3 7.2l9 6.2 9-6.2";

// ─── Pin de parada: el pin ORIGINAL de la app + numerito ink ─────────────────

function StopBadge({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute grid place-items-center rounded-full border border-cream/95 bg-ink font-mono font-bold text-white shadow-[0_1px_3px_rgba(0,0,0,.3)]"
      style={{
        width: size,
        height: size,
        right: -size * 0.28,
        top: -size * 0.28,
        fontSize: Math.round(size * 0.58),
      }}
    >
      {n}
    </span>
  );
}

/** En ruta el destino conserva su pin de categoría; el número lo diferencia. */
function RoutePin({ d, n, size = 30 }: { d: Destination; n: number; size?: number }) {
  return (
    <span className="relative block">
      <CategoryPin category={d.category} size={size} />
      <StopBadge n={n} />
    </span>
  );
}

// ─── Contenido compartido de la mini-card (desktop anclada / sheet móvil) ────

function CardBody({
  d,
  stopIndex,
  stops,
  compact,
}: {
  d: Destination;
  stopIndex: number; // -1 si no está en la ruta
  stops: string[];
  compact?: boolean;
}) {
  const meta = CATEGORY_META[d.category];
  const inRoute = stopIndex >= 0;
  const last = stops.length > 0 ? stops[stops.length - 1] : null;
  const showArrival = !inRoute && last !== null && last !== d.id;

  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <div className={`truncate font-bold text-ink ${compact ? "text-sm" : "text-copy"}`}>
          {d.name}
        </div>
        <div className="flex flex-none items-center gap-1 text-xs font-bold text-mango-ink">
          <Icon name="star" className="text-sm" />
          {d.rating.toFixed(1)}
        </div>
      </div>
      <div className="mt-0.5 font-mono text-micro text-muted">
        {d.province} · {meta.label}
      </div>
      <div className={`flex flex-wrap gap-1 ${compact ? "mt-1.5" : "mt-2"}`}>
        {d.activities.map((a) => (
          <span
            key={a}
            className="rounded-md bg-cream-2 px-[7px] py-0.5 text-micro font-semibold text-muted"
          >
            {a}
          </span>
        ))}
      </div>
      {inRoute ? (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-micro font-bold text-mango-ink">
          <Icon name="route" className="text-sm" />
          Parada {stopIndex + 1} de tu ruta
        </div>
      ) : showArrival ? (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-micro font-bold text-mint-ink">
          <Icon name="route" className="text-sm" />A {Math.round(pairKm(last, d.id))} km ·{" "}
          {fmtDur(pairMin(last, d.id))} de {DEST[last].name}
        </div>
      ) : null}
    </>
  );
}

function CardAction({
  inRoute,
  name,
  onAdd,
  onRemove,
  className = "",
}: {
  inRoute: boolean;
  name: string;
  onAdd: () => void;
  onRemove: () => void;
  className?: string;
}) {
  return inRoute ? (
    <button
      type="button"
      onClick={onRemove}
      className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-coral-ink/45 bg-white font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${className}`}
    >
      <Icon name="close" className="text-sm" />
      Quitar de la ruta
    </button>
  ) : (
    <button
      type="button"
      onClick={onAdd}
      className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-mango font-bold text-white transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${className}`}
    >
      <Glyph d={GLYPH_PLUS} className="text-sm" />
      Añadir parada a {name.split(" ")[0]}
    </button>
  );
}

// ─── Mini-card desktop, anclada al pin con punta ─────────────────────────────

function PinCard({
  d,
  side,
  stopIndex,
  stops,
  onAdd,
  onRemove,
  onClose,
}: {
  d: Destination;
  side: "top" | "bottom";
  stopIndex: number;
  stops: string[];
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={d.name}
      className={`absolute left-1/2 z-50 w-[242px] -translate-x-1/2 motion-reduce:animate-none max-[899px]:hidden ${
        side === "top" ? "bottom-[calc(100%+13px)] animate-slide-up" : "top-[calc(100%+13px)]"
      }`}
    >
      {/* Punta al pin: antes de la card para que la card tape su mitad interna */}
      {side === "bottom" && (
        <span className="absolute bottom-full left-1/2 z-10 size-3.5 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t border-line bg-white" />
      )}
      <div className="overflow-hidden rounded-card border border-line bg-white shadow-modal">
        <div className="relative h-[104px] w-full bg-cream-2">
          <Image src={d.image} alt="" fill sizes="242px" className="object-cover" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="absolute right-2 top-2 grid size-7 cursor-pointer place-items-center rounded-full bg-ink/55 text-white backdrop-blur-sm transition-colors hover:bg-ink/75 focus-visible:ring-2 focus-visible:ring-white"
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <CardBody d={d} stopIndex={stopIndex} stops={stops} />
          <CardAction
            inRoute={stopIndex >= 0}
            name={d.name}
            onAdd={onAdd}
            onRemove={onRemove}
            className="mt-2.5 h-10 text-tiny"
          />
        </div>
      </div>
      {side === "top" && (
        <span className="absolute left-1/2 top-full size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-line bg-white" />
      )}
    </div>
  );
}

// ─── Pin interactivo ─────────────────────────────────────────────────────────

function DestinationPin({
  d,
  stopIndex,
  stops,
  isSelected,
  onSelect,
  onAdd,
  onRemove,
  onClose,
}: {
  d: Destination;
  stopIndex: number;
  stops: string[];
  isSelected: boolean;
  onSelect: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const inRoute = stopIndex >= 0;
  // Pines de media isla hacia el norte: la card se abre hacia abajo para no
  // chocar con el nav ni salirse del viewport (la card mide ~330px de alto).
  const side: "top" | "bottom" = d.coords[1] >= 19.0 ? "bottom" : "top";

  return (
    <MapMarker longitude={d.coords[0]} latitude={d.coords[1]}>
      <MarkerContent>
        <div className={isSelected ? "relative z-40" : "relative"}>
          <button
            type="button"
            onClick={onSelect}
            aria-label={
              inRoute
                ? `${d.name}, parada ${stopIndex + 1} de tu ruta — ver detalle`
                : `${d.name} — ver detalle y añadir a tu ruta`
            }
            aria-expanded={isSelected}
            className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <span
              className={`grid place-items-center rounded-full transition-transform duration-150 ${
                isSelected ? "scale-110 ring-4 ring-mango/35" : ""
              }`}
            >
              {inRoute ? (
                <RoutePin d={d} n={stopIndex + 1} />
              ) : (
                <CategoryPin category={d.category} size={30} />
              )}
            </span>
          </button>
          {isSelected && (
            <PinCard
              d={d}
              side={side}
              stopIndex={stopIndex}
              stops={stops}
              onAdd={onAdd}
              onRemove={onRemove}
              onClose={onClose}
            />
          )}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Carta de viaje recomendado (v2; versión compacta para la fila móvil) ────

function PresetCard({
  preset,
  active,
  compact,
  onSelect,
}: {
  preset: Preset;
  active: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  const t = totalsFor(preset.stops);
  const cover = DEST[preset.cover];
  const data = `${preset.stops.length} paradas · ${t.km} km · ${fmtDur(t.min)}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Cargar la ruta ${preset.name}: ${data} de manejo`}
      className={`flex cursor-pointer items-center gap-2.5 rounded-card border-[1.5px] text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
        active
          ? "border-mango bg-mango-soft shadow-card"
          : "border-line bg-white hover:border-mango/60"
      } ${compact ? "w-[248px] flex-none p-2" : "w-full p-2"}`}
    >
      <span
        className={`relative flex-none overflow-hidden rounded-tile bg-cream-2 ${
          compact ? "size-11" : "size-12"
        }`}
      >
        {cover && <Image src={cover.image} alt="" fill sizes="48px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-tiny font-bold text-ink">{preset.name}</span>
          {active && <Icon name="check_circle" className="flex-none text-sm text-mango-ink" />}
        </span>
        {!compact && (
          <span className="mt-px block truncate text-mini text-muted">{preset.tagline}</span>
        )}
        <span className="mt-px block whitespace-nowrap font-mono text-micro font-bold text-mint-ink">
          {data}
        </span>
      </span>
    </button>
  );
}

// ─── Botón de fila de la lista de paradas ────────────────────────────────────

function RowBtn({
  name,
  label,
  onClick,
  disabled,
}: {
  name: "arrow_upward" | "arrow_downward" | "close";
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-muted transition-colors hover:bg-cream-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent max-[899px]:size-10"
    >
      <Icon name={name} className="text-sm" />
    </button>
  );
}

// ─── Estado del guardado (sello + captura de correo) ─────────────────────────

type SaveState =
  | { k: "idle" }
  | { k: "form"; error?: string }
  | { k: "sending" }
  | { k: "done"; email: string };

// ─── Variante ────────────────────────────────────────────────────────────────

type RouteState = { stops: string[]; history: string[][] };

const V6_CSS = `
@keyframes mapa6-stamp {
  0%   { opacity: 0; transform: scale(1.6) rotate(-16deg); }
  62%  { opacity: 1; transform: scale(0.94) rotate(-7deg); }
  100% { opacity: 1; transform: scale(1) rotate(-8deg); }
}
.mapa6-stamp { animation: mapa6-stamp .5s cubic-bezier(.2,.85,.3,1) both; transform-origin: 50% 45%; }
@media (prefers-reduced-motion: reduce) {
  .mapa6-stamp { animation: none; }
}
`;

export default function MapaFinal() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [{ stops, history }, setRoute] = useState<RouteState>({
    stops: DEMO.stops,
    history: [],
  });
  const [selected, setSelected] = useState<string | null>(DEMO.card);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [savedKm, setSavedKm] = useState<number | null>(null); // feedback de "Ordena mejor"
  const [save, setSave] = useState<SaveState>(DEMO.sello ? { k: "form" } : { k: "idle" });
  const [email, setEmail] = useState("");
  // Móvil: el sheet arranca abierto; el asa lo colapsa para ver el mapa entero.
  const [sheetOpen, setSheetOpen] = useState(true);
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement | null>(null);

  const stamped = save.k !== "idle";

  // Cada mutación de la ruta guarda el estado anterior para "deshacer".
  function commit(fn: (prev: string[]) => string[]) {
    setRoute((s) => {
      const next = fn(s.stops);
      if (next === s.stops) return s;
      return { stops: next, history: [...s.history.slice(-19), s.stops] };
    });
    setSavedKm(null);
    setSave({ k: "idle" });
  }

  const undo = () => {
    setRoute((s) =>
      s.history.length === 0
        ? s
        : { stops: s.history[s.history.length - 1], history: s.history.slice(0, -1) }
    );
    setSavedKm(null);
    setSave({ k: "idle" });
  };

  function addStop(id: string) {
    commit((s) => (s.includes(id) ? s : [...s, id]));
    setSelected(null); // feedback inmediato: el pin se numera y la ruta se traza
    setPresetId(null);
    setSheetOpen(true);
  }
  function removeStop(id: string) {
    commit((s) => (s.includes(id) ? s.filter((x) => x !== id) : s));
    setSelected((cur) => (cur === id ? null : cur));
    setPresetId(null);
  }
  function moveStop(id: string, dir: -1 | 1) {
    commit((s) => {
      const i = s.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setPresetId(null);
  }
  function clearRoute() {
    commit(() => []);
    setPresetId(null);
  }
  function loadPreset(p: Preset) {
    commit(() => p.stops);
    setPresetId(p.id);
    setSelected(null);
    setSheetOpen(true);
  }

  // "Ordena mejor" (v1): reordena con nearest-neighbor y reporta el ahorro.
  const t = totalsFor(stops);
  const bestOrder = useMemo(() => nearestNeighborOrder(stops), [stops]);
  const saveKm = Math.round(t.km - totalsFor(bestOrder).km);
  const showOptimize = stops.length >= 3 && saveKm >= 5 && !stamped;

  function optimize() {
    const ahorro = saveKm;
    commit(() => bestOrder);
    setSavedKm(ahorro);
  }

  // "Guardar viaje": estampa el sello sobre la carta y pide el correo ahí mismo.
  function startSave() {
    setSave({ k: "form" });
    setSelected(null);
    setSheetOpen(true);
  }

  async function sendItinerary(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setSave({ k: "form", error: "Escribe tu correo" });
      emailRef.current?.focus();
      return;
    }
    setSave({ k: "sending" });
    try {
      const res = await fetch("/api/itinerario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, stops }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setSave({ k: "form", error: data.error ?? "No pudimos enviarlo. Inténtalo de nuevo." });
        return;
      }
      setSave({ k: "done", email: value });
    } catch {
      setSave({ k: "form", error: "Sin conexión. Inténtalo de nuevo." });
    }
  }

  // Al salir de la escena, el sello no debe quedarse pegado para la próxima.
  // Ajuste durante render (patrón "derive from previous render"), no un efecto.
  const [wasVisible, setWasVisible] = useState(isVisible);
  if (wasVisible !== isVisible) {
    setWasVisible(isVisible);
    if (!isVisible && !DEMO.sello && save.k !== "done") setSave({ k: "idle" });
  }

  // Esc cierra la mini-card del pin.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Ruta por carreteras reales: concatena los legs precalculados entre paradas
  // consecutivas (con un stub corto pin→carretera en cada extremo).
  const route = useMemo(() => {
    if (stops.length < 2) return null;
    const coords: [number, number][] = [];
    let km = 0;
    let min = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      km += pairKm(a, b);
      min += pairMin(a, b);
      const leg = [DEST[a].coords, ...legCoords(a, b), DEST[b].coords];
      coords.push(...(i === 0 ? leg : leg.slice(1)));
    }
    return { coords, km: Math.round(km), min: Math.round(min) };
  }, [stops]);

  const sel = selected ? DEST[selected] : null;
  const selIndex = sel ? stops.indexOf(sel.id) : -1;
  const totalKm = route?.km ?? 0;
  const totalMin = route?.min ?? 0;

  // ── Carta derecha / sheet móvil: el itinerario ─────────────────────────────

  const itinerary = (
    <>
      {/* Asa (solo móvil): expande/colapsa el sheet */}
      <button
        type="button"
        onClick={() => setSheetOpen((o) => !o)}
        aria-expanded={sheetOpen}
        aria-label={sheetOpen ? "Contraer el panel de tu ruta" : "Expandir el panel de tu ruta"}
        className="flex h-8 w-full flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 min-[900px]:hidden"
      >
        <span aria-hidden="true" className="h-1 w-9 rounded-full bg-[#B5C0BD]" />
      </button>

      <div className={sheetOpen ? "contents" : "max-[899px]:hidden min-[900px]:contents"}>
        {save.k === "idle" ? (
          <>
            <div className="flex-none px-[18px] pb-2 pt-4 max-[899px]:pt-0">
              {/* En móvil no existe la carta izquierda: el kicker vive aquí */}
              <div className="mb-1.5 min-[900px]:hidden">
                <Kicker icon="route" index="02">Tu ruta</Kicker>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[20px] font-bold text-ink">Itinerario</h3>
                {stops.length > 0 && (
                  <div className="flex items-center gap-1">
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={undo}
                        aria-label="Deshacer el último cambio de la ruta"
                        title="Deshacer"
                        className="grid size-7 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted transition-colors hover:bg-cream-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-ink"
                      >
                        <Glyph d={GLYPH_UNDO} className="text-sm" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearRoute}
                      className="cursor-pointer border-0 bg-transparent p-0 text-mini font-bold text-coral-ink"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ordena mejor / confirmación (aria-live anuncia el ahorro) */}
            <div aria-live="polite" className="flex-none empty:hidden">
              {showOptimize && (
                <div className="px-[18px] pb-2">
                  <button
                    type="button"
                    onClick={optimize}
                    className="crd-sticker flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-mint px-3 py-2 text-tiny font-bold text-ink-2"
                  >
                    <Glyph d={GLYPH_SORT} className="text-sm" />
                    Ordena mejor · te ahorras {saveKm} km
                  </button>
                </div>
              )}
              {savedKm !== null && !showOptimize && (
                <p className="flex items-center gap-1.5 px-[18px] pb-2 text-tiny font-semibold text-mint-ink">
                  <Icon name="check_circle" className="text-sm" />
                  Mismo viaje, {savedKm} km menos.
                </p>
              )}
            </div>

            {stops.length === 0 ? (
              <div className="flex-none px-[18px] pb-5 pt-1 max-[899px]:pb-7">
                {/* La carta izquierda ya dice "toca un pin"; en desktop este
                    hueco solo anuncia qué va a aparecer aquí. En móvil esa
                    carta no existe, así que la instrucción va completa. */}
                <p className="text-center text-tiny leading-[1.55] text-muted max-[899px]:hidden">
                  Tus paradas aparecen aquí en orden, con los kilómetros y el
                  tiempo de cada tramo.
                </p>
                <p className="text-center text-tiny leading-[1.55] text-muted min-[900px]:hidden">
                  Toca cualquier pin del mapa y aquí se arma tu viaje, tramo por
                  tramo, con kilómetros y tiempos reales de carretera.
                </p>
                {/* Móvil: los viajes recomendados viven aquí — la carta
                    izquierda no existe en pantallas chicas. */}
                <div
                  className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] min-[900px]:hidden"
                  role="group"
                  aria-label="Viajes recomendados"
                >
                  {PRESETS.map((p) => (
                    <PresetCard
                      key={p.id}
                      preset={p}
                      compact
                      active={presetId === p.id}
                      onSelect={() => loadPreset(p)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto px-[18px] pb-2.5 [scrollbar-width:thin]">
                {stops.map((id, i) => {
                  const d = DEST[id];
                  return (
                    <li key={id}>
                      <div className="flex items-center gap-2.5 py-1">
                        <span
                          aria-hidden="true"
                          className="grid size-[22px] flex-none place-items-center rounded-full bg-mango font-mono text-mini font-bold text-white"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-ink">{d.name}</div>
                          <div className="truncate font-mono text-micro text-muted">
                            {d.province}
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-0.5">
                          <RowBtn
                            name="arrow_upward"
                            label={`Adelantar ${d.name}`}
                            disabled={i === 0}
                            onClick={() => moveStop(id, -1)}
                          />
                          <RowBtn
                            name="arrow_downward"
                            label={`Atrasar ${d.name}`}
                            disabled={i === stops.length - 1}
                            onClick={() => moveStop(id, 1)}
                          />
                          <RowBtn
                            name="close"
                            label={`Quitar ${d.name} de la ruta`}
                            onClick={() => removeStop(id)}
                          />
                        </div>
                      </div>

                      {/* Tramo hacia la siguiente parada: km y minutos reales */}
                      {i < stops.length - 1 && (
                        <div className="ml-[10px] border-l-2 border-dashed border-mango/60 py-1 pl-[19px] font-mono text-micro text-muted-2">
                          {Math.round(pairKm(id, stops[i + 1]))} km ·{" "}
                          {fmtDur(pairMin(id, stops[i + 1]))} manejando
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        ) : (
          // ── Ruta estampada: el sello y el correo ───────────────────────────
          <div className="flex-none px-[18px] pb-4 pt-3 max-[899px]:pt-0">
            <div className="flex flex-col items-center text-center">
              <div className="mapa6-stamp">
                <StampCRD
                  size={148}
                  rotate={-8}
                  line1="RUTA GUARDADA"
                  line2={`${stops.length} PARADAS · ${totalKm} KM`}
                  label={`Ruta guardada: ${stops.length} paradas, ${totalKm} kilómetros`}
                />
              </div>
              {/* El cuño da el gesto; los datos hay que poder leerlos, y dentro
                  del anillo a este tamaño no se leen. */}
              <p className="mt-1 font-mono text-micro font-bold uppercase tracking-[.1em] text-muted">
                {stops.length} paradas · {totalKm} km · {fmtDurShort(totalMin)}
              </p>

              {save.k === "done" ? (
                <>
                  <h3 className="mt-2 font-display text-[20px] font-bold leading-tight text-ink">
                    Va en camino
                  </h3>
                  <p className="mt-1 text-tiny leading-[1.55] text-muted">
                    Te mandamos el itinerario completo a{" "}
                    <span className="font-bold text-ink">{save.email}</span>. Revisa
                    también la carpeta de spam por si acaso.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSave({ k: "idle" })}
                    className="mt-3 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-3.5 text-tiny font-bold text-ink transition-colors hover:bg-cream-2 focus-visible:ring-2 focus-visible:ring-ink"
                  >
                    <Icon name="route" className="text-sm" />
                    Seguir armando la ruta
                  </button>
                </>
              ) : (
                <>
                  <h3 className="mt-2 font-display text-[20px] font-bold leading-tight text-ink">
                    Tu ruta quedó <em className="crd-accent">estampada</em>
                  </h3>
                  <p className="mt-1 text-tiny leading-[1.55] text-muted">
                    Déjanos tu correo y te la mandamos completa: cada parada con su
                    foto, qué hacer ahí y cuánto manejas de una a otra.
                  </p>
                  <form onSubmit={sendItinerary} className="mt-3 w-full">
                    <label htmlFor={emailId} className="sr-only">
                      Tu correo
                    </label>
                    <div className="flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white pl-3 pr-1 focus-within:border-mango">
                      <Glyph d={GLYPH_MAIL} className="flex-none text-base text-muted" />
                      <input
                        ref={emailRef}
                        id={emailId}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        placeholder="tucorreo@ejemplo.com"
                        disabled={save.k === "sending"}
                        aria-invalid={save.k === "form" && Boolean(save.error)}
                        className="min-w-0 flex-1 border-0 bg-transparent py-2 text-tiny text-ink outline-none placeholder:text-muted-2"
                      />
                      <button
                        type="submit"
                        disabled={save.k === "sending"}
                        className="my-1 inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 rounded-full bg-mango px-3.5 text-tiny font-bold text-white transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-70"
                      >
                        {save.k === "sending" ? "Enviando…" : "Envíamelo"}
                      </button>
                    </div>
                    <p aria-live="polite" className="empty:hidden">
                      {save.k === "form" && save.error && (
                        <span className="mt-1.5 block text-mini font-semibold text-coral-ink">
                          {save.error}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-mini leading-[1.45] text-muted-2">
                      Te apuntamos también a la lista de espera de ConoceRD. Sin spam,
                      te puedes salir cuando quieras.
                    </p>
                  </form>
                  <button
                    type="button"
                    onClick={() => setSave({ k: "idle" })}
                    className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-mini font-bold text-muted underline-offset-2 hover:underline"
                  >
                    Volver a la ruta
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Totales + guardar — visibles también con el sheet colapsado */}
      {stops.length > 0 && save.k === "idle" && (
        <div className="flex-none border-t border-line bg-cream-2/70">
          <div className="grid grid-cols-3">
            <div className="px-2 py-2.5 text-center">
              <div className="font-mono text-lg font-bold leading-tight text-ink">
                {stops.length}
              </div>
              <div className="text-micro font-semibold uppercase tracking-wide text-muted">
                {stops.length === 1 ? "parada" : "paradas"}
              </div>
            </div>
            <div className="border-l border-line px-2 py-2.5 text-center">
              <div className="font-mono text-lg font-bold leading-tight text-ink">
                {totalKm} km
              </div>
              <div className="text-micro font-semibold uppercase tracking-wide text-muted">
                por carretera
              </div>
            </div>
            <div className="border-l border-line px-2 py-2.5 text-center">
              <div className="font-mono text-lg font-bold leading-tight text-ink">
                {fmtDurShort(totalMin)}
              </div>
              <div className="text-micro font-semibold uppercase tracking-wide text-muted">
                manejando
              </div>
            </div>
          </div>
          {stops.length >= 2 && (
            <div className="px-[18px] pb-3.5 pt-0.5 max-[899px]:pb-5">
              <button
                type="button"
                onClick={startSave}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-mango text-tiny font-bold text-white transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                <Glyph d={GLYPH_SAVE} className="text-sm" />
                Guardar viaje
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <style>{V6_CSS}</style>

      {/* Ruta con casing blanco debajo (se lee como carretera, no como trazo) */}
      {isVisible && route && (
        <>
          <MapRoute id="v6-ruta-casing" coordinates={route.coords} color="#FFFFFF" width={7.5} opacity={0.95} />
          <MapRoute id="v6-ruta" coordinates={route.coords} color="#FF8D16" width={4} opacity={0.95} />
        </>
      )}

      {/* Pines: toda la interacción nace aquí */}
      {isVisible &&
        DESTINATIONS.map((d) => (
          <DestinationPin
            key={d.id}
            d={d}
            stopIndex={stops.indexOf(d.id)}
            stops={stops}
            isSelected={selected === d.id}
            onSelect={() => setSelected((cur) => (cur === d.id ? null : d.id))}
            onAdd={() => addStop(d.id)}
            onRemove={() => removeStop(d.id)}
            onClose={() => setSelected(null)}
          />
        ))}

      {/* Capa de UI flotante — pointer-events-none; cada pieza los reactiva */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Carta izquierda: la intro + los viajes recomendados (solo desktop;
            en móvil ambos viven dentro del sheet del itinerario). */}
        <div
          className={`${PANEL_GLASS} pointer-events-auto absolute bottom-[clamp(24px,4%,48px)] left-[clamp(16px,3%,40px)] w-[300px] rounded-panel px-4 py-4 shadow-panel max-[899px]:hidden`}
        >
          <Kicker icon="route" index="02">Tu ruta</Kicker>
          <h2 className="mt-1.5 font-display text-[22px] font-bold leading-tight text-ink">
            Arma tu <em className="crd-accent">itinerario</em>
          </h2>
          <p className="mt-1 text-tiny leading-[1.5] text-muted">
            Toca un pin y se vuelve una parada, con km y tiempo por carretera de
            verdad. O empieza con un viaje recomendado:
          </p>
          <div className="mt-2.5 flex flex-col gap-1.5" role="group" aria-label="Viajes recomendados">
            {PRESETS.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                active={presetId === p.id}
                onSelect={() => loadPreset(p)}
              />
            ))}
          </div>
        </div>

        {/* Carta derecha en desktop; sheet abajo en móvil. Con un pin abierto
            en móvil el sheet se esconde: la mini-card ocupa ese mismo sitio. */}
        <section
          aria-label="Tu itinerario"
          className={`${PANEL_SOLID} pointer-events-auto absolute right-[clamp(16px,3%,40px)] top-1/2 flex max-h-[76vh] w-[316px] -translate-y-1/2 flex-col overflow-hidden rounded-panel shadow-panel max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:max-h-[70dvh] max-[899px]:w-auto max-[899px]:translate-y-0 max-[899px]:rounded-b-none ${
            sel ? "max-[899px]:hidden" : ""
          }`}
        >
          {itinerary}
        </section>

        {/* Móvil: la mini-card del pin es un sheet pequeño anclado abajo */}
        {sel && (
          <div
            role="dialog"
            aria-label={sel.name}
            className={`${PANEL_SOLID} pointer-events-auto absolute inset-x-3 bottom-3 z-30 animate-slide-up rounded-panel p-3 shadow-modal motion-reduce:animate-none min-[900px]:hidden`}
          >
            <div className="flex gap-3">
              <div className="relative size-[92px] flex-none overflow-hidden rounded-tile bg-cream-2">
                <Image src={sel.image} alt="" fill sizes="92px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <CardBody d={sel} stopIndex={selIndex} stops={stops} compact />
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Cerrar detalle"
                className="grid size-9 flex-none cursor-pointer place-items-center self-start rounded-full bg-cream-2 text-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Icon name="close" className="text-base" />
              </button>
            </div>
            <CardAction
              inRoute={selIndex >= 0}
              name={sel.name}
              onAdd={() => addStop(sel.id)}
              onRemove={() => removeStop(sel.id)}
              className="mt-3 h-11 text-tiny"
            />
          </div>
        )}
      </div>
    </>
  );
}
