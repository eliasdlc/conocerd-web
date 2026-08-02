"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 1 · "Itinerario vivo"
//
//  El mapa se convierte en una mesa de planificación: cada pin tocado se suma
//  como parada a un itinerario lateral donde CADA tramo muestra km y minutos
//  de manejo reales (matriz de pairs.json) y la polilínea sigue las carreteras
//  del país (legs de pairs.json). "Ordenar mejor" reordena las paradas con
//  nearest-neighbor y dice cuántos km te ahorras. En móvil el itinerario es un
//  bottom-sheet expandible con asa; colapsado deja siempre visibles los
//  totales (paradas · km · horas de manejo).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin, PIN_CHROME } from "@/components/map/pins";
import { DESTINATIONS, type Destination } from "@/data/destinations";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";
import pairs from "@/data/routes/pairs.json";

// ─── Datos de carretera (pairs.json) ─────────────────────────────────────────

type LngLat = [number, number];

const IDX: Record<string, number> = Object.fromEntries(
  pairs.ids.map((id, i) => [id, i])
);
const LEGS = pairs.legs as unknown as Record<string, LngLat[]>;

const kmBetween = (a: string, b: string) => pairs.km[IDX[a]][IDX[b]];
const minBetween = (a: string, b: string) => pairs.min[IDX[a]][IDX[b]];

/** Geometría por carretera entre dos destinos (la clave de legs usa el orden de `ids`). */
function legCoords(a: string, b: string): LngLat[] {
  const forward = IDX[a] < IDX[b];
  const leg = LEGS[forward ? `${a}|${b}` : `${b}|${a}`];
  if (!leg) return [];
  return forward ? leg : [...leg].reverse();
}

/** Polilínea completa del itinerario: legs concatenados sin duplicar la junta. */
function routeGeometry(ids: string[]): LngLat[] {
  const out: LngLat[] = [];
  for (let i = 0; i < ids.length - 1; i++) {
    const leg = legCoords(ids[i], ids[i + 1]);
    out.push(...(out.length ? leg.slice(1) : leg));
  }
  return out;
}

function totals(ids: string[]) {
  let km = 0;
  let min = 0;
  for (let i = 0; i < ids.length - 1; i++) {
    km += kmBetween(ids[i], ids[i + 1]);
    min += minBetween(ids[i], ids[i + 1]);
  }
  return { km: Math.round(km), min: Math.round(min) };
}

/** Nearest-neighbor manteniendo la primera parada como origen. */
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
      const d = kmBetween(last, c);
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

/** "3 h 40 min" · "45 min" — para los tramos. */
function fmtDrive(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/** "3 h 40" · "45 min" — versión corta para el total grande. */
function fmtDriveShort(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

const byId = (id: string) => DESTINATIONS.find((d) => d.id === id);

// Ruta pre-armada a propósito en un orden mejorable: demuestra el itinerario
// con datos reales y le da sentido al botón "Ordenar mejor" desde el primer
// vistazo (Charcos → Constanza → Cabarete → Jarabacoa zigzaguea la cordillera).
const DEMO_ROUTE = ["charcos", "constanza", "cabarete", "jarabacoa"];

// ─── Pin del mapa (numerado si es parada; toca para agregar/quitar) ──────────

function ItineraryPin({
  d,
  order,
  prevStop,
  routeEmpty,
  onToggle,
}: {
  d: Destination;
  order: number; // -1 si no es parada
  prevStop: Destination | null; // última parada (para el hint "+X km")
  routeEmpty: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inRoute = order >= 0;

  const hint = inRoute
    ? `parada ${order + 1} · toca para quitar`
    : routeEmpty
      ? "toca para empezar aquí"
      : prevStop
        ? `+${Math.round(kmBetween(prevStop.id, d.id))} km · ${fmtDrive(minBetween(prevStop.id, d.id))}`
        : "";

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
                ? `Quitar ${d.name} del itinerario (parada ${order + 1})`
                : `Agregar ${d.name} al itinerario`
            }
            aria-pressed={inRoute}
            onClick={onToggle}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            className="grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mango"
          >
            {inRoute ? (
              <span
                className={`grid size-7 place-items-center rounded-full bg-mango font-mono text-xs font-bold text-white ${PIN_CHROME}`}
              >
                {order + 1}
              </span>
            ) : (
              <CategoryPin category={d.category} size={26} />
            )}
          </button>

          {hover && (
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-chip border border-line bg-white px-2.5 py-1.5 shadow-card">
              <span className="text-micro font-bold text-ink">{d.name}</span>
              {hint && (
                <span className="ml-1.5 font-mono text-micro text-muted">{hint}</span>
              )}
            </div>
          )}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Botón chico de fila (subir/bajar/quitar) ────────────────────────────────

function RowBtn({
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
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-line bg-white p-0 text-muted transition-colors duration-150 hover:border-ink/30 hover:text-ink disabled:cursor-default disabled:opacity-35 max-[899px]:size-11"
    >
      <Icon name={name} className="text-sm" />
    </button>
  );
}

// Glifo "ordenar" (swap de flechas) — no existe en el set propio.
function SortIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 20V5m0 15-3-3m3 3 3-3" />
      <path d="M17 4v15m0-15-3 3m3-3 3 3" />
    </svg>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function ItinerarioVivo() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";
  const reduced = useReducedMotion();

  const [route, setRoute] = useState<string[]>(DEMO_ROUTE);
  const [isDemo, setIsDemo] = useState(true);
  const [savedKm, setSavedKm] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true); // bottom-sheet móvil

  const stops = route
    .map(byId)
    .filter((d): d is Destination => Boolean(d));

  const t = totals(route);
  const bestOrder = useMemo(() => nearestNeighborOrder(route), [route]);
  const saveKm = Math.round(t.km - totals(bestOrder).km);
  const showOptimize = route.length >= 3 && saveKm >= 5;

  const geometry = useMemo(() => routeGeometry(route), [route]);

  function edit(next: string[] | ((prev: string[]) => string[])) {
    setRoute(next);
    setIsDemo(false);
    setSavedKm(null);
  }

  function toggleStop(id: string) {
    edit((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function moveStop(id: string, dir: -1 | 1) {
    edit((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function optimize() {
    setSavedKm(saveKm);
    setRoute(bestOrder);
    setIsDemo(false);
  }

  return (
    <>
      {/* Polilínea por carreteras reales: casing crema + trazo mango encima */}
      {isVisible && geometry.length >= 2 && (
        <>
          <MapRoute id="itinerario-casing" coordinates={geometry} color="#FDF8F0" width={7} opacity={0.9} />
          <MapRoute id="itinerario" coordinates={geometry} color="#FF8D16" width={3.5} opacity={1} />
        </>
      )}

      {/* Pines: numerado por orden de parada; el resto, pin de categoría */}
      {isVisible &&
        DESTINATIONS.map((d) => (
          <ItineraryPin
            key={d.id}
            d={d}
            order={route.indexOf(d.id)}
            prevStop={stops.length ? stops[stops.length - 1] : null}
            routeEmpty={route.length === 0}
            onToggle={() => toggleStop(d.id)}
          />
        ))}

      {/* Capa de UI — pointer-events-none: cada panel los reactiva para no
          bloquear los pines del mapa. */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Intro (abajo-izq, solo desktop: en móvil el sheet cuenta la historia) */}
        <div
          className={`${PANEL_GLASS} absolute bottom-[clamp(24px,4%,48px)] left-[clamp(16px,3%,40px)] w-[300px] rounded-panel px-5 py-[18px] shadow-panel max-[899px]:hidden ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <Kicker icon="route" index="02">Tu ruta</Kicker>
          <h2 className="mt-2 font-display text-[22px] font-bold leading-tight text-ink">
            Arma tu <em className="crd-accent">itinerario</em>
          </h2>
          <p className="mt-1.5 text-tiny leading-[1.55] text-muted">
            Toca un pin y se vuelve una parada. Cada tramo trae sus kilómetros
            y su tiempo real de manejo, por carretera — no en línea recta.
          </p>
        </div>

        {/* Itinerario: panel lateral en desktop, bottom-sheet con asa en móvil */}
        <section
          aria-label="Tu itinerario"
          className={`${PANEL_SOLID} absolute right-[clamp(16px,3%,40px)] top-1/2 flex max-h-[76vh] w-[316px] -translate-y-1/2 flex-col overflow-hidden rounded-panel shadow-panel max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:top-auto max-[899px]:max-h-[68dvh] max-[899px]:w-auto max-[899px]:translate-y-0 max-[899px]:rounded-b-none ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Asa (solo móvil): expande/colapsa el sheet */}
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "Contraer itinerario" : "Expandir itinerario"}
            className="flex h-8 w-full flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 min-[900px]:hidden"
          >
            <span aria-hidden="true" className="h-1 w-9 rounded-full bg-[#B5C0BD]" />
          </button>

          {/* Header + optimizar + lista: en móvil colapsado se ocultan (quedan asa y totales) */}
          <div className={sheetOpen ? "contents" : "max-[899px]:hidden min-[900px]:contents"}>
            <div className="flex-none px-[18px] pb-2 pt-4 max-[899px]:pt-0">
              <div className="mb-1.5 min-[900px]:hidden">
                <Kicker icon="route" index="02">Tu ruta</Kicker>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[20px] font-bold text-ink">Itinerario</h3>
                {route.length > 0 && (
                  <button
                    type="button"
                    onClick={() => edit([])}
                    className="cursor-pointer border-0 bg-transparent p-0 text-mini font-bold text-coral-ink"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              {isDemo && route.length > 0 && (
                <p className="mt-0.5 text-mini text-muted">
                  Ruta de ejemplo — tócala y hazla tuya.
                </p>
              )}
            </div>

            {/* Ordenar mejor / confirmación (aria-live para anunciar el ahorro) */}
            <div aria-live="polite" className="flex-none empty:hidden">
              {showOptimize && (
                <div className="px-[18px] pb-2">
                  <button
                    type="button"
                    onClick={optimize}
                    className="crd-sticker flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-mint px-3 py-2 text-tiny font-bold text-ink-2"
                  >
                    <SortIcon />
                    Ordenar mejor · te ahorras {saveKm} km
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

            {/* Lista de paradas y tramos */}
            {route.length === 0 ? (
              <div className="px-[18px] pb-5 pt-1 text-center">
                <p className="mx-auto max-w-[230px] text-tiny leading-[1.55] text-muted">
                  Toca cualquier pin del mapa y aquí se arma tu viaje, tramo por
                  tramo, con kilómetros y tiempos reales.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoute(DEMO_ROUTE);
                    setIsDemo(true);
                    setSavedKm(null);
                  }}
                  className="mt-3 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-3.5 text-tiny font-bold text-ink"
                >
                  <Icon name="explore" className="text-sm" />
                  Ver una ruta de ejemplo
                </button>
              </div>
            ) : (
              <ol className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-2.5 [scrollbar-width:thin]">
                {stops.map((d, i) => (
                  <motion.li key={d.id} layout={!reduced} className="list-none">
                    <div className="flex items-center gap-2.5 py-1">
                      <span
                        aria-hidden="true"
                        className="grid size-[22px] flex-none place-items-center rounded-full bg-mango font-mono text-mini font-bold text-white"
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-ink">{d.name}</div>
                        <div className="truncate font-mono text-micro text-muted">{d.province}</div>
                      </div>
                      <div className="flex flex-none items-center gap-0.5">
                        <RowBtn name="arrow_upward" label={`Subir ${d.name}`} disabled={i === 0} onClick={() => moveStop(d.id, -1)} />
                        <RowBtn name="arrow_downward" label={`Bajar ${d.name}`} disabled={i === stops.length - 1} onClick={() => moveStop(d.id, 1)} />
                        <RowBtn name="close" label={`Quitar ${d.name}`} onClick={() => toggleStop(d.id)} />
                      </div>
                    </div>

                    {/* Tramo hacia la siguiente parada: km y minutos reales */}
                    {i < stops.length - 1 && (
                      <div className="ml-[10px] border-l-2 border-dashed border-mango/60 py-1 pl-[19px] font-mono text-micro text-muted-2">
                        {Math.round(kmBetween(d.id, stops[i + 1].id))} km ·{" "}
                        {fmtDrive(minBetween(d.id, stops[i + 1].id))} manejando
                      </div>
                    )}
                  </motion.li>
                ))}
              </ol>
            )}
          </div>

          {/* Totales — siempre visibles, también con el sheet colapsado */}
          {route.length > 0 && (
            <div className="grid flex-none grid-cols-3 border-t border-line bg-cream-2/70 max-[899px]:pb-3">
              {/* pl móvil: el compás del mapa flota sobre la esquina inferior
                  izquierda del sheet — corre el dato para que no lo tape. */}
              <div className="px-2 py-2.5 text-center max-[899px]:pl-12">
                <div className="font-mono text-lg font-bold leading-tight text-ink">{route.length}</div>
                <div className="text-micro font-semibold uppercase tracking-wide text-muted">
                  {route.length === 1 ? "parada" : "paradas"}
                </div>
              </div>
              <div className="border-l border-line px-2 py-2.5 text-center">
                <div className="font-mono text-lg font-bold leading-tight text-ink">{t.km} km</div>
                <div className="text-micro font-semibold uppercase tracking-wide text-muted">por carretera</div>
              </div>
              <div className="border-l border-line px-2 py-2.5 text-center">
                <div className="font-mono text-lg font-bold leading-tight text-ink">{fmtDriveShort(t.min)}</div>
                <div className="text-micro font-semibold uppercase tracking-wide text-muted">manejando</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
