"use client";

import { useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin, SelfPin, GoalFlag } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORIES,
  CATEGORY_META,
  type Category,
  type Destination,
} from "@/data/destinations";
import { pathLengthKm, type LngLat } from "@/lib/geo";

// ─────────────────────────────────────────────────────────────────────────────
//  "Arma tu recorrido" (#8/#9): pines de categoría con card hover (con punta),
//  y constructor de ruta de alcance medio (agregar/quitar/reordenar paradas +
//  polilínea + resumen). Datos de la fuente de verdad única.
//
//  Los colores por categoría (meta.color / meta.ink) vienen de los datos, así
//  que esos siguen inline; todo lo demás es Tailwind.
// ─────────────────────────────────────────────────────────────────────────────

// Chrome compartido por los dos paneles flotantes de la escena.
const PANEL =
  "border border-line bg-cream/92 backdrop-blur-[16px] rounded-[20px]";

// ─── Card hover con punta (#8) ────────────────────────────────────────────────

function HoverCard({ d }: { d: Destination }) {
  const meta = CATEGORY_META[d.category];
  return (
    <div className="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-50 w-[220px] -translate-x-1/2 overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_12px_32px_rgba(38,70,83,0.22)]">
      <div className="relative h-[104px] w-full bg-cream-2">
        <Image src={d.image} alt={d.name} fill sizes="220px" className="object-cover" />
        <span
          className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2 py-[3px] font-display text-[10.5px] font-bold"
          style={{ color: meta.ink }}
        >
          <Icon name={meta.icon} className="text-[13px]" />
          {meta.label}
        </span>
      </div>
      <div className="px-3 pb-3 pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-display text-sm font-extrabold text-ink">{d.name}</div>
          <div className="whitespace-nowrap font-display text-xs font-extrabold text-mango-ink">
            ★ {d.rating.toFixed(1)}
          </div>
        </div>
        <div className="mt-0.5 font-mono text-[10.5px] text-muted">{d.province}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {d.activities.map((a) => (
            <span
              key={a}
              className="rounded-md bg-cream-2 px-[7px] py-0.5 font-display text-[10px] font-semibold text-muted"
            >
              {a}
            </span>
          ))}
        </div>
      </div>
      {/* Punta (tail) apuntando al pin */}
      <div className="absolute left-1/2 top-full size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-line bg-white" />
    </div>
  );
}

// ─── Pin individual (hover + click para agregar/quitar de la ruta) ────────────

function PinMarker({
  d,
  routeIndex,
  routeLen,
  onToggle,
}: {
  d: Destination;
  routeIndex: number; // -1 si no está en la ruta
  routeLen: number;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inRoute = routeIndex >= 0;
  const isStart = inRoute && routeIndex === 0;
  const isGoal = inRoute && routeLen > 1 && routeIndex === routeLen - 1;

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
            aria-label={`${inRoute ? "Quitar" : "Agregar"} ${d.name} ${inRoute ? "de" : "a"} tu recorrido`}
            aria-pressed={inRoute}
            onClick={onToggle}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            className="grid size-11 cursor-pointer place-items-center border-0 bg-transparent p-0"
          >
            {isStart ? (
              <SelfPin heading={0} size={34} />
            ) : isGoal ? (
              <GoalFlag size={36} />
            ) : (
              <CategoryPin category={d.category} state={inRoute ? "done" : "default"} size={30} />
            )}

            {/* Badge de orden para paradas intermedias */}
            {inRoute && !isStart && !isGoal && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-ink px-1 text-center font-display text-[10px] font-extrabold leading-4 text-white"
              >
                {routeIndex + 1}
              </span>
            )}
          </button>

          {hover && <HoverCard d={d} />}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Panel del recorrido (#9) ─────────────────────────────────────────────────

function RoutePanel({
  stops,
  onRemove,
  onMove,
  onClear,
}: {
  stops: Destination[];
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onClear: () => void;
}) {
  const coords: LngLat[] = stops.map((s) => s.coords);
  const km = stops.length >= 2 ? Math.round(pathLengthKm(coords)) : 0;

  return (
    <div
      className={`${PANEL} absolute right-[clamp(16px,3%,40px)] top-1/2 flex max-h-[70vh] w-[264px] -translate-y-1/2 flex-col px-[18px] py-4 shadow-[0_8px_32px_rgba(38,70,83,0.12)]`}
    >
      <div className="flex items-center justify-between">
        <div className="font-display text-[13px] font-extrabold text-ink">Tu recorrido</div>
        {stops.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer border-none bg-transparent font-display text-[11px] font-bold text-coral-ink"
          >
            Limpiar
          </button>
        )}
      </div>

      {stops.length === 0 ? (
        <p className="mb-0.5 mt-3 text-[12.5px] leading-[1.5] text-muted">
          Toca los pines del mapa para armar tu ruta. Reordena las paradas y mira la distancia total.
        </p>
      ) : (
        <>
          <div className="my-3 flex flex-col gap-1.5 overflow-y-auto">
            {stops.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-[10px] bg-white px-2 py-1.5">
                <span
                  className="size-[18px] flex-none rounded-full text-center font-display text-[10px] font-extrabold leading-[18px] text-white"
                  style={{ background: CATEGORY_META[s.category].color }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xs font-bold text-ink">{s.name}</div>
                  <div className="font-mono text-[9.5px] text-muted">{s.province}</div>
                </div>
                <div className="flex gap-0.5">
                  <IconBtn name="arrow_upward" label="Subir" disabled={i === 0} onClick={() => onMove(s.id, -1)} />
                  <IconBtn name="arrow_downward" label="Bajar" disabled={i === stops.length - 1} onClick={() => onMove(s.id, 1)} />
                  <IconBtn name="close" label="Quitar" onClick={() => onRemove(s.id)} />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-2.5 font-display text-xs font-bold text-ink">
            {stops.length} {stops.length === 1 ? "parada" : "paradas"}
            {km > 0 && <span className="font-semibold text-muted"> · ~{km} km</span>}
          </div>
        </>
      )}
    </div>
  );
}

function IconBtn({
  name,
  label,
  onClick,
  disabled,
}: {
  name: IconName;
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
      className="inline-flex size-8 items-center justify-center rounded-md border border-line bg-white p-0 text-muted disabled:cursor-default disabled:opacity-40"
    >
      <Icon name={name} className="text-sm" />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapaOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(CATEGORIES)
  );
  const [route, setRoute] = useState<string[]>([]);

  function toggleCategory(id: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStop(id: string) {
    setRoute((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function moveStop(id: string, dir: -1 | 1) {
    setRoute((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const stops = route
    .map((id) => DESTINATIONS.find((d) => d.id === id))
    .filter((d): d is Destination => Boolean(d));
  const routeCoords: LngLat[] = stops.map((s) => s.coords);

  return (
    <>
      {/* Polilínea del recorrido */}
      {isVisible && routeCoords.length >= 2 && (
        <MapRoute id="route-builder" coordinates={routeCoords} color="#FF8D16" width={3.5} opacity={0.95} dashArray={[1, 1.6]} />
      )}

      {/* Pines de categoría */}
      {isVisible &&
        DESTINATIONS.filter((d) => activeCategories.has(d.category)).map((d) => (
          <PinMarker
            key={d.id}
            d={d}
            routeIndex={route.indexOf(d.id)}
            routeLen={route.length}
            onToggle={() => toggleStop(d.id)}
          />
        ))}

      {/* Capa de UI — pointer-events-none: cada panel los reactiva, para no
          bloquear los pines (MapMarkers) del mapa. */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Filtro de categorías (abajo-izq → bottom-sheet en móvil) */}
        <div
          className={`crd-ol-panel ${PANEL} absolute bottom-[clamp(24px,4%,48px)] left-[clamp(16px,3%,40px)] min-w-[240px] px-5 py-[18px] shadow-[0_8px_32px_rgba(38,70,83,0.10)] ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="mb-3.5 font-display text-[13px] font-extrabold text-ink">Arma tu recorrido</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = activeCategories.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-[5px] rounded-full border-[1.5px] px-3 py-1.5 font-display text-[12.5px] font-bold transition-[border-color,background-color,color] duration-200"
                  style={{
                    borderColor: isActive ? meta.color : "var(--color-line)",
                    background: isActive ? `${meta.color}1A` : "transparent",
                    color: isActive ? meta.ink : "var(--color-muted)",
                  }}
                  aria-pressed={isActive}
                >
                  <Icon name={meta.icon} className="text-sm" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel del recorrido (der) — oculto en móvil, disponible en desktop */}
        <div className={`crd-mapa-route-panel ${isVisible ? "pointer-events-auto" : "pointer-events-none"}`}>
          <RoutePanel
            stops={stops}
            onRemove={(id) => toggleStop(id)}
            onMove={moveStop}
            onClear={() => setRoute([])}
          />
        </div>
      </div>
    </>
  );
}
