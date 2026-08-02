"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin, GoalFlag } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORY_META,
  type Destination,
} from "@/data/destinations";
import { PANEL_GLASS } from "@/lib/surfaces";
import pairs from "@/data/routes/pairs.json";

// ─────────────────────────────────────────────────────────────────────────────
//  VARIANTE 2 — "Rutas curadas primero"
//
//  Resuelve el "no sé por dónde empezar": tres rutas listas para usar como
//  cartas grandes con foto. Tocar una carga la ruta completa —polilínea por
//  carretera real (pairs.json/OSRM), paradas numeradas y totales veraces— y
//  desde ahí se edita tocando pines. Al añadir, la parada se inserta en el
//  tramo que menos desvía (mejor inserción por km reales), para que la ruta
//  siga teniendo sentido sin que el usuario reordene nada.
//
//  Desktop: cartas a la izquierda, panel compacto de edición a la derecha.
//  Móvil: cartas en fila scrolleable arriba + bottom-sheet (crd-ol-panel).
// ─────────────────────────────────────────────────────────────────────────────

const PANEL = `${PANEL_GLASS} rounded-panel`;

// ─── Datos de carretera (pairs.json) ─────────────────────────────────────────

const IDX: Record<string, number> = Object.fromEntries(
  pairs.ids.map((id, i) => [id, i])
);
const LEGS = pairs.legs as Record<string, number[][]>;

function segKm(a: string, b: string): number {
  return pairs.km[IDX[a]][IDX[b]];
}
function segMin(a: string, b: string): number {
  return pairs.min[IDX[a]][IDX[b]];
}

/** Geometría por carretera entre dos destinos (invierte la clave si hace falta). */
function legLine(a: string, b: string): [number, number][] | null {
  const key = IDX[a] < IDX[b] ? `${a}|${b}` : `${b}|${a}`;
  const raw = LEGS[key];
  if (!raw) return null;
  const pts = raw.map((p) => [p[0], p[1]] as [number, number]);
  return IDX[a] < IDX[b] ? pts : [...pts].reverse();
}

function totalsFor(stops: string[]): { km: number; min: number } {
  let km = 0;
  let min = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    km += segKm(stops[i], stops[i + 1]);
    min += segMin(stops[i], stops[i + 1]);
  }
  return { km: Math.round(km), min: Math.round(min) };
}

function formatDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ─── Rutas curadas ────────────────────────────────────────────────────────────

type Preset = {
  id: string;
  name: string;
  tagline: string;
  /** id del destino cuya foto ilustra la carta */
  cover: string;
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

const DEST_BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));

// ─── Pin del mapa ─────────────────────────────────────────────────────────────

function StopPin({
  d,
  order,
  isLast,
  onToggle,
}: {
  d: Destination;
  /** 1-based si está en la ruta, 0 si no. */
  order: number;
  isLast: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inRoute = order > 0;

  return (
    <MapMarker longitude={d.coords[0]} latitude={d.coords[1]}>
      <MarkerContent>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className={`relative ${hover ? "z-40" : ""}`}
        >
          <button
            type="button"
            aria-label={
              inRoute
                ? `Quitar ${d.name} de la ruta (parada ${order})`
                : `Añadir ${d.name} a la ruta`
            }
            aria-pressed={inRoute}
            onClick={onToggle}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink"
          >
            <span
              className={`grid place-items-center transition-[opacity,transform] duration-200 ${
                inRoute ? "" : "opacity-80"
              } ${hover ? "scale-110 opacity-100" : ""}`}
            >
              {inRoute && isLast ? (
                <GoalFlag size={34} />
              ) : (
                <CategoryPin
                  category={d.category}
                  state={inRoute ? "done" : "default"}
                  size={inRoute ? 30 : 24}
                />
              )}
            </span>

            {inRoute && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-1 h-[17px] min-w-[17px] rounded-full border border-cream bg-ink px-[3px] text-center text-micro font-bold leading-[15px] text-white"
              >
                {order}
              </span>
            )}
          </button>

          {hover && (
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-white/95 px-2.5 py-1 shadow-card">
              <span className="text-mini font-bold text-ink">{d.name}</span>
              <span
                className={`ml-1.5 text-micro font-bold ${
                  inRoute ? "text-coral-ink" : "text-mango-ink"
                }`}
              >
                {inRoute ? "Quitar" : "+ Añadir"}
              </span>
            </div>
          )}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Carta de ruta curada ─────────────────────────────────────────────────────

function PresetCard({
  preset,
  active,
  compact,
  onSelect,
}: {
  preset: Preset;
  active: boolean;
  /** Versión chip para la fila scrolleable de móvil. */
  compact?: boolean;
  onSelect: () => void;
}) {
  const t = totalsFor(preset.stops);
  const cover = DEST_BY_ID.get(preset.cover);
  const data = `${preset.stops.length} paradas · ${t.km} km · ${formatDur(t.min)}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Cargar la ruta ${preset.name}: ${data} de manejo`}
      className={`flex cursor-pointer items-center gap-3 rounded-card border-[1.5px] text-left outline-offset-2 transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-mango-ink ${
        active
          ? "border-mango bg-mango-soft shadow-card"
          : "border-line bg-white hover:border-mango/60"
      } ${compact ? "w-[270px] flex-none p-2" : "w-full p-2.5"}`}
    >
      <span
        className={`relative flex-none overflow-hidden rounded-tile bg-cream-2 ${
          compact ? "size-11" : "size-14"
        }`}
      >
        {cover && (
          <Image
            src={cover.image}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate font-bold text-ink ${compact ? "text-tiny" : "text-copy"}`}>
            {preset.name}
          </span>
          {active && (
            <Icon name="check_circle" className="flex-none text-sm text-mango-ink" />
          )}
        </span>
        {!compact && (
          <span className="mt-0.5 block truncate text-mini text-muted">{preset.tagline}</span>
        )}
        <span className="mt-0.5 block whitespace-nowrap font-mono text-micro font-bold text-mint-ink">
          {data}
        </span>
      </span>
    </button>
  );
}

// ─── Panel compacto de edición ────────────────────────────────────────────────

function EditPanel({
  visible,
  title,
  edited,
  stops,
  onRemove,
}: {
  visible: boolean;
  title: string;
  edited: boolean;
  stops: Destination[];
  onRemove: (id: string) => void;
}) {
  const t = totalsFor(stops.map((s) => s.id));

  const hint =
    stops.length === 0
      ? "Toca cualquier pin del mapa para tu primera parada."
      : stops.length === 1
        ? "Suma otra parada y verás la ruta por carretera."
        : "Toca un pin para sumar una parada: la acomodamos en el tramo que menos desvía.";

  return (
    <div
      className={`crd-ol-panel ${PANEL} absolute right-[clamp(16px,3%,40px)] top-1/2 flex max-h-[70vh] w-[276px] -translate-y-1/2 flex-col px-[18px] py-4 shadow-panel ${
        visible ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="text-copy font-bold text-ink">{title}</h3>
        {edited && (
          <span className="rounded-full bg-mango-soft px-2 py-px font-mono text-micro font-bold uppercase tracking-[.08em] text-mango-ink">
            editada
          </span>
        )}
      </div>

      {stops.length >= 2 && (
        <div className="mt-1 font-mono text-tiny font-bold text-ink">
          {t.km} km · {formatDur(t.min)}{" "}
          <span className="font-semibold text-muted">de manejo, por carretera</span>
        </div>
      )}

      {stops.length > 0 && (
        <ol className="my-3 flex list-none flex-col gap-1.5 overflow-y-auto p-0">
          {stops.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-chip bg-white px-2 py-1.5"
            >
              <span
                className="size-[18px] flex-none rounded-full text-center text-micro font-bold leading-[18px] text-white"
                style={{ background: CATEGORY_META[s.category].color }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-ink">{s.name}</span>
                <span className="block font-mono text-micro text-muted">{s.province}</span>
              </span>
              <button
                type="button"
                aria-label={`Quitar ${s.name} de la ruta`}
                onClick={() => onRemove(s.id)}
                className="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border border-line bg-white p-0 text-muted outline-offset-1 transition-colors duration-150 hover:border-coral hover:text-coral-ink focus-visible:outline-2 focus-visible:outline-coral-ink"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className={`text-mini leading-[1.5] text-muted ${stops.length > 0 ? "border-t border-line pt-2.5" : "mt-2"}`}>
        {hint}
      </p>
    </div>
  );
}

// ─── Variante ─────────────────────────────────────────────────────────────────

export default function MapaRutasCuradas() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  // Estado demostrativo: entra con "Sur salvaje" cargada — el visitante ve de
  // una vez qué es una ruta útil (polilínea real + paradas + totales).
  const [presetId, setPresetId] = useState<string | null>(PRESETS[0].id);
  const [stops, setStops] = useState<string[]>(PRESETS[0].stops);
  const [edited, setEdited] = useState(false);

  const preset = PRESETS.find((p) => p.id === presetId) ?? null;

  function selectPreset(p: Preset) {
    setPresetId(p.id);
    setStops(p.stops);
    setEdited(false);
  }

  function startFromScratch() {
    setPresetId(null);
    setStops([]);
    setEdited(false);
  }

  function toggleStop(id: string) {
    setStops((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      // Mejor inserción: el hueco donde la parada añade menos km reales.
      let best = prev.length;
      let bestDelta = Infinity;
      for (let pos = 0; pos <= prev.length; pos++) {
        const before = pos > 0 ? prev[pos - 1] : null;
        const after = pos < prev.length ? prev[pos] : null;
        const delta =
          (before ? segKm(before, id) : 0) +
          (after ? segKm(id, after) : 0) -
          (before && after ? segKm(before, after) : 0);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = pos;
        }
      }
      const next = [...prev];
      next.splice(best, 0, id);
      return next;
    });
    setEdited(true);
  }

  const stopDests = stops
    .map((id) => DEST_BY_ID.get(id))
    .filter((d): d is Destination => Boolean(d));

  // Polilínea por carretera: concatena los tramos OSRM entre paradas seguidas.
  const lineCoords = useMemo(() => {
    if (stops.length < 2) return null;
    const coords: [number, number][] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const leg = legLine(stops[i], stops[i + 1]);
      if (leg) coords.push(...leg);
    }
    return coords.length >= 2 ? coords : null;
  }, [stops]);

  const editTitle = preset ? preset.name : "Tu ruta";

  return (
    <>
      {isVisible && lineCoords && (
        <MapRoute
          id="v2-ruta-carretera"
          coordinates={lineCoords}
          color="#FF8D16"
          width={4}
          opacity={0.92}
        />
      )}

      {isVisible &&
        DESTINATIONS.map((d) => {
          const order = stops.indexOf(d.id) + 1;
          return (
            <StopPin
              key={d.id}
              d={d}
              order={order}
              isLast={order === stops.length && stops.length > 1}
              onToggle={() => toggleStop(d.id)}
            />
          );
        })}

      {/* Capa de UI: pointer-events-none para no bloquear los pines; cada
          panel los reactiva por su cuenta. */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Desktop: cartas de rutas curadas, columna izquierda */}
        <div
          className={`${PANEL} absolute left-[clamp(16px,3%,40px)] top-1/2 hidden w-[332px] -translate-y-1/2 px-4 py-[18px] shadow-panel min-[900px]:block ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <Kicker icon="route" index="02" className="mb-2">
            Tu ruta
          </Kicker>
          <h2 className="font-display text-[21px] font-semibold leading-[1.15] text-ink">
            Empieza con una <em className="crd-accent">ruta hecha</em>
          </h2>
          <p className="mb-3.5 mt-1.5 text-tiny leading-[1.5] text-muted">
            Tres recorridos listos, con km y horas de manejo reales. Cárgalo y
            ajústalo a tu gusto.
          </p>

          <div className="flex flex-col gap-2" role="group" aria-label="Rutas curadas">
            {PRESETS.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                active={presetId === p.id && !edited}
                onSelect={() => selectPreset(p)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={startFromScratch}
            aria-pressed={presetId === null}
            className={`mt-3 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 text-tiny font-bold outline-offset-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ink ${
              presetId === null
                ? "border-ink bg-ink text-cream"
                : "border-ink/50 bg-transparent text-ink hover:border-ink"
            }`}
          >
            <Icon name="explore" className="text-sm" />
            Empezar de cero
          </button>
        </div>

        {/* Móvil: fila scrolleable de cartas arriba */}
        {/* top-[78px]: deja libre el header fijo de la página en móvil */}
        <div className="absolute inset-x-0 top-[78px] min-[900px]:hidden">
          <div className="px-3">
            <span className={`${PANEL_GLASS} inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-micro font-bold uppercase tracking-[.12em] text-mint-ink`}>
              <Icon name="route" className="text-sm" />
              Rutas listas para usar
            </span>
          </div>
          <div
            className={`mt-1.5 flex gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] ${
              isVisible ? "pointer-events-auto" : "pointer-events-none"
            }`}
            role="group"
            aria-label="Rutas curadas"
          >
            {PRESETS.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                compact
                active={presetId === p.id && !edited}
                onSelect={() => selectPreset(p)}
              />
            ))}
            <button
              type="button"
              onClick={startFromScratch}
              aria-pressed={presetId === null}
              className={`flex min-h-[44px] w-[136px] flex-none cursor-pointer items-center justify-center gap-1.5 rounded-card border-[1.5px] px-3 text-tiny font-bold outline-offset-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-ink ${
                presetId === null
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/50 bg-white text-ink"
              }`}
            >
              <Icon name="explore" className="text-sm" />
              De cero
            </button>
          </div>
        </div>

        {/* Panel de edición: derecha en desktop, bottom-sheet en móvil */}
        <EditPanel
          visible={isVisible}
          title={editTitle}
          edited={edited}
          stops={stopDests}
          onRemove={(id) => toggleStop(id)}
        />
      </div>
    </>
  );
}
