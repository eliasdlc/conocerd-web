"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  "Arma tu recorrido" — síntesis del rework jul-ago 2026 (nació como la
//  variante v6 del sistema de variantes, promovida a sección real).
//
//  Desktop = dos cartas centradas a los lados del mapa:
//   · Izquierda (v1/v2): "Arma tu itinerario" con los viajes recomendados.
//   · Derecha (v1): el itinerario vivo — paradas en orden, km y tiempo de cada
//     tramo, totales (paradas · km · manejando) y "Ordena mejor".
//  Abajo al centro, donde v4 tenía el mando: el filtro por categoría, en
//  cuadros compactos (ícono + etiqueta) en vez de pills horizontales.
//
//  Un solo gesto por pin: el clic añade o quita la parada. El hover (o el
//  foco de teclado) muestra la card informativa —foto y de qué va el lugar—
//  sin botones dentro. En móvil, donde no hay hover, el toque hace las dos
//  cosas: añade la parada y abre la card abajo con la acción inversa.
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
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORIES,
  CATEGORY_META,
  type Category,
  type Destination,
} from "@/data/destinations";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";
import StampCRD from "@/components/StampCRD";
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

// ─── Demo por URL (solo capturas; esto solo corre en cliente: la sección
//     monta dentro de <Map>, que entra con dynamic ssr:false) ────────────────

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
const GLYPH_MINUS = "M5 12h14";
const GLYPH_UNDO = "M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11";
const GLYPH_SAVE = "M7 3.6h10a1.2 1.2 0 0 1 1.2 1.2V20.4L12 16.6l-6.2 3.8V4.8A1.2 1.2 0 0 1 7 3.6Z";
const GLYPH_SORT = "M7 20V5m0 15-3-3m3 3 3-3M17 4v15m0-15-3 3m3-3 3 3";
const GLYPH_MAIL = "M3 6.8h18v10.4H3zM3 7.2l9 6.2 9-6.2";

// ─── Pin de parada: el pin ORIGINAL de la app + numerito ink ─────────────────

// El número vive FUERA del relleno del pin: metido dentro tapaba el glifo de
// categoría, que es lo que dice qué es la parada. Badge de 20 en tinta con un
// reborde crema de 1.5, que es lo que lo separa del pin que tiene debajo.
function StopBadge({ n, size = 20 }: { n: number; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute grid place-items-center rounded-full border-[1.5px] border-cream bg-ink font-label font-extrabold text-white shadow-[0_1px_3px_rgba(0,0,0,.3)]"
      style={{
        width: size,
        height: size,
        right: -size * 0.28,
        top: -size * 0.28,
        fontSize: 10.5,
      }}
    >
      {n}
    </span>
  );
}

/** En ruta el destino conserva su pin de categoría; el número lo diferencia. */
function RoutePin({ d, n, size = 34 }: { d: Destination; n: number; size?: number }) {
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
      <div className="mt-0.5 text-micro text-muted">
        {d.province} · {meta.label}
      </div>
      <p className={`leading-[1.45] text-muted ${compact ? "mt-1 text-mini" : "mt-1.5 text-tiny"}`}>
        {d.desc}
      </p>
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
        <div className="mt-2 flex items-center gap-1.5 font-label text-micro font-bold text-mango-ink">
          <Icon name="route" className="text-sm" />
          Parada {stopIndex + 1} de tu ruta
        </div>
      ) : showArrival ? (
        <div className="mt-2 flex items-center gap-1.5 font-display text-micro font-bold text-mint-ink">
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
      className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-coral-ink/45 bg-paper font-label font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${className}`}
    >
      <Icon name="close" className="text-sm" />
      Quitar de la ruta
    </button>
  ) : (
    <button
      type="button"
      onClick={onAdd}
      // No se rellena de mango: blanco sobre mango da 2.31:1. A este cuerpo
      // el relleno del sistema es `selected`.
      className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-selected font-label font-bold text-on-selected transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${className}`}
    >
      <Glyph d={GLYPH_PLUS} className="text-sm" />
      Añadir parada a {name.split(" ")[0]}
    </button>
  );
}

// ─── Card de hover en desktop, anclada al pin con punta ──────────────────────
//  Es solo información: la acción vive en el pin (un clic añade o quita), así
//  que la card no captura el puntero — si lo hiciera, moverse hacia ella
//  apagaría el hover del pin y la card parpadearía.

function PinCard({
  d,
  side,
  stopIndex,
  stops,
}: {
  d: Destination;
  side: "top" | "bottom";
  stopIndex: number;
  stops: string[];
}) {
  const inRoute = stopIndex >= 0;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 z-50 w-[242px] -translate-x-1/2 motion-reduce:animate-none max-[899px]:hidden ${
        side === "top" ? "bottom-[calc(100%+13px)] animate-slide-up" : "top-[calc(100%+13px)]"
      }`}
    >
      {/* Punta al pin: antes de la card para que la card tape su mitad interna */}
      {side === "bottom" && (
        <span className="absolute bottom-full left-1/2 z-10 size-3.5 -translate-x-1/2 translate-y-1/2 rotate-45 border-l border-t border-line bg-paper" />
      )}
      <div className="overflow-hidden rounded-block border border-line bg-paper shadow-e1">
        <div className="relative h-[104px] w-full bg-cream-2">
          <Image src={d.image} alt="" fill sizes="242px" className="object-cover" />
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <CardBody d={d} stopIndex={stopIndex} stops={stops} />
          <div
            className={`mt-2.5 flex h-8 items-center justify-center gap-1.5 rounded-full font-label text-micro font-bold ${
              inRoute ? "bg-coral-soft text-coral-ink" : "bg-mango-soft text-mango-ink"
            }`}
          >
            <Glyph d={inRoute ? GLYPH_MINUS : GLYPH_PLUS} className="text-sm" />
            {inRoute ? "Clic en el pin para quitarla" : "Clic en el pin para añadirla"}
          </div>
        </div>
      </div>
      {side === "top" && (
        <span className="absolute left-1/2 top-full size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-line bg-paper" />
      )}
    </div>
  );
}

// ─── Pin interactivo ─────────────────────────────────────────────────────────

function DestinationPin({
  d,
  stopIndex,
  stops,
  isHovered,
  isSelected,
  onToggle,
  onHover,
  onLeave,
}: {
  d: Destination;
  stopIndex: number;
  stops: string[];
  /** Hover o foco de teclado: abre la card informativa (solo desktop). */
  isHovered: boolean;
  /** Último pin tocado: en móvil es el que tiene la card abierta abajo. */
  isSelected: boolean;
  onToggle: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const inRoute = stopIndex >= 0;
  // Pines de media isla hacia el norte: la card se abre hacia abajo para no
  // chocar con el nav ni salirse del viewport (la card mide ~330px de alto).
  const side: "top" | "bottom" = d.coords[1] >= 19.0 ? "bottom" : "top";

  return (
    <MapMarker
      longitude={d.coords[0]}
      latitude={d.coords[1]}
      zIndex={isHovered ? 3 : isSelected ? 2 : undefined}
    >
      <MarkerContent>
        <div
          className={isHovered || isSelected ? "relative z-40" : "relative"}
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
        >
          <button
            type="button"
            onClick={onToggle}
            onFocus={onHover}
            onBlur={onLeave}
            aria-pressed={inRoute}
            aria-label={
              inRoute
                ? `${d.name}, parada ${stopIndex + 1} de tu ruta — quitar de la ruta`
                : `${d.name} — añadir a tu ruta`
            }
            className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            <span
              className={`grid place-items-center rounded-full transition-transform duration-150 ${
                isHovered
                  ? "scale-110 ring-4 ring-selected/25"
                  : isSelected
                    ? "max-[899px]:scale-110 max-[899px]:ring-4 max-[899px]:ring-selected/25"
                    : ""
              }`}
            >
              {inRoute ? (
                <RoutePin d={d} n={stopIndex + 1} />
              ) : (
                <CategoryPin category={d.category} size={30} />
              )}
            </span>
          </button>
          {isHovered && <PinCard d={d} side={side} stopIndex={stopIndex} stops={stops} />}
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
      // El viaje recomendado es un objetivo seleccionable, no una acción: al
      // elegirlo se rellena entero de `selected`, la regla vigente. El borde de
      // color sobre fondo teñido es la receta que el gate descartó.
      className={`flex cursor-pointer items-center gap-2.5 rounded-block border-[1.5px] text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
        active
          ? "border-selected bg-selected shadow-e1"
          : "border-line bg-paper hover:border-muted-2"
      } ${compact ? "w-[248px] flex-none p-2" : "w-full p-2"}`}
    >
      <span
        className={`relative flex-none overflow-hidden rounded-chip bg-cream-2 ${
          compact ? "size-11" : "size-12"
        }`}
      >
        {cover && <Image src={cover.image} alt="" fill sizes="48px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={`truncate font-label text-tiny font-bold ${active ? "text-on-selected" : "text-ink"}`}
          >
            {preset.name}
          </span>
          {active && <Icon name="check_circle" className="flex-none text-sm text-on-selected" />}
        </span>
        {!compact && (
          <span
            className={`mt-px block truncate text-mini ${active ? "text-white/70" : "text-muted"}`}
          >
            {preset.tagline}
          </span>
        )}
        <span
          className={`mt-px block whitespace-nowrap font-display text-micro font-bold ${
            active ? "text-on-selected" : "text-mint-ink"
          }`}
        >
          {data}
        </span>
      </span>
    </button>
  );
}

// ─── Filtro por categoría: cuadros compactos abajo al centro (idea de v4) ────
//  Conjunto vacío = "todas": los cinco cuadros se ven encendidos y se pintan
//  todos los pines. El primer clic deja solo esa categoría; de ahí en adelante
//  cada cuadro suma o resta. Al apagar el último, vuelve a "todas".

function CategoryFilter({
  cats,
  onToggle,
}: {
  cats: Set<Category>;
  onToggle: (c: Category) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar destinos por categoría"
      className={`${PANEL_GLASS} pointer-events-auto absolute bottom-[clamp(14px,3%,30px)] left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-surface p-1.5 shadow-e1 max-[899px]:bottom-auto max-[899px]:left-3 max-[899px]:right-3 max-[899px]:top-[var(--crd-nav-clear)] max-[899px]:translate-x-0`}
    >
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        // El relleno marca lo que el visitante ELIGIÓ, no lo que se está
        // pintando. Con el conjunto vacío se ven todos los pines, pero ninguna
        // celda está elegida: si el reposo se rellenara entero, el dock sería
        // una barra de tinta maciza y "elegido" dejaría de significar nada.
        const picked = cats.has(cat);
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onToggle(cat)}
            aria-pressed={picked}
            title={meta.label}
            // La categoría la dice el glifo, no el color de la celda: el color
            // de categoría es información y teñir la celda con él confundía
            // "esta es la de playas" con "esta está elegida". La elegida se
            // rellena de `selected` y su glifo pasa a relleno al 22 %.
            className={`grid h-16 w-16 cursor-pointer content-center justify-items-center gap-1 rounded-ctrl border-[1.5px] px-1 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 max-[899px]:h-[54px] max-[899px]:w-auto max-[899px]:flex-1 max-[899px]:px-0.5 ${
              picked
                ? "border-selected bg-selected text-on-selected"
                : "border-line bg-paper text-ink-3"
            }`}
          >
            <Icon name={meta.icon} active={picked} className="text-lg leading-none" />
            <span className="w-full truncate text-center font-label text-[9.5px] font-bold leading-none tracking-[-.01em] max-[899px]:text-[8.5px]">
              {meta.label}
            </span>
          </button>
        );
      })}
    </div>
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

// ─── Sección ─────────────────────────────────────────────────────────────────

type RouteState = { stops: string[]; history: string[][] };

/* La coreografía del estampado son cinco piezas sincronizadas al mismo
   instante de impacto (~250 ms): el cuño cae desde "la cámara" (ease-in, como
   un tampón de verdad: acelera hasta golpear), la carta se hunde y rebota, la
   vista entera da una sacudida amortiguada, y del punto de contacto salen una
   onda y salpicaduras de tinta. Los delays de ring/speck y los porcentajes de
   kick/stamp están calculados para coincidir en ese golpe. */
const V6_CSS = `
@keyframes mapa6-stamp {
  0%   { opacity: 0; transform: scale(2.2) rotate(-3deg); animation-timing-function: cubic-bezier(.55,0,.8,.4); }
  38%  { opacity: 1; transform: scale(.88) rotate(1.5deg); animation-timing-function: cubic-bezier(.2,.85,.3,1); }
  60%  { transform: scale(1.05) rotate(-.6deg); }
  80%  { transform: scale(.985) rotate(.2deg); }
  100% { opacity: 1; transform: none; }
}
/* fill \`backwards\` (no \`both\`) a propósito: un fill permanente deja el
   wrapper en un compositor layer para siempre y Chromium rasteriza el filtro
   de tinta del sello a la escala del keyframe inicial (texto gigante y
   recortado). Al terminar en \`none\` el layer se libera y el SVG se pinta
   nítido; la rotación del cuño vive en el propio sello (prop rotate). */
.mapa6-stamp { animation: mapa6-stamp .66s backwards; transform-origin: 50% 45%; }

/* La carta recibe el golpe: se hunde un pelo y recupera. Anima \`transform\`,
   que compone con el \`translate\` de Tailwind (el centrado -translate-y-1/2
   vive en la propiedad translate, no en transform). El 0-32% en reposo es la
   espera de la caída del cuño. */
@keyframes mapa6-kick {
  0%, 32% { transform: none; }
  40%  { transform: translateY(3px) scale(.988); }
  70%  { transform: translateY(-1px) scale(1.004); }
  100% { transform: none; }
}
.mapa6-kick { animation: mapa6-kick .62s cubic-bezier(.2,.8,.3,1); }

/* Sacudida de cámara: se aplica por JS a .crd-journey-sticky en el momento
   del impacto. Amplitud pequeña y amortiguada — vibra, no marea. */
@keyframes mapa6-quake {
  0%   { transform: none; }
  12%  { transform: translate(-5px, 3px) rotate(-.22deg); }
  28%  { transform: translate(4px, -3px) rotate(.2deg); }
  46%  { transform: translate(-3px, 2px) rotate(-.12deg); }
  64%  { transform: translate(2px, -1px) rotate(.08deg); }
  82%  { transform: translate(-1px, 1px); }
  100% { transform: none; }
}
.mapa6-quake { animation: mapa6-quake .5s cubic-bezier(.25,.45,.35,1); }

/* Tinta que escapa del golpe: onda + salpicaduras desde el punto de contacto.
   Arrancan con delay (.24s) para nacer exactamente al tocar el papel. La base
   del cuño es papel OPACO: todo lo que quede a escala menor que el sello es
   invisible, así que la onda nace en su borde y las gotas ya fuera de él. */
@keyframes mapa6-ring {
  0%   { opacity: 0; transform: scale(.96); }
  14%  { opacity: .55; }
  100% { opacity: 0; transform: scale(1.5); }
}
.mapa6-ring {
  position: absolute; inset: 4%; border-radius: 9999px;
  border: 3px solid #B23410; pointer-events: none;
  animation: mapa6-ring .55s ease-out .24s both;
}
@keyframes mapa6-speck {
  0%   { opacity: 0; transform: translate(calc(var(--dx) * .8), calc(var(--dy) * .8)); }
  14%  { opacity: .9; }
  100% { opacity: 0; transform: translate(calc(var(--dx) * 1.6), calc(var(--dy) * 1.6)) scale(.35); }
}
.mapa6-speck {
  position: absolute; left: 50%; top: 45%; border-radius: 9999px;
  background: #B23410; pointer-events: none;
  animation: mapa6-speck .55s cubic-bezier(.15,.6,.3,1) .24s both;
}

/* El texto bajo el cuño entra después del golpe, escalonado. */
@keyframes mapa6-rise {
  from { opacity: 0; transform: translateY(7px); }
  to   { opacity: 1; transform: none; }
}
.mapa6-rise { animation: mapa6-rise .45s cubic-bezier(.2,.8,.3,1) both; }

@media (prefers-reduced-motion: reduce) {
  .mapa6-stamp, .mapa6-kick, .mapa6-quake, .mapa6-rise { animation: none; }
  .mapa6-ring, .mapa6-speck { display: none; }
}
`;

/* Salpicaduras: dirección y tamaño fijos (nada aleatorio en render) — ocho
   gotas repartidas alrededor del punto de contacto del cuño. */
const SPECKS: { dx: string; dy: string; s: number }[] = [
  { dx: "-74px", dy: "-40px", s: 5 },
  { dx: "60px", dy: "-54px", s: 4 },
  { dx: "84px", dy: "10px", s: 6 },
  { dx: "-66px", dy: "30px", s: 4 },
  { dx: "32px", dy: "64px", s: 5 },
  { dx: "-26px", dy: "-72px", s: 4 },
  { dx: "72px", dy: "50px", s: 4 },
  { dx: "-44px", dy: "60px", s: 6 },
];

export default function MapaSection() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [{ stops, history }, setRoute] = useState<RouteState>({
    stops: DEMO.stops,
    history: [],
  });
  const [selected, setSelected] = useState<string | null>(DEMO.card);
  const [hovered, setHovered] = useState<string | null>(DEMO.card);
  // Vacío = todas las categorías (ver CategoryFilter).
  const [cats, setCats] = useState<Set<Category>>(() => new Set());
  const [presetId, setPresetId] = useState<string | null>(null);
  const [savedKm, setSavedKm] = useState<number | null>(null); // feedback de "Ordena mejor"
  const [save, setSave] = useState<SaveState>(DEMO.sello ? { k: "form" } : { k: "idle" });
  const [email, setEmail] = useState("");
  // Móvil: el sheet arranca abierto; el asa lo colapsa para ver el mapa entero.
  const [sheetOpen, setSheetOpen] = useState(true);
  // El asa se puede ARRASTRAR como en un teléfono real: el sheet sigue al dedo
  // (con algo de elástico) y al soltar hace snap a abierto/cerrado. El tap
  // sigue funcionando vía onClick; justDragged evita que un drag dispare
  // también el click y togglee dos veces.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragFrom = useRef<{ y: number; open: boolean } | null>(null);
  const justDragged = useRef(false);
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const quakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (quakeTimer.current) clearTimeout(quakeTimer.current);
  }, []);

  function handleDown(e: React.PointerEvent<HTMLButtonElement>) {
    dragFrom.current = { y: e.clientY, open: sheetOpen };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragFrom.current) return;
    const dy = e.clientY - dragFrom.current.y;
    // Abierto sólo baja; cerrado sólo sube (con elástico corto).
    setDragY(dragFrom.current.open ? Math.max(0, dy) : Math.max(-44, Math.min(0, dy)));
  }
  function handleUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragFrom.current) return;
    const dy = e.clientY - dragFrom.current.y;
    const { open } = dragFrom.current;
    dragFrom.current = null;
    setDragging(false);
    setDragY(0);
    if (Math.abs(dy) > 9) {
      justDragged.current = true;
      if (dy < -26) setSheetOpen(true);
      else if (dy > 26) setSheetOpen(false);
      else setSheetOpen(open);
    }
  }
  function handleTap() {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    setSheetOpen((o) => !o);
  }

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
    setPresetId(null);
    setSheetOpen(true);
  }
  function removeStop(id: string) {
    commit((s) => (s.includes(id) ? s.filter((x) => x !== id) : s));
    setSelected((cur) => (cur === id ? null : cur));
    setPresetId(null);
  }

  /** Un solo gesto en el pin: si está en la ruta la quita, si no la añade.
   *  En móvil, además, deja la card abierta abajo (ahí sí hay que leerla). */
  function togglePin(id: string) {
    if (stops.includes(id)) {
      commit((s) => s.filter((x) => x !== id));
      setPresetId(null);
      setSelected(id);
    } else {
      addStop(id);
      setSelected(id);
    }
  }

  function toggleCat(cat: Category) {
    const next = new Set(cats);
    if (cats.size === 0) {
      // Estaban todas encendidas: el primer clic aísla la categoría tocada.
      next.clear();
      next.add(cat);
    } else if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setCats(next);
    // Si el pin abierto desaparece con el filtro, su card se va con él.
    const stillVisible = (id: string) =>
      next.size === 0 || next.has(DEST[id].category) || stops.includes(id);
    setHovered((cur) => (cur && !stillVisible(cur) ? null : cur));
    setSelected((cur) => (cur && !stillVisible(cur) ? null : cur));
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

  // "Guardar viaje": estampa el sello sobre la carta y pide el correo ahí
  // mismo. La sacudida de cámara y la háptica se programan aquí (no en un
  // efecto) para que solo el gesto del usuario las dispare — ?demo-sello
  // monta la carta ya estampada sin temblor. El delay coincide con el
  // instante de impacto del keyframe del cuño (38% de .66s ≈ 250 ms).
  function startSave() {
    setSave({ k: "form" });
    setSelected(null);
    setSheetOpen(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    quakeTimer.current = setTimeout(() => {
      const view = panelRef.current?.closest(".crd-journey-sticky");
      if (view) {
        view.classList.remove("mapa6-quake");
        // Reflow: sin esto, re-estampar no reinicia la animación.
        void (view as HTMLElement).offsetWidth;
        view.classList.add("mapa6-quake");
        quakeTimer.current = setTimeout(() => view.classList.remove("mapa6-quake"), 600);
      }
      navigator.vibrate?.([18, 40, 12]);
    }, 250);
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

  // Esc cierra la card del pin.
  useEffect(() => {
    if (!selected && !hovered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelected(null);
      setHovered(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, hovered]);

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
  // El filtro nunca esconde una parada ya elegida: se vería como si la ruta
  // se hubiera roto sola.
  const visibleDests = DESTINATIONS.filter(
    (d) => cats.size === 0 || cats.has(d.category) || stops.includes(d.id)
  );
  const totalKm = route?.km ?? 0;
  const totalMin = route?.min ?? 0;

  // ── Carta derecha / sheet móvil: el itinerario ─────────────────────────────

  const itinerary = (
    <>
      {/* Asa (solo móvil): se arrastra con el dedo o se toca */}
      <button
        type="button"
        onClick={handleTap}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        aria-expanded={sheetOpen}
        aria-label={sheetOpen ? "Contraer el panel de tu ruta" : "Expandir el panel de tu ruta"}
        className="flex h-8 w-full flex-none cursor-grab touch-none items-center justify-center border-0 bg-transparent p-0 active:cursor-grabbing min-[900px]:hidden"
      >
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-line-strong" />
      </button>

      <div className={sheetOpen ? "contents" : "max-[899px]:hidden min-[900px]:contents"}>
        {save.k === "idle" ? (
          <>
            <div className="flex-none px-[18px] pb-2 pt-4 max-[899px]:pt-0">
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
                      className="cursor-pointer border-0 bg-transparent p-0 font-label text-mini font-bold text-coral-ink"
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
                    // Sugerencia, no acción principal: píldora de tono, no
                    // relleno de selección. La calcomanía mint murió con la
                    // sombra de offset, no por contraste.
                    className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-mint-soft px-3 py-2 font-label text-tiny font-bold text-mint-ink"
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
                          className="grid size-[22px] flex-none place-items-center rounded-full bg-selected font-label text-mini font-bold text-on-selected"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-ink">{d.name}</div>
                          <div className="truncate text-micro text-muted">
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
                        <div className="ml-[10px] border-l-2 border-dashed border-mint py-1 pl-[19px] text-mini text-muted">
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
              {/* El wrapper relativo ancla la onda y las salpicaduras al punto
                  de contacto del cuño; overflow visible para que las gotas
                  vuelen fuera del círculo. */}
              <div className="relative">
                <div className="mapa6-stamp">
                  <StampCRD
                    size={160}
                    rotate={-8}
                    line1="RUTA GUARDADA"
                    // Las cifras van debajo, en texto legible: dentro del cuño
                    // no se leen y una línea larga choca con el arco del lema.
                    line2="· HECHO EN RD ·"
                    label={`Ruta guardada: ${stops.length} paradas, ${totalKm} kilómetros`}
                  />
                </div>
                <span aria-hidden="true" className="mapa6-ring" />
                {SPECKS.map((sp, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className="mapa6-speck"
                    style={{ "--dx": sp.dx, "--dy": sp.dy, width: sp.s, height: sp.s } as React.CSSProperties}
                  />
                ))}
              </div>
              {/* El cuño da el gesto; los datos hay que poder leerlos, y dentro
                  del anillo a este tamaño no se leen. */}
              <p
                className="mapa6-rise mt-1 font-display text-micro font-bold uppercase tracking-[.1em] text-muted"
                style={{ animationDelay: ".3s" }}
              >
                {stops.length} paradas · {totalKm} km · {fmtDurShort(totalMin)}
              </p>

              {save.k === "done" ? (
                <>
                  <h3 className="mapa6-rise mt-2 font-display text-[20px] font-bold leading-tight text-ink">
                    Va en camino
                  </h3>
                  <p className="mapa6-rise mt-1 text-tiny leading-[1.55] text-muted" style={{ animationDelay: ".07s" }}>
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
                  <h3
                    className="mapa6-rise mt-2 font-display text-[20px] font-bold leading-tight text-ink"
                    style={{ animationDelay: ".38s" }}
                  >
                    Tu ruta quedó <em className="crd-accent">estampada</em>
                  </h3>
                  <p className="mapa6-rise mt-1 text-tiny leading-[1.55] text-muted" style={{ animationDelay: ".45s" }}>
                    Déjanos tu correo y te la mandamos completa: cada parada con su
                    foto, qué hacer ahí y cuánto manejas de una a otra.
                  </p>
                  <form onSubmit={sendItinerary} className="mapa6-rise mt-3 w-full" style={{ animationDelay: ".52s" }}>
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
                        className="my-1 inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 rounded-full bg-selected px-3.5 font-label text-tiny font-bold text-on-selected transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-70"
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
                    className="mapa6-rise mt-2 cursor-pointer border-0 bg-transparent p-0 text-mini font-bold text-muted underline-offset-2 hover:underline"
                    style={{ animationDelay: ".58s" }}
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
              <div className="font-display text-lg font-bold leading-tight text-ink">
                {stops.length}
              </div>
              <div className="text-micro font-semibold uppercase tracking-wide text-muted">
                {stops.length === 1 ? "parada" : "paradas"}
              </div>
            </div>
            <div className="border-l border-line px-2 py-2.5 text-center">
              <div className="font-display text-lg font-bold leading-tight text-ink">
                {totalKm} km
              </div>
              <div className="text-micro font-semibold uppercase tracking-wide text-muted">
                por carretera
              </div>
            </div>
            <div className="border-l border-line px-2 py-2.5 text-center">
              <div className="font-display text-lg font-bold leading-tight text-ink">
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
                // "Guardar viaje" es 48 de alto: por debajo de 19 w700 el
                // relleno del sistema es `selected`, no el acento.
                className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-selected font-label text-tiny font-bold text-on-selected transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
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
        visibleDests.map((d) => (
          <DestinationPin
            key={d.id}
            d={d}
            stopIndex={stops.indexOf(d.id)}
            stops={stops}
            isHovered={hovered === d.id}
            isSelected={selected === d.id}
            onToggle={() => togglePin(d.id)}
            onHover={() => setHovered(d.id)}
            onLeave={() => setHovered((cur) => (cur === d.id ? null : cur))}
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
        {/* Filtro por categoría: abajo al centro en desktop, arriba bajo el nav
            en móvil (abajo vive el sheet del itinerario). */}
        <CategoryFilter cats={cats} onToggle={toggleCat} />

        {/* Carta izquierda: la intro + los viajes recomendados (solo desktop;
            en móvil ambos viven dentro del sheet del itinerario). */}
        <div
          className={`${PANEL_GLASS} pointer-events-auto absolute left-[clamp(16px,3%,40px)] top-1/2 w-[260px] -translate-y-1/2 rounded-surface px-4 py-4 shadow-e1 max-[899px]:hidden`}
        >
          <h2 className="m-0 font-display text-[20px] font-bold leading-tight tracking-[-.02em] text-ink">
            Arma tu <em className="crd-accent">itinerario</em>
          </h2>
          <p className="mt-1 text-tiny leading-[1.5] text-muted">
            Pasa el cursor por un pin para ver el lugar; un clic lo vuelve
            parada, con km y tiempo de carretera de verdad. O empieza con un
            viaje recomendado:
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
          ref={panelRef}
          aria-label="Tu itinerario"
          className={`${PANEL_SOLID} pointer-events-auto absolute right-[clamp(16px,3%,40px)] top-1/2 flex max-h-[70vh] w-[316px] -translate-y-1/2 flex-col overflow-hidden rounded-surface shadow-e1 max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:max-h-[70dvh] max-[899px]:w-auto max-[899px]:translate-y-0 max-[899px]:rounded-b-none max-[899px]:pb-[var(--crd-stepper-h)] ${
            sel ? "max-[899px]:hidden" : ""
          } ${stamped ? "mapa6-kick" : ""} ${dragging ? "" : "max-[899px]:transition-transform max-[899px]:duration-300 max-[899px]:ease-out"}`}
          style={dragY !== 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          {itinerary}
        </section>

        {/* Móvil: la mini-card del pin es un sheet pequeño anclado abajo */}
        {sel && (
          <div
            role="dialog"
            aria-label={sel.name}
            className={`${PANEL_SOLID} pointer-events-auto absolute inset-x-3 bottom-[calc(var(--crd-stepper-h)+12px)] z-30 animate-slide-up rounded-surface p-3 shadow-e1 motion-reduce:animate-none min-[900px]:hidden`}
          >
            <div className="flex gap-3">
              <div className="relative size-[92px] flex-none overflow-hidden rounded-chip bg-cream-2">
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
            {/* El sheet del itinerario queda oculto mientras esta card está
                abierta — "Ordena mejor" tiene que vivir también aquí o el
                usuario nunca lo ve tras añadir una parada (audit móvil). */}
            {showOptimize && (
              <button
                type="button"
                onClick={optimize}
                className="mt-2 flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-mint-soft px-3 py-2 font-label text-tiny font-bold text-mint-ink"
              >
                <Glyph d={GLYPH_SORT} className="text-sm" />
                Ordena mejor · te ahorras {saveKm} km
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
