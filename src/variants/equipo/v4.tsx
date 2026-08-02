"use client";
// Variante 4 de El equipo — "Santiago protagonista".
//
// La historia del equipo se cuenta EN el mapa, no en cards: cuatro puntos
// reales de Santiago (Monumento, centro histórico, Estadio Cibao, Jardín
// Botánico) llevan micro-notas del origen del proyecto que se abren al tocar,
// unidas por un hilo punteado en orden cronológico, como cuerda de pinboard.
// El overlay es mínimo: titular arriba y UNA card compacta abajo con los dos
// fundadores lado a lado. En móvil (zoom bajo: los puntos se juntan) la
// navegación primaria son chips numerados dentro de la card, y la nota activa
// se lee ahí mismo en vez de flotar sobre el pin.
//
// Sin épica falsa: notas humildes y creíbles de un proyecto de dos personas.

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { PIN_CHROME } from "@/components/map/pins";
import { PANEL_GLASS, PANEL_SOLID } from "@/lib/surfaces";

// ─── Data ─────────────────────────────────────────────────────────────────────

type StoryPoint = {
  id: string;
  num: string;
  date: string;
  chip: string;
  title: string;
  body: string;
  place: string;
  coord: [number, number]; // [lng, lat] reales
  /**
   * Lado del popover en desktop. Se elige para que la nota abierta apunte
   * LEJOS del racimo de pines: con una nota abierta se deben seguir viendo
   * los otros tres puntos.
   */
  side: "top" | "bottom" | "left" | "right";
};

// Orden cronológico = orden del hilo en el mapa.
const STORY: StoryPoint[] = [
  {
    id: "croquis",
    num: "01",
    date: "OCT 2025",
    chip: "El croquis",
    title: "El primer croquis",
    body:
      "En las escalinatas, en una libreta: un mapa con pines y una lista de sitios que casi nadie visita. Ese fue todo el plan.",
    place: "Monumento a los Héroes",
    coord: [-70.6884, 19.4448],
    side: "bottom",
  },
  {
    id: "encuestas",
    num: "02",
    date: "DIC 2025",
    chip: "Las encuestas",
    title: "Las primeras 50 encuestas",
    body:
      "Por la Calle del Sol, parando gente: ¿qué conoces del país fuera de la playa? Casi nadie pasó de cinco lugares.",
    place: "Centro histórico",
    coord: [-70.7028, 19.45],
    side: "bottom",
  },
  {
    id: "nombre",
    num: "03",
    date: "ENE 2026",
    chip: "El nombre",
    title: "El nombre",
    body:
      "En un juego de las Águilas, entre inning e inning, la lista bajó de veinte nombres a uno: ConoceRD.",
    place: "Estadio Cibao",
    coord: [-70.6842, 19.4661],
    side: "right",
  },
  {
    id: "beta",
    num: "04",
    date: "ABR 2026",
    chip: "La beta",
    title: "La primera beta afuera",
    body:
      "Dos teléfonos, sol de mediodía y la app recién instalada. Se cayó dos veces. Las fotos salieron buenas.",
    place: "Jardín Botánico de Santiago",
    coord: [-70.7217, 19.4805],
    side: "left",
  },
];

const THREAD: [number, number][] = STORY.map((s) => s.coord);

type Founder = {
  name: string;
  role: string;
  roleColor: string;
  fact: string;
  initials: string;
  bg: string;
  color: string;
};

// Los datos humanos amarran a cada fundador con una nota del mapa.
const FOUNDERS: Founder[] = [
  {
    name: "Brauny Núñez",
    role: "Estrategia y negocio",
    roleColor: "#B23410",
    fact: "Las 50 encuestas de la Calle del Sol las hizo una por una.",
    initials: "BN",
    bg: "#FFE7DF",
    color: "#B23410",
  },
  {
    name: "Elías de la Cruz",
    role: "Desarrollo y tecnología",
    roleColor: "#0C6A60",
    fact: "Suya era la beta que se cayó dos veces en el Botánico.",
    initials: "EC",
    bg: "#C6F3EB",
    color: "#0C6A60",
  },
];

// ─── Pin numerado + nota flotante (desktop) ──────────────────────────────────

function StoryPin({
  point,
  index,
  active,
  onToggle,
}: {
  point: StoryPoint;
  index: number;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <MapMarker longitude={point.coord[0]} latitude={point.coord[1]} anchor="center">
      <MarkerContent>
        <div
          className="animate-[mapBubbleIn_0.45s_cubic-bezier(0.2,0.8,0.3,1)_both]"
          style={{ animationDelay: `${index * 0.09}s` }}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={active}
            aria-controls={`equipo-v4-note-${point.id}`}
            aria-label={`Historia ${point.num}: ${point.title} — ${point.place}`}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink max-[899px]:size-9"
          >
            <span
              className={`flex size-8 items-center justify-center rounded-full font-mono text-mini font-bold transition-[background,color,transform] duration-200 ${PIN_CHROME} ${
                active ? "scale-110 bg-ink text-white" : "bg-white text-coral-ink"
              } max-[899px]:size-[26px] max-[899px]:text-micro`}
            >
              {point.num}
            </span>
          </button>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// La nota flotante es un marker PROPIO montado después de los pines: cada
// marker de maplibre es su propio stacking context, así que un pin posterior
// taparía una nota que viviera dentro del pin 01. Como último hermano, la nota
// siempre queda encima. Solo desktop — en móvil la nota vive en la card.
const NOTE_POS: Record<StoryPoint["side"], string> = {
  top: "bottom-[32px] left-1/2 -translate-x-1/2",
  bottom: "top-[32px] left-1/2 -translate-x-1/2",
  left: "right-[32px] top-0 -translate-y-1/2",
  right: "left-[32px] top-0 -translate-y-1/2",
};

const TAIL_POS: Record<StoryPoint["side"], string> = {
  top: "-bottom-[6px] left-1/2 -translate-x-1/2 border-b border-r",
  bottom: "-top-[6px] left-1/2 -translate-x-1/2 border-l border-t",
  left: "-right-[6px] top-1/2 -translate-y-1/2 border-r border-t",
  right: "-left-[6px] top-1/2 -translate-y-1/2 border-b border-l",
};

function StoryNote({ point, onClose }: { point: StoryPoint; onClose: () => void }) {
  return (
    <MapMarker longitude={point.coord[0]} latitude={point.coord[1]} anchor="center">
      <MarkerContent>
        <div
          id={`equipo-v4-note-${point.id}`}
          role="group"
          aria-label={`Nota: ${point.title}`}
          className={`absolute hidden w-[236px] animate-[mapBubbleIn_0.3s_cubic-bezier(0.2,0.8,0.3,1)_both] p-3.5 pr-8 text-left min-[900px]:block ${PANEL_SOLID} rounded-card shadow-modal ${NOTE_POS[point.side]}`}
        >
          {/* Puntica que conecta la nota con el pin */}
          <span
            aria-hidden="true"
            className={`absolute size-2.5 rotate-45 border-line bg-white ${TAIL_POS[point.side]}`}
          />
          <div className="font-mono text-micro font-bold uppercase tracking-[.12em] text-coral-ink">
            {point.num} · {point.date}
          </div>
          <div className="mt-1 text-sm font-bold leading-[1.25] text-ink">{point.title}</div>
          <p className="m-0 mt-1 text-mini leading-[1.55] text-muted">{point.body}</p>
          <div className="mt-2 flex items-center gap-1 text-micro font-bold text-muted-2">
            <Icon name="location_on" className="text-[13px]" />
            {point.place}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar nota"
            className="absolute right-1 top-1 flex size-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted outline-offset-0 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipoSantiagoProtagonista() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";

  const [active, setActive] = useState<number | null>(null);
  // Si la persona ya interactuó (abrió o cerró), no volvemos a auto-abrir.
  const touchedRef = useRef(false);

  // Al entrar a la escena, la primera nota se abre sola tras el aterrizaje de
  // los pines: enseña la interacción sin instrucciones largas.
  useEffect(() => {
    if (!isVisible || touchedRef.current) return;
    // El callback re-verifica: si mientras corría el timer la persona abrió
    // otra nota (o cerró), no se le pisa la elección.
    const t = setTimeout(() => {
      if (!touchedRef.current) setActive((v) => (v === null ? 0 : v));
    }, 450);
    return () => clearTimeout(t);
  }, [isVisible]);

  // Escape cierra la nota abierta.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        touchedRef.current = true;
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const activePoint = active !== null ? STORY[active] : null;

  return (
    <>
      {/* Hilo cronológico + pines: solo montados en la escena */}
      {isVisible && (
        <>
          <MapRoute
            id="equipo-v4-thread"
            coordinates={THREAD}
            color="#264653"
            width={2}
            opacity={0.4}
            dashArray={[0.2, 2.4]}
          />
          {STORY.map((point, i) => (
            <StoryPin
              key={point.id}
              point={point}
              index={i}
              active={active === i}
              onToggle={() => {
                touchedRef.current = true;
                setActive((v) => (v === i ? null : i));
              }}
            />
          ))}
          {activePoint && (
            <StoryNote
              key={activePoint.id}
              point={activePoint}
              onClose={() => {
                touchedRef.current = true;
                setActive(null);
              }}
            />
          )}
        </>
      )}

      {/* Overlay mínimo: titular arriba, una card compacta abajo. El contenedor
          no captura clicks — los pines del mapa quedan tocables. */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between px-6 pb-9 pt-[88px] transition-opacity duration-500 ease-in-out max-[899px]:px-4 max-[899px]:pb-4 max-[899px]:pt-[72px] ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!isVisible}
        inert={!isVisible}
      >
        {/* Heading */}
        <div className={`text-center ${isVisible ? "animate-slide-up" : ""}`}>
          <Kicker icon="groups" index="05" tone="coral" className="mb-2.5">
            El equipo
          </Kicker>
          <h2 className="m-0 font-display text-[clamp(20px,2.6vw,32px)] font-bold leading-[1.08] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            ConoceRD nació en <em className="crd-accent">Santiago</em>
          </h2>
          <p className="mx-auto mt-2 max-w-[480px] text-sm leading-[1.5] text-[#3A5560] [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
            Cuatro puntos de la ciudad cuentan cómo empezó — toca cada uno.
          </p>
        </div>

        {/* Card única: fundadores lado a lado (+ nota activa en móvil) */}
        <div
          className={`pointer-events-auto w-full max-w-[620px] rounded-panel px-5 py-4 shadow-panel ${PANEL_GLASS} ${
            isVisible ? "animate-slide-up" : ""
          } max-[899px]:px-4`}
          style={isVisible ? { animationDelay: "0.15s" } : undefined}
        >
          {/* Navegación móvil: chips numerados + nota activa dentro de la card
              (a este zoom los puntos del mapa quedan muy juntos para el dedo). */}
          <div className="min-[900px]:hidden">
            <div
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
              role="tablist"
              aria-label="Historias del origen"
            >
              {STORY.map((point, i) => (
                <button
                  key={point.id}
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  aria-controls="equipo-v4-note-movil"
                  onClick={() => {
                    touchedRef.current = true;
                    setActive(i);
                  }}
                  className={`flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-chip border px-3 text-mini font-bold transition-colors duration-200 ${
                    active === i
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white/80 text-ink"
                  }`}
                >
                  <span
                    className={`font-mono text-micro ${active === i ? "text-white/70" : "text-coral-ink"}`}
                  >
                    {point.num}
                  </span>
                  {point.chip}
                </button>
              ))}
            </div>

            <div id="equipo-v4-note-movil" role="tabpanel" className="mt-2.5 min-h-[86px]">
              {activePoint ? (
                <>
                  <div className="font-mono text-micro font-bold uppercase tracking-[.12em] text-coral-ink">
                    {activePoint.date} · {activePoint.place}
                  </div>
                  <p className="m-0 mt-1 text-tiny leading-[1.5] text-ink">
                    <strong>{activePoint.title}.</strong>{" "}
                    <span className="text-muted">{activePoint.body}</span>
                  </p>
                </>
              ) : (
                <p className="m-0 text-tiny leading-[1.5] text-muted">
                  Elige un punto para leer su historia.
                </p>
              )}
            </div>

            <div className="my-3 border-t border-line" />
          </div>

          {/* Fundadores lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            {FOUNDERS.map((f, i) => (
              <div
                key={f.name}
                className={`flex items-start gap-2.5 ${i === 1 ? "border-l border-line pl-4" : ""}`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${PIN_CHROME}`}
                  style={{ background: f.bg, color: f.color }}
                  aria-hidden="true"
                >
                  {f.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold leading-tight text-ink">{f.name}</div>
                  <div className="mt-0.5 text-micro font-bold" style={{ color: f.roleColor }}>
                    {f.role}
                  </div>
                  <p className="m-0 mt-1 text-mini leading-[1.45] text-muted">{f.fact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
