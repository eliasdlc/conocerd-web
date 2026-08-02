"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  VARIANTE 5 — "Split editorial"
//
//  La UI de la app real como puente al producto: mitad lista, mitad mapa vivo.
//  A la izquierda una lista editorial scrolleable de destinos —cards con foto,
//  rating, categoría y actividades— con búsqueda por nombre/provincia y filtro
//  de categoría. A la derecha el mapa: hover/focus en una card resalta su pin
//  (y al revés, el hover del pin resalta y revela la card). Tocar card o pin
//  añade la parada; la card muestra su número, el pin se vuelve numerado y la
//  ruta se dibuja por carreteras reales (pairs.json/OSRM). Totales veraces
//  (km + tiempo de manejo) pegados al pie de la lista.
//
//  Arranca con una ruta demostrativa de 3 paradas (el Sur Profundo) para que
//  la escena cuente el producto de un vistazo; "Limpiar" la vacía y se arma
//  desde cero. En la promoción a sección real puede arrancar vacía.
//
//  Móvil: la lista es un bottom-sheet a media altura sobre el mapa, deslizable
//  (peek / media / completa) con asa arrastrable o tap.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/Map";
import { CategoryPin, PIN_CHROME } from "@/components/map/pins";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";
import {
  DESTINATIONS,
  CATEGORIES,
  CATEGORY_META,
  type Category,
  type Destination,
} from "@/data/destinations";
import pairs from "@/data/routes/pairs.json";

// ─── Datos de carretera (pairs.json / OSRM) ──────────────────────────────────

const IDX: Record<string, number> = Object.fromEntries(
  pairs.ids.map((id, i) => [id, i])
);
const LEGS = pairs.legs as Record<string, number[][]>;

/** Geometría por carretera entre dos destinos (la clave usa orden de índice). */
function legLine(a: string, b: string): [number, number][] {
  const key = IDX[a] < IDX[b] ? `${a}|${b}` : `${b}|${a}`;
  const raw = LEGS[key];
  if (!raw) {
    // Fallback honesto: recta entre los dos puntos (no debería ocurrir, los
    // 18 destinos están en la matriz).
    const da = DESTINATIONS.find((d) => d.id === a)!;
    const db = DESTINATIONS.find((d) => d.id === b)!;
    return [da.coords, db.coords];
  }
  const pts = raw.map((p) => [p[0], p[1]] as [number, number]);
  return IDX[a] < IDX[b] ? pts : [...pts].reverse();
}

function routeGeometry(stops: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const leg = legLine(stops[i], stops[i + 1]);
    out.push(...(out.length ? leg.slice(1) : leg));
  }
  return out;
}

function totalsFor(stops: string[]): { km: number; min: number } {
  let km = 0;
  let min = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    km += pairs.km[IDX[stops[i]]][IDX[stops[i + 1]]];
    min += pairs.min[IDX[stops[i]]][IDX[stops[i + 1]]];
  }
  return { km: Math.round(km), min: Math.round(min) };
}

function formatDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")} min`;
}

// Búsqueda sin tildes: "aguilas" encuentra "Águilas".
function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Ruta demostrativa: el Sur Profundo por carretera (se limpia con un toque).
const DEMO_ROUTE = ["aguilas", "barahona", "lago-enriquillo"];

// Al hacer hover en un pin, la card correspondiente se revela en la lista.
// data-attr en vez de refs porque la lista se renderiza dos veces (panel
// desktop + sheet móvil) y solo debe desplazarse la visible.
function revealCard(id: string) {
  document
    .querySelectorAll<HTMLElement>(`[data-v5-card="${CSS.escape(id)}"]`)
    .forEach((el) => {
      if (el.offsetParent) el.scrollIntoView({ block: "nearest" });
    });
}

// ─── Glifo "+" (el set de Icon no trae un add plano) ─────────────────────────

function PlusGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ─── Card de destino (fila editorial, botón completo) ────────────────────────

function DestCard({
  d,
  stopIndex,
  highlighted,
  onToggle,
  onHover,
}: {
  d: Destination;
  stopIndex: number; // -1 si no está en la ruta
  highlighted: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}) {
  const meta = CATEGORY_META[d.category];
  const inRoute = stopIndex >= 0;
  return (
    <button
      type="button"
      data-v5-card={d.id}
      aria-pressed={inRoute}
      aria-label={
        inRoute
          ? `Quitar ${d.name} de la ruta (parada ${stopIndex + 1})`
          : `Añadir ${d.name} a la ruta`
      }
      onClick={onToggle}
      onMouseEnter={() => onHover(d.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(d.id)}
      onBlur={() => onHover(null)}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-card border bg-white p-2 pr-2.5 text-left transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 ${
        inRoute ? "border-mango shadow-card" : "border-line hover:border-mango/60"
      } ${highlighted && !inRoute ? "border-mango/60 shadow-card" : ""}`}
    >
      <span className="relative block h-[74px] w-[88px] flex-none overflow-hidden rounded-tile bg-cream-2">
        <Image src={d.image} alt="" fill sizes="88px" className="object-cover" />
        {inRoute && (
          <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink font-mono text-micro font-bold text-white ring-2 ring-white/90">
            {stopIndex + 1}
          </span>
        )}
      </span>

      <span className="block min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink">{d.name}</span>
        <span className="mt-0.5 flex items-center gap-1 overflow-hidden font-mono text-micro text-muted">
          <span className="inline-flex flex-none items-center gap-[3px] font-bold text-mango-ink">
            <Icon name="star" className="text-[12px]" />
            {d.rating.toFixed(1)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {meta.label} · {d.province}
          </span>
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1">
          {d.activities.slice(0, 2).map((a) => (
            <span
              key={a}
              className="rounded-md bg-cream-2 px-1.5 py-0.5 text-micro font-semibold text-muted"
            >
              {a}
            </span>
          ))}
          {d.activities.length > 2 && (
            <span className="rounded-md bg-cream-2 px-1.5 py-0.5 text-micro font-semibold text-muted">
              +{d.activities.length - 2}
            </span>
          )}
        </span>
      </span>

      {/* Afirmación visual del toggle (el botón es toda la card) */}
      <span
        aria-hidden="true"
        className={`grid size-9 flex-none place-items-center rounded-full border-[1.5px] transition-colors duration-150 ${
          inRoute ? "border-mango bg-mango text-white" : "border-line bg-white text-ink"
        }`}
      >
        {inRoute ? <Icon name="check" className="text-base" /> : <PlusGlyph />}
      </span>
    </button>
  );
}

// ─── Pin en el mapa (espejo de la card) ──────────────────────────────────────

function DestPin({
  d,
  stopIndex,
  dimmed,
  highlighted,
  onToggle,
  onHover,
}: {
  d: Destination;
  stopIndex: number;
  dimmed: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}) {
  const inRoute = stopIndex >= 0;
  return (
    <MapMarker longitude={d.coords[0]} latitude={d.coords[1]}>
      <MarkerContent>
        <div
          className={`relative transition-opacity duration-200 ${
            dimmed && !inRoute && !highlighted ? "opacity-40" : ""
          } ${highlighted ? "z-30" : ""}`}
        >
          <button
            type="button"
            aria-pressed={inRoute}
            aria-label={
              inRoute
                ? `Quitar ${d.name} de la ruta (parada ${stopIndex + 1})`
                : `Añadir ${d.name} a la ruta`
            }
            onClick={onToggle}
            onMouseEnter={() => {
              onHover(d.id);
              revealCard(d.id);
            }}
            onMouseLeave={() => onHover(null)}
            onFocus={() => {
              onHover(d.id);
              revealCard(d.id);
            }}
            onBlur={() => onHover(null)}
            className={`grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 motion-reduce:transition-none ${
              highlighted ? "scale-[1.18]" : ""
            }`}
          >
            {inRoute ? (
              <span
                className={`grid size-8 place-items-center rounded-full bg-ink font-mono text-xs font-bold text-white ${PIN_CHROME}`}
              >
                {stopIndex + 1}
              </span>
            ) : (
              <CategoryPin category={d.category} size={28} />
            )}
          </button>
          {highlighted && <MarkerLabel position="top">{d.name}</MarkerLabel>}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Chip de filtro de categoría (single-select, como en la app) ─────────────

function FilterChip({
  active,
  onClick,
  color,
  ink,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string; // sin color → chip "Todos" (tinta)
  ink?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex min-h-9 flex-none cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-[1.5px] px-3 text-tiny font-bold transition-[border-color,background-color,color] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 max-[899px]:min-h-11"
      style={
        color
          ? {
              borderColor: active ? color : "var(--color-line)",
              background: active ? `${color}1A` : "transparent",
              color: active ? ink : "var(--color-muted)",
            }
          : {
              borderColor: active ? "var(--color-ink)" : "var(--color-line)",
              background: active ? "var(--color-ink)" : "transparent",
              color: active ? "var(--color-cream)" : "var(--color-muted)",
            }
      }
    >
      {children}
    </button>
  );
}

// ─── Contenido de la lista (compartido por panel desktop y sheet móvil) ──────

function ListPanel({
  list,
  query,
  setQuery,
  cat,
  setCat,
  stops,
  stopIndexOf,
  hoverId,
  onHover,
  onToggle,
  onClear,
}: {
  list: Destination[];
  query: string;
  setQuery: (q: string) => void;
  cat: Category | null;
  setCat: (c: Category | null) => void;
  stops: Destination[];
  stopIndexOf: (id: string) => number;
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const totals = totalsFor(stops.map((s) => s.id));

  return (
    <>
      {/* Cabecera */}
      <div className="flex-none px-5 pb-3 pt-5 max-[899px]:pt-1">
        <Kicker icon="route" index="02">Tu ruta</Kicker>
        <h3 className="mt-1.5 font-display text-[22px] font-bold leading-tight text-ink">
          Arma tu <em className="crd-accent">recorrido</em>
        </h3>
        {/* En el sheet móvil el alto es oro: la promesa cabe en el pie. */}
        <p className="mb-0 mt-1 text-tiny leading-[1.5] text-muted max-[899px]:hidden">
          Añade paradas y mira la ruta por carreteras reales, igual que en la app.
        </p>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex-none px-5">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca destino o provincia"
            aria-label="Buscar destino por nombre o provincia"
            className="h-11 w-full rounded-full border border-line bg-cream-2/70 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-muted focus:border-ink"
          />
        </div>
        <div
          className="mt-2.5 flex flex-wrap gap-1.5 max-[899px]:-mx-5 max-[899px]:flex-nowrap max-[899px]:overflow-x-auto max-[899px]:px-5 max-[899px]:[scrollbar-width:none]"
          role="group"
          aria-label="Filtrar por categoría"
        >
          <FilterChip active={cat === null} onClick={() => setCat(null)}>
            Todos
          </FilterChip>
          {CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            return (
              <FilterChip
                key={c}
                active={cat === c}
                onClick={() => setCat(cat === c ? null : c)}
                color={meta.color}
                ink={meta.ink}
              >
                <Icon name={meta.icon} className="text-sm" />
                {meta.label}
              </FilterChip>
            );
          })}
        </div>
        <div className="mt-2 font-mono text-micro text-muted max-[899px]:hidden">
          {list.length === DESTINATIONS.length
            ? `${DESTINATIONS.length} destinos verificados`
            : `${list.length} de ${DESTINATIONS.length} destinos`}
        </div>
      </div>

      {/* Lista editorial */}
      <ul
        className="m-0 flex flex-1 list-none flex-col gap-2 overflow-y-auto px-5 pb-3 pt-2 [scrollbar-width:thin]"
        aria-label="Destinos disponibles"
      >
        {list.map((d) => (
          <li key={d.id}>
            <DestCard
              d={d}
              stopIndex={stopIndexOf(d.id)}
              highlighted={hoverId === d.id}
              onToggle={() => onToggle(d.id)}
              onHover={onHover}
            />
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-card border border-dashed border-line bg-cream-2/50 px-4 py-6 text-center">
            <p className="m-0 text-sm font-semibold text-ink">
              Nada que coincida con «{query.trim()}»
            </p>
            <p className="mb-0 mt-1 text-tiny text-muted">
              Prueba otro nombre o quita los filtros.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCat(null);
              }}
              className="mt-2 min-h-9 cursor-pointer border-0 bg-transparent text-tiny font-bold text-coral-ink max-[899px]:min-h-11"
            >
              Limpiar búsqueda
            </button>
          </li>
        )}
      </ul>

      {/* Totales pegados al pie */}
      <div className="flex-none border-t border-line bg-white px-5 pb-4 pt-3" aria-live="polite">
        {stops.length === 0 ? (
          <p className="m-0 text-tiny leading-[1.5] text-muted">
            Toca un destino de la lista —o su pin en el mapa— y aquí se arma tu ruta.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 max-[899px]:-mx-5 max-[899px]:flex-nowrap max-[899px]:overflow-x-auto max-[899px]:px-5 max-[899px]:[scrollbar-width:none]">
              {stops.map((s, i) => (
                <span key={s.id} className="inline-flex flex-none items-center gap-1">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-cream-2 py-1 pl-1 pr-2 text-micro font-bold text-ink">
                    <span className="grid size-4 place-items-center rounded-full bg-ink font-mono text-[9px] leading-none text-white">
                      {i + 1}
                    </span>
                    {s.name}
                  </span>
                  {i < stops.length - 1 && (
                    <Icon name="arrow_forward" className="text-[11px] text-muted" aria-hidden="true" />
                  )}
                </span>
              ))}
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-2">
              <div className="text-sm font-bold text-ink">
                {stops.length} {stops.length === 1 ? "parada" : "paradas"}
                {stops.length >= 2 && (
                  <span className="font-mono text-xs font-semibold text-muted">
                    {" "}· {totals.km} km · {formatDur(totals.min)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClear}
                className="min-h-9 cursor-pointer border-0 bg-transparent px-1 text-mini font-bold text-coral-ink max-[899px]:min-h-11"
              >
                Limpiar
              </button>
            </div>
            <p className="mb-0 mt-1 font-mono text-micro text-muted">
              {stops.length >= 2
                ? "Distancia y tiempo por carretera, no en línea recta."
                : "Añade otra parada para trazar la ruta."}
            </p>
          </>
        )}
      </div>
    </>
  );
}

// ─── Variante ────────────────────────────────────────────────────────────────

type SheetState = "peek" | "half" | "full";
const SHEET_H: Record<SheetState, string> = {
  peek: "150px",
  half: "52dvh",
  full: "82dvh",
};

export default function MapaSplitEditorial() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [route, setRoute] = useState<string[]>(DEMO_ROUTE);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>("half");
  const dragStartY = useRef<number | null>(null);

  const list = useMemo(() => {
    const q = norm(query.trim());
    return DESTINATIONS.filter(
      (d) =>
        (!cat || d.category === cat) &&
        (!q || norm(d.name).includes(q) || norm(d.province).includes(q))
    ).sort((a, b) => b.rating - a.rating);
  }, [query, cat]);

  const filteredIds = useMemo(() => new Set(list.map((d) => d.id)), [list]);
  const filtering = cat !== null || query.trim() !== "";

  const stops = useMemo(
    () =>
      route
        .map((id) => DESTINATIONS.find((d) => d.id === id))
        .filter((d): d is Destination => Boolean(d)),
    [route]
  );
  const lineCoords = useMemo(() => (route.length >= 2 ? routeGeometry(route) : []), [route]);

  const stopIndexOf = (id: string) => route.indexOf(id);
  const toggleStop = (id: string) =>
    setRoute((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function onHandlePointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onHandlePointerUp(e: React.PointerEvent) {
    const start = dragStartY.current;
    dragStartY.current = null;
    if (start == null) return;
    const dy = e.clientY - start;
    setSheet((s) => {
      if (dy <= -32) return s === "peek" ? "half" : "full"; // deslizar arriba
      if (dy >= 32) return s === "full" ? "half" : "peek"; // deslizar abajo
      return s === "full" ? "half" : s === "peek" ? "half" : "full"; // tap
    });
  }

  const panelProps = {
    list,
    query,
    setQuery,
    cat,
    setCat,
    stops,
    stopIndexOf,
    hoverId,
    onHover: setHoverId,
    onToggle: toggleStop,
    onClear: () => setRoute([]),
  };

  return (
    <>
      {/* Ruta por carretera: casco blanco + trazo mango encima */}
      {isVisible && lineCoords.length >= 2 && (
        <>
          <MapRoute id="v5-ruta-casing" coordinates={lineCoords} color="#FFFFFF" width={7} opacity={0.9} />
          <MapRoute id="v5-ruta" coordinates={lineCoords} color="#FF8D16" width={4} opacity={0.95} />
        </>
      )}

      {/* Pines (los filtrados fuera se atenúan, nunca los de la ruta) */}
      {isVisible &&
        DESTINATIONS.map((d) => (
          <DestPin
            key={d.id}
            d={d}
            stopIndex={stopIndexOf(d.id)}
            dimmed={filtering && !filteredIds.has(d.id)}
            highlighted={hoverId === d.id}
            onToggle={() => toggleStop(d.id)}
            onHover={setHoverId}
          />
        ))}

      {/* Capa de UI — pointer-events-none; cada panel los reactiva para no
          bloquear los markers del mapa. */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Panel izquierdo (desktop): la mitad-lista del split */}
        <div
          className={`absolute bottom-[clamp(18px,3.5vh,40px)] left-[clamp(14px,2vw,28px)] top-[clamp(72px,9vh,96px)] flex w-[clamp(320px,26vw,384px)] flex-col overflow-hidden rounded-panel ${PANEL_SOLID} shadow-panel max-[899px]:hidden ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <ListPanel {...panelProps} />
        </div>

        {/* Sello de puente al producto (desktop) */}
        <div
          className={`${PANEL_GLASS} pointer-events-none absolute bottom-[clamp(18px,3.5vh,40px)] right-[clamp(14px,2vw,28px)] flex items-center gap-2 rounded-full px-4 py-2.5 max-[899px]:hidden`}
        >
          <Icon name="phone_iphone" className="text-base text-mint-ink" />
          <span className="text-mini font-bold text-ink">Así se planifica en la app</span>
        </div>

        {/* Bottom-sheet (móvil): media altura, deslizable */}
        <div
          className={`absolute inset-x-0 bottom-0 hidden flex-col overflow-hidden rounded-t-panel border-t border-line bg-white shadow-[0_-8px_32px_rgba(38,70,83,0.16)] transition-[height] duration-300 ease-out motion-reduce:transition-none max-[899px]:flex ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
          style={{ height: SHEET_H[sheet] }}
        >
          <div className="grid flex-none place-items-center pb-1 pt-1.5">
            <button
              type="button"
              aria-label="Ajustar la altura de la lista"
              aria-expanded={sheet !== "peek"}
              onPointerDown={onHandlePointerDown}
              onPointerUp={onHandlePointerUp}
              className="grid h-11 w-24 cursor-grab touch-none place-items-center rounded-full border-0 bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
            >
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-[#B5C0BD]" />
            </button>
          </div>
          <ListPanel {...panelProps} />
        </div>
      </div>
    </>
  );
}
