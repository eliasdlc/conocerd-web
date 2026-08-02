"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 4 — "El mapa manda".
//
//  Cero paneles laterales: toda la interacción vive sobre el mapa. Tocar un
//  pin abre una mini-card anclada al pin (foto, rating, actividades, botón
//  "Añadir parada"); la ruta se dibuja al instante por carreteras reales
//  (src/data/routes/pairs.json) con paradas numeradas sobre los pines. Un HUD
//  glass abajo-centro resume "N paradas · X km · Y h" con deshacer/limpiar y
//  despliega la lista compacta para reordenar. Filtros de categoría como fila
//  de chips flotantes arriba-izquierda.
//
//  Móvil (≤899px): mismo modelo de manipulación directa — la mini-card se
//  ancla abajo como sheet pequeño y el HUD ocupa el ancho disponible.
//
//  Params de demo para capturas (no afectan el uso normal):
//    ?demo-ruta=1            → precarga una ruta de 4 paradas
//    ?demo-ruta=id1,id2,...  → precarga esos destinos
//    ?demo-card=<id>         → abre la mini-card de ese destino
//    ?demo-hud=1             → abre la lista del HUD
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin, PIN_CHROME } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORIES,
  CATEGORY_META,
  type Category,
  type Destination,
} from "@/data/destinations";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";
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

function fmtDur(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// ─── Demo por URL (solo capturas; el registro monta esto con ssr:false) ──────

const DEMO_ROUTE = ["aguilas", "barahona", "constanza", "charcos"];

function readDemo(): { stops: string[]; card: string | null; hud: boolean } {
  if (typeof window === "undefined") return { stops: [], card: null, hud: false };
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
      hud: p.has("demo-hud"),
    };
  } catch {
    return { stops: [], card: null, hud: false };
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
const GLYPH_TRASH =
  "M3.5 6.5h17M18.5 6.5V19a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V6.5M8.5 6.5V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M10 11v6M14 11v6";

// ─── Parada numerada (reemplaza al pin de categoría cuando entra a la ruta) ──

function StopDisc({ n, size = 30 }: { n: number; size?: number }) {
  return (
    <span
      className={`grid place-items-center rounded-full bg-ink font-mono font-bold text-white ${PIN_CHROME}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {n}
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
          Parada {stopIndex + 1} de {stops.length}
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
                <StopDisc n={stopIndex + 1} />
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

// ─── Lista compacta del HUD (reordenar / quitar) ─────────────────────────────

function HudList({
  stops,
  km,
  min,
  onMove,
  onRemove,
}: {
  stops: string[];
  km: number;
  min: number;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Paradas de tu ruta"
      className={`${PANEL_SOLID} w-[312px] max-w-full animate-slide-up rounded-panel p-3 shadow-modal motion-reduce:animate-none`}
    >
      <div className="mb-2 flex items-baseline justify-between px-1">
        <span className="text-tiny font-bold text-ink">Orden de paradas</span>
        {stops.length >= 2 && (
          <span className="font-mono text-micro text-muted">
            {km} km · {fmtDur(min)}
          </span>
        )}
      </div>
      <ol className="m-0 flex max-h-[36vh] list-none flex-col gap-1 overflow-y-auto p-0">
        {stops.map((id, i) => {
          const d = DEST[id];
          return (
            <li key={id} className="flex items-center gap-2 rounded-chip bg-cream-2 px-2 py-1.5">
              <StopDisc n={i + 1} size={20} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-ink">{d.name}</div>
                <div className="font-mono text-micro text-muted">{d.province}</div>
              </div>
              <div className="flex gap-0.5">
                <ListBtn
                  label={`Adelantar ${d.name}`}
                  disabled={i === 0}
                  onClick={() => onMove(id, -1)}
                >
                  <Icon name="arrow_upward" className="text-sm" />
                </ListBtn>
                <ListBtn
                  label={`Atrasar ${d.name}`}
                  disabled={i === stops.length - 1}
                  onClick={() => onMove(id, 1)}
                >
                  <Icon name="arrow_downward" className="text-sm" />
                </ListBtn>
                <ListBtn label={`Quitar ${d.name} de la ruta`} onClick={() => onRemove(id)}>
                  <Icon name="close" className="text-sm" />
                </ListBtn>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ListBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-line bg-white p-0 text-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-default disabled:opacity-40 max-[899px]:size-11"
    >
      {children}
    </button>
  );
}

// ─── Variante ────────────────────────────────────────────────────────────────

type RouteState = { stops: string[]; history: string[][] };

export default function MapaMandaOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [cats, setCats] = useState<Set<Category>>(new Set(CATEGORIES));
  const [{ stops, history }, setRoute] = useState<RouteState>({
    stops: DEMO.stops,
    history: [],
  });
  const [selected, setSelected] = useState<string | null>(DEMO.card);
  const [hudOpen, setHudOpen] = useState(DEMO.hud && DEMO.stops.length > 0);

  // Cada mutación de la ruta guarda el estado anterior para "deshacer".
  function commit(fn: (prev: string[]) => string[]) {
    setRoute((s) => {
      const next = fn(s.stops);
      if (next === s.stops) return s;
      return { stops: next, history: [...s.history.slice(-19), s.stops] };
    });
  }

  const undo = () =>
    setRoute((s) =>
      s.history.length === 0
        ? s
        : { stops: s.history[s.history.length - 1], history: s.history.slice(0, -1) }
    );

  function addStop(id: string) {
    commit((s) => (s.includes(id) ? s : [...s, id]));
    setSelected(null); // feedback inmediato: el pin se numera y la ruta se traza
  }
  function removeStop(id: string) {
    commit((s) => (s.includes(id) ? s.filter((x) => x !== id) : s));
    setSelected((cur) => (cur === id ? null : cur));
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
  }
  function clearRoute() {
    commit(() => []);
    setHudOpen(false);
  }

  function toggleCat(cat: Category) {
    // Si el pin seleccionado va a desaparecer con el filtro, cierra su card.
    const sel = selected ? DEST[selected] : null;
    if (cats.has(cat) && cats.size > 1 && sel && sel.category === cat && !stops.includes(sel.id)) {
      setSelected(null);
    }
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat) && next.size > 1) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Esc cierra card o lista del HUD (lo primero que esté abierto).
  useEffect(() => {
    if (!selected && !hudOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelected(null);
      setHudOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, hudOpen]);

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
  const visibleDests = DESTINATIONS.filter(
    (d) => cats.has(d.category) || stops.includes(d.id)
  );

  const summary =
    stops.length === 0
      ? null
      : stops.length === 1
        ? "1 parada · elige la siguiente"
        : `${stops.length} paradas · ${route?.km ?? 0} km · ${fmtDur(route?.min ?? 0)}`;

  return (
    <>
      {/* Ruta con casing blanco debajo (se lee como carretera, no como trazo) */}
      {isVisible && route && (
        <>
          <MapRoute id="v4-ruta-casing" coordinates={route.coords} color="#FFFFFF" width={7.5} opacity={0.95} />
          <MapRoute id="v4-ruta" coordinates={route.coords} color="#FF8D16" width={4} opacity={0.95} />
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
        {/* Identidad de escena + filtros: fila flotante arriba-izquierda */}
        <div className="absolute left-[clamp(14px,3%,40px)] top-[clamp(18px,3.5%,36px)] flex max-w-[min(560px,calc(100%-28px))] flex-col gap-2.5 max-[899px]:left-3 max-[899px]:right-0 max-[899px]:top-[70px] max-[899px]:max-w-none">
          <div className={`${PANEL_GLASS} pointer-events-auto w-fit rounded-panel px-4 py-2.5 shadow-card max-[899px]:px-3 max-[899px]:py-2`}>
            <Kicker icon="route" index="02">Tu ruta</Kicker>
            <h3 className="mt-1 font-display text-[21px] font-semibold leading-none text-ink max-[899px]:text-[20px]">
              Arma tu <em className="crd-accent">recorrido</em>
            </h3>
          </div>
          {/* Móvil: una sola fila deslizable — dos filas de chips tapaban la isla */}
          <div
            className="pointer-events-auto flex flex-wrap gap-1.5 max-[899px]:flex-nowrap max-[899px]:overflow-x-auto max-[899px]:pb-1 max-[899px]:pr-3 max-[899px]:[scrollbar-width:none]"
            role="group"
            aria-label="Filtrar destinos por categoría"
          >
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = cats.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  aria-pressed={isActive}
                  className="inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 text-tiny font-bold shadow-card backdrop-blur-[12px] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 max-[899px]:h-11"
                  style={{
                    borderColor: isActive ? meta.color : "var(--color-line)",
                    background: isActive
                      ? `linear-gradient(0deg, ${meta.color}24, ${meta.color}24), #FFFFFF`
                      : "rgba(253,248,240,.9)",
                    color: isActive ? meta.ink : "var(--color-muted)",
                  }}
                >
                  <Icon name={meta.icon} className="text-sm" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* HUD abajo-centro: resumen + deshacer + limpiar + lista desplegable */}
        <div
          className={`pointer-events-auto absolute bottom-[clamp(18px,4%,44px)] left-1/2 z-20 flex w-max max-w-[min(480px,calc(100%-24px))] -translate-x-1/2 flex-col items-center gap-2 max-[899px]:w-[calc(100%-24px)] ${
            sel ? "max-[899px]:hidden" : ""
          }`}
        >
          {hudOpen && stops.length > 0 && (
            <HudList
              stops={stops}
              km={route?.km ?? 0}
              min={route?.min ?? 0}
              onMove={moveStop}
              onRemove={removeStop}
            />
          )}
          <div
            className={`${PANEL_GLASS} flex h-[52px] items-center gap-1 rounded-full pl-2 pr-2 shadow-panel max-[899px]:w-full max-[899px]:justify-center`}
          >
            {stops.length === 0 ? (
              <span className="flex items-center gap-2 px-3 text-tiny font-bold text-ink">
                <Icon name="explore" className="text-base text-mango-ink" />
                Toca un pin del mapa y arma tu ruta
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setHudOpen((v) => !v)}
                aria-expanded={hudOpen}
                aria-label={hudOpen ? "Ocultar paradas de la ruta" : "Ver y reordenar las paradas de la ruta"}
                className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-full px-3 transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-ink"
              >
                <Icon name="route" className="flex-none text-base text-mango-ink" />
                <span aria-live="polite" className="truncate font-mono text-tiny font-bold text-ink">
                  {summary}
                </span>
                <Icon
                  name="arrow_upward"
                  className={`flex-none text-sm text-muted transition-transform duration-200 ${hudOpen ? "rotate-180" : ""}`}
                />
              </button>
            )}
            {(history.length > 0 || stops.length > 0) && <span className="h-6 w-px flex-none bg-line" aria-hidden="true" />}
            {history.length > 0 && (
              <button
                type="button"
                onClick={undo}
                aria-label="Deshacer el último cambio de la ruta"
                title="Deshacer"
                className="grid size-9 flex-none cursor-pointer place-items-center rounded-full text-ink transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-ink max-[899px]:size-11"
              >
                <Glyph d={GLYPH_UNDO} className="text-base" />
              </button>
            )}
            {stops.length > 0 && (
              <button
                type="button"
                onClick={clearRoute}
                aria-label="Limpiar toda la ruta"
                title="Limpiar ruta"
                className="grid size-9 flex-none cursor-pointer place-items-center rounded-full text-coral-ink transition-colors hover:bg-coral-soft focus-visible:ring-2 focus-visible:ring-ink max-[899px]:size-11"
              >
                <Glyph d={GLYPH_TRASH} className="text-base" />
              </button>
            )}
          </div>
        </div>

        {/* Móvil: la mini-card es un sheet pequeño anclado abajo */}
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
