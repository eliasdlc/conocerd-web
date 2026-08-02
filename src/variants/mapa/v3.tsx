"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 3 de "Arma tu recorrido" — BITÁCORA DE EXPEDICIÓN.
//
//  La ruta no es una lista de gestión: es una bitácora de viaje. Cada pin
//  tocado "estampa" una entrada en un papel crema — número de sello, nombre
//  manuscrito, provincia en mono y un sello circular de la categoría — y entre
//  entradas aparece el tramo por carretera real (km · min de OSRM, vía
//  pairs.json). Cierra con un sello final de expedición y el CTA hacia la
//  lista de espera. En móvil la bitácora es el bottom-sheet de la casa
//  (crd-ol-panel).
//
//  Arranca con una ruta de ejemplo ya estampada (Jarabacoa → El Limón → Playa
//  Rincón): en un landing, ver la bitácora llena enseña la interacción mejor
//  que un estado vacío. La nota "hazla tuya" y el botón Limpiar la devuelven
//  a cero. La micro-animación de estampado solo ocurre al AÑADIR (nunca en
//  reposo, y nunca sobre la ruta semilla — AnimatePresence initial={false}).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import Button from "@/components/Button";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORY_META,
  type Destination,
} from "@/data/destinations";
import { PANEL_GLASS } from "@/lib/surfaces";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import pairs from "@/data/routes/pairs.json";

// ─── Carreteras reales (OSRM) ────────────────────────────────────────────────

type Roads = {
  ids: string[];
  km: number[][];
  min: number[][];
  legs: Record<string, [number, number][]>;
};
const ROADS = pairs as unknown as Roads;

const iOf = (id: string) => ROADS.ids.indexOf(id);

function roadStats(a: string, b: string): { km: number; min: number } {
  const i = iOf(a);
  const j = iOf(b);
  return { km: Math.round(ROADS.km[i][j]), min: Math.round(ROADS.min[i][j]) };
}

/** Geometría por carretera A→B. La clave de `legs` usa el orden de `ids`. */
function roadLeg(a: string, b: string): [number, number][] {
  const forward = iOf(a) < iOf(b);
  const leg = ROADS.legs[forward ? `${a}|${b}` : `${b}|${a}`];
  if (!leg) {
    const da = DESTINATIONS.find((d) => d.id === a)!;
    const db = DESTINATIONS.find((d) => d.id === b)!;
    return [da.coords, db.coords];
  }
  return forward ? leg : [...leg].reverse();
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

// Ruta semilla: montaña → cascada → playa. Enseña el concepto en un vistazo.
const DEMO_ROUTE = ["jarabacoa", "limon", "playa-rincon"];

// Rotación de cada sello circular: determinista, para que la bitácora se vea
// "estampada a mano" sin depender de aleatoriedad entre renders.
const STAMP_ROT = [-7, 5, -4, 7, -6, 3, -5, 6];

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral";

// ─── Pin del mapa (tocar = estampar / quitar) ────────────────────────────────

function ExpeditionPin({
  d,
  routeIndex,
  lastStop,
  onToggle,
}: {
  d: Destination;
  routeIndex: number; // -1 si no está estampado
  lastStop: Destination | null;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inRoute = routeIndex >= 0;
  const meta = CATEGORY_META[d.category];

  // Pista de distancia: cuánto añade este pin desde la última parada.
  const hint =
    !inRoute && lastStop && lastStop.id !== d.id
      ? roadStats(lastStop.id, d.id)
      : null;

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
            aria-pressed={inRoute}
            aria-label={
              inRoute
                ? `Quitar ${d.name} de la bitácora (sello ${routeIndex + 1})`
                : `Estampar ${d.name} en tu bitácora`
            }
            onClick={onToggle}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
            className={`grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 ${FOCUS}`}
          >
            <CategoryPin category={d.category} state={inRoute ? "done" : "default"} size={30} />
            {inRoute && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full bg-coral-ink px-1 text-center font-mono text-micro font-bold leading-4 text-white"
              >
                {routeIndex + 1}
              </span>
            )}
          </button>

          {hover && (
            <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 w-max max-w-[210px] -translate-x-1/2 rounded-chip border border-line bg-white px-2.5 py-1.5 text-left shadow-card">
              <div className="whitespace-nowrap text-xs font-bold text-ink">{d.name}</div>
              <div className="font-mono text-micro text-muted">
                {d.province} · <span style={{ color: meta.ink }}>{meta.label}</span>
              </div>
              {hint && (
                <div className="mt-0.5 whitespace-nowrap font-mono text-micro font-bold text-mango-ink">
                  +{hint.km} km · {fmtDur(hint.min)} desde {lastStop!.name}
                </div>
              )}
              {inRoute && (
                <div className="mt-0.5 font-mono text-micro font-bold text-coral-ink">
                  Sello Nº {String(routeIndex + 1).padStart(2, "0")} · toca para quitar
                </div>
              )}
              <div className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-line bg-white" />
            </div>
          )}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Entradas de la bitácora ─────────────────────────────────────────────────

function LegDivider({ from, to }: { from: string; to: string }) {
  const s = roadStats(from, to);
  return (
    <div className="ml-[11px] border-l-2 border-dashed border-coral/45 py-1.5 pl-3.5">
      <span className="font-mono text-micro text-muted">
        {s.km} km · {fmtDur(s.min)} por carretera
      </span>
    </div>
  );
}

function StampEntry({
  d,
  index,
  prevId,
  onRemove,
  reduce,
}: {
  d: Destination;
  index: number;
  prevId: string | null;
  onRemove: () => void;
  reduce: boolean;
}) {
  const meta = CATEGORY_META[d.category];
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
    >
      {prevId && <LegDivider from={prevId} to={d.id} />}

      {/* El estampado: entra "presionando" sobre el papel (solo al añadir). */}
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 1.35, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.38 }}
        style={{ transformOrigin: "50% 40%" }}
        className="relative py-0.5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-micro font-bold tracking-[0.14em] text-coral-ink">
            SELLO Nº {String(index + 1).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label={`Quitar ${d.name} de la bitácora`}
            title="Quitar"
            onClick={onRemove}
            className={`-m-3 grid size-11 cursor-pointer place-items-center border-0 bg-transparent p-0 text-muted transition-colors hover:text-coral-ink ${FOCUS}`}
          >
            <Icon name="close" className="text-sm" />
          </button>
        </div>
        <div className="pr-12">
          <div className="font-hand text-[21px] font-bold leading-[1.1] text-ink">{d.name}</div>
          <div className="mt-0.5 font-mono text-micro uppercase tracking-[0.12em] text-muted">
            {d.province}
          </div>
        </div>

        {/* Sello circular de la categoría, con giro de tampón manual. */}
        <span
          aria-hidden="true"
          className="absolute bottom-1 right-0 grid size-9 place-items-center rounded-full border-2 opacity-80 mix-blend-multiply"
          style={{
            borderColor: meta.ink,
            color: meta.ink,
            transform: `rotate(${STAMP_ROT[index % STAMP_ROT.length]}deg)`,
          }}
        >
          <Icon name={meta.icon} className="text-sm" />
        </span>
      </motion.div>
    </motion.li>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function MapaBitacora() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";
  const reduce = useReducedMotion() ?? false;

  const [route, setRoute] = useState<string[]>(DEMO_ROUTE);
  const [touched, setTouched] = useState(false);

  function toggleStop(id: string) {
    setTouched(true);
    setRoute((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const stops = route
    .map((id) => DESTINATIONS.find((d) => d.id === id))
    .filter((d): d is Destination => Boolean(d));

  // Polilínea por carretera: concatena los tramos OSRM entre paradas seguidas.
  const routeCoords: [number, number][] = [];
  for (let i = 1; i < stops.length; i++) {
    const leg = roadLeg(stops[i - 1].id, stops[i].id);
    routeCoords.push(...(i === 1 ? leg : leg.slice(1)));
  }

  const totals = stops.slice(1).reduce(
    (acc, s, i) => {
      const st = roadStats(stops[i].id, s.id);
      return { km: acc.km + st.km, min: acc.min + st.min };
    },
    { km: 0, min: 0 }
  );

  // Al estampar una parada nueva, la bitácora baja hasta el sello recién puesto.
  const listRef = useRef<HTMLOListElement>(null);
  const prevLen = useRef(route.length);
  useEffect(() => {
    if (route.length > prevLen.current) {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: reduce ? "auto" : "smooth",
      });
    }
    prevLen.current = route.length;
  }, [route.length, reduce]);

  const lastStop = stops.length > 0 ? stops[stops.length - 1] : null;

  return (
    <>
      {/* Ruta por carretera real */}
      {isVisible && routeCoords.length >= 2 && (
        <MapRoute
          id="v3-bitacora-route"
          coordinates={routeCoords}
          color="#F76C4D"
          width={3.5}
          opacity={0.9}
        />
      )}

      {/* Pines: tocar = estampar */}
      {isVisible &&
        DESTINATIONS.map((d) => (
          <ExpeditionPin
            key={d.id}
            d={d}
            routeIndex={route.indexOf(d.id)}
            lastStop={lastStop}
            onToggle={() => toggleStop(d.id)}
          />
        ))}

      {/* Capa de UI — pointer-events-none: cada panel los reactiva para no
          bloquear los MapMarkers del mapa. */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Cabecera de escena (solo desktop; en móvil vive dentro del sheet) */}
        <div
          className={`${PANEL_GLASS} absolute bottom-[clamp(24px,4%,48px)] left-[clamp(16px,3%,40px)] max-w-[320px] rounded-panel px-5 py-[18px] shadow-panel max-[899px]:hidden ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <Kicker icon="route" index="02">Tu ruta</Kicker>
          <div className="mt-2 font-display text-feature font-semibold leading-tight text-ink">
            Arma tu <em className="crd-accent">expedición</em>
          </div>
          <p className="mb-0.5 mt-1.5 text-tiny leading-[1.55] text-muted">
            Toca un pin y la parada se estampa en la bitácora, con kilómetros y
            tiempo por carretera de verdad.
          </p>
        </div>

        {/* La bitácora: papel crema a la derecha; bottom-sheet en móvil.
            El centrado vertical va con prefijo min-[900px]: el reset móvil de
            .crd-ol-panel anula `transform`, pero Tailwind v4 traduce
            -translate-y-1/2 a la propiedad `translate`, que sobreviviría. */}
        <div
          className={`crd-ol-panel absolute right-[clamp(16px,3%,40px)] flex max-h-[76vh] w-[316px] flex-col rounded-panel border border-line bg-cream px-[18px] py-4 shadow-panel min-[900px]:top-1/2 min-[900px]:-translate-y-1/2 ${
            isVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          {/* Cinta adhesiva decorativa (identidad polaroid; no en el sheet) */}
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-2deg] border-x border-white/50 bg-mint/35 max-[899px]:hidden"
          />

          <div className="mb-2 min-[900px]:hidden">
            <Kicker icon="route" index="02">Tu ruta</Kicker>
          </div>

          <div className="border-b border-dashed border-line pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-[0.16em] text-ink/70">
                <Icon name="auto_stories" className="text-sm text-coral" />
                Bitácora de ruta
              </span>
              {stops.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTouched(true);
                    setRoute([]);
                  }}
                  className={`cursor-pointer border-none bg-transparent p-0 text-mini font-bold text-coral-ink ${FOCUS}`}
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="mt-1 font-display text-[20px] font-semibold text-ink">
              Expedición <em className="crd-accent">propia</em>
            </div>
            {!touched && stops.length > 0 && (
              <p className="mt-1 font-mono text-micro text-mango-ink">
                Ruta de ejemplo — tócala y hazla tuya.
              </p>
            )}
          </div>

          {stops.length === 0 ? (
            /* Bitácora en blanco */
            <div className="mt-3 rounded-tile border border-dashed border-muted-2/60 px-4 py-5 text-center">
              <span
                aria-hidden="true"
                className="mx-auto grid size-10 rotate-[-6deg] place-items-center rounded-full border-2 border-dashed border-muted-2/70 text-muted"
              >
                <Icon name="explore" className="text-base" />
              </span>
              <p className="mt-2.5 text-tiny leading-[1.5] text-muted">
                Tu bitácora está en blanco. Toca un pin del mapa y estampa tu
                primera parada.
              </p>
            </div>
          ) : (
            <>
              <ol
                ref={listRef}
                aria-label="Paradas de tu expedición"
                className="mt-2 min-h-0 flex-1 list-none overflow-y-auto p-0 [scrollbar-width:thin]"
              >
                <AnimatePresence initial={false}>
                  {stops.map((s, i) => (
                    <StampEntry
                      key={s.id}
                      d={s}
                      index={i}
                      prevId={i > 0 ? stops[i - 1].id : null}
                      onRemove={() => toggleStop(s.id)}
                      reduce={reduce}
                    />
                  ))}
                </AnimatePresence>

                {/* Afordancia del próximo sello */}
                {stops.length < DESTINATIONS.length && (
                  <li className="mt-2 flex items-center gap-2.5 rounded-tile border border-dashed border-line bg-white/40 px-3 py-2">
                    <span
                      aria-hidden="true"
                      className="grid size-7 flex-none place-items-center rounded-full border border-dashed border-muted-2/70 font-mono text-micro font-bold text-muted"
                    >
                      {String(stops.length + 1).padStart(2, "0")}
                    </span>
                    <span className="text-micro leading-[1.4] text-muted">
                      El próximo sello: toca otro pin del mapa.
                    </span>
                  </li>
                )}
              </ol>

              <div className="mt-2 border-t border-dashed border-line pt-2.5">
                {stops.length >= 2 ? (
                  /* Sello final de la expedición */
                  <div
                    aria-live="polite"
                    className="mx-auto w-fit rotate-[-2deg] rounded-[10px] border-2 border-coral-ink/60 px-3.5 py-1.5 text-center mix-blend-multiply"
                  >
                    <div className="font-mono text-micro font-bold uppercase tracking-[0.18em] text-coral-ink/80">
                      Sello de expedición
                    </div>
                    <div className="mt-0.5 whitespace-nowrap font-mono text-tiny font-bold text-coral-ink">
                      {stops.length} paradas · {totals.km} km
                    </div>
                    <div className="whitespace-nowrap font-mono text-tiny font-bold text-coral-ink">
                      {fmtDur(totals.min)} de manejo
                    </div>
                  </div>
                ) : (
                  <p aria-live="polite" className="text-center font-mono text-micro text-muted">
                    1 parada — añade otra para trazar la carretera.
                  </p>
                )}

                <div className="mt-3 flex justify-center">
                  <Button variant="primary" onClick={() => requestSubscribe("viajero")}>
                    Guárdala para el día del viaje
                  </Button>
                </div>
                <p className="mb-0.5 mt-2 text-center font-mono text-micro text-muted">
                  Te apunta a la lista de espera — sin spam.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
