"use client";

// Variante 2 de El equipo — "Créditos de expedición".
//
// La sección deja de ser un par de cards de perfil y se convierte en la página
// de créditos de una bitácora de expedición: la tripulación con sellos de
// caucho (iniciales + lema en mono), una ruta punteada con los tres hitos
// honestos del proyecto, y la misión en Fraunces como cierre. Todo vive en una
// sola página de bitácora pegada al mapa con cinta (crd-tape), como las
// polaroids del resto del journey.

import { useId } from "react";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel } from "@/components/map/Map";
import { PIN_CHROME } from "@/components/map/pins";
import { PANEL_SOLID } from "@/lib/surfaces";

// ─── Datos ────────────────────────────────────────────────────────────────────

type Crew = {
  name: string;
  role: string; // credencial de tripulación
  bio: string;
  initials: string;
  motto: string; // lema corto del sello, en mono
  index: string;
  ink: string; // color de tinta del sello y la credencial
  soft: string; // fondo pastel del sello
};

const CREW: Crew[] = [
  {
    name: "Brauny Núñez",
    role: "Estrategia y rumbo",
    bio: "Marketing e inteligencia estratégica. Define la visión, la marca y hacia dónde va la expedición.",
    initials: "BN",
    motto: "SIEMPRE AL NORTE",
    index: "01",
    ink: "#B23410",
    soft: "#FFE7DF",
  },
  {
    name: "Elías de la Cruz",
    role: "Construcción y tecnología",
    bio: "Ingeniería en computación. Diseña la arquitectura y construye la app y este sitio, pieza a pieza.",
    initials: "EC",
    motto: "HECHO A MANO",
    index: "02",
    ink: "#0C6A60",
    soft: "#C6F3EB",
  },
];

type Milestone = {
  icon: IconName;
  title: string;
  detail: string;
  current?: boolean;
};

// Hitos reales y sin fechas inventadas: idea → investigación → construcción.
const MILESTONES: Milestone[] = [
  {
    icon: "explore",
    title: "La idea",
    detail: "Demasiados lugares buenos fuera del mapa. Decidimos armarlo nosotros.",
  },
  {
    icon: "groups",
    title: "La investigación",
    detail: "Más de 200 viajeros y negocios locales nos contaron qué les falta.",
  },
  {
    icon: "rocket_launch",
    title: "La app, en construcción",
    detail: "La primera versión se construye hoy con ese feedback en la mano.",
    current: true,
  },
];

// ─── Sello de expedición ──────────────────────────────────────────────────────
// Cuño circular: anillo exterior, lema en arco superior, iniciales al centro y
// número de tripulante debajo. Todo en la tinta del miembro, sobre su pastel.

function ExpeditionSeal({ crew }: { crew: Crew }) {
  const arcId = useId();
  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label={`Sello de expedición de ${crew.name}: ${crew.motto}`}
      className="size-full"
      style={{ color: crew.ink }}
    >
      <defs>
        {/* Arco superior para el lema (media circunferencia, izquierda→derecha). */}
        <path id={arcId} d="M 12.5 48 A 35.5 35.5 0 0 1 83.5 48" fill="none" />
      </defs>
      <circle cx="48" cy="48" r="45" fill={crew.soft} fillOpacity="0.5" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="48" cy="48" r="28.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3.5" opacity="0.75" />
      <text className="font-mono" fontSize="7.6" fontWeight="700" letterSpacing="0.8" fill="currentColor">
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          ✶ {crew.motto} ✶
        </textPath>
      </text>
      <text x="48" y="55" textAnchor="middle" className="font-display" fontSize="24" fontWeight="700" fill="currentColor">
        {crew.initials}
      </text>
      <text x="48" y="66.5" textAnchor="middle" className="font-mono" fontSize="5.4" fontWeight="700" letterSpacing="1.4" fill="currentColor" opacity="0.85">
        TRIPULANTE {crew.index}
      </text>
      <text x="48" y="84" textAnchor="middle" className="font-mono" fontSize="6" fontWeight="700" letterSpacing="1.2" fill="currentColor" opacity="0.7">
        · RD ·
      </text>
    </svg>
  );
}

// ─── Credencial de tripulación ────────────────────────────────────────────────

function CrewCredential({ crew, delay, animate }: { crew: Crew; delay: number; animate: boolean }) {
  return (
    <li
      className={`flex items-center gap-4 max-[899px]:gap-3.5 ${animate ? "animate-slide-up" : ""}`}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      {/* El sello llega ladeado, como estampado a mano; en hover se endereza. */}
      <div className="size-[92px] shrink-0 rotate-[-5deg] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)] hover:rotate-0 max-[899px]:size-[80px]">
        <ExpeditionSeal crew={crew} />
      </div>
      <div className="min-w-0 text-left">
        <h3 className="m-0 text-body font-bold leading-[1.2] text-ink">{crew.name}</h3>
        <div
          className="mt-1 font-mono text-micro font-bold uppercase tracking-[.14em]"
          style={{ color: crew.ink }}
        >
          {crew.role}
        </div>
        <p className="m-0 mt-1.5 text-tiny leading-[1.5] text-muted">{crew.bio}</p>
      </div>
    </li>
  );
}

// ─── Ruta del proyecto ────────────────────────────────────────────────────────

function MilestonePin({ milestone }: { milestone: Milestone }) {
  return (
    <span
      className={`relative z-[1] flex size-9 items-center justify-center rounded-full text-white ring-4 ring-white ${
        milestone.current ? "bg-coral" : "bg-mint-ink"
      }`}
      aria-hidden="true"
    >
      <Icon name={milestone.current ? milestone.icon : "check"} className="text-[17px]" />
    </span>
  );
}

function ProjectRoute() {
  return (
    <div className="relative">
      {/* Ruta punteada que une los pins; sigue de largo tras el último hito:
          la expedición no ha terminado. Sólo desktop — en móvil la ruta es el
          raíl vertical de abajo. */}
      <svg
        viewBox="0 0 600 40"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute left-0 top-0 h-10 w-full max-[899px]:hidden"
      >
        <path
          d="M 100 20 C 160 9 240 31 300 20 C 360 9 440 31 500 20"
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="0.5 8"
        />
        <path
          d="M 500 20 C 530 15 552 12 572 10"
          fill="none"
          stroke="var(--color-coral)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="0.5 8"
          opacity="0.35"
        />
      </svg>

      {/* Raíl vertical de la versión móvil. */}
      <div
        aria-hidden="true"
        className="absolute bottom-4 left-[17px] top-4 hidden w-0 border-l-2 border-dashed border-coral/45 max-[899px]:block"
      />

      <ol className="relative m-0 grid list-none grid-cols-3 gap-4 p-0 max-[899px]:grid-cols-1 max-[899px]:gap-4">
        {MILESTONES.map((m) => (
          <li
            key={m.title}
            className="flex flex-col items-center gap-2 text-center max-[899px]:flex-row max-[899px]:items-start max-[899px]:gap-3.5 max-[899px]:text-left"
          >
            <MilestonePin milestone={m} />
            <div className="min-w-0">
              <div className="flex items-center justify-center gap-1.5 max-[899px]:justify-start">
                <h4 className="m-0 text-tiny font-bold leading-[1.25] text-ink">{m.title}</h4>
                {m.current && (
                  <span className="rounded-chip bg-coral-soft px-1.5 py-px font-mono text-micro font-bold uppercase tracking-[.12em] text-coral-ink">
                    Ahora
                  </span>
                )}
              </div>
              <p className="m-0 mt-1 max-w-[210px] text-mini leading-[1.45] text-muted max-[899px]:max-w-none">
                {m.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function EquipoExpedicionOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";

  return (
    <>
      {/* Campamento base: el proyecto se construye desde Santiago. Etiqueta a la
          derecha para no chocar con la toponimia del mapa (audit 2.7). */}
      {isVisible && (
        <MapMarker longitude={-70.6947} latitude={19.4508} anchor="bottom">
          <MarkerContent>
            <div className={`flex size-[38px] animate-[mapBubbleIn_0.5s_cubic-bezier(0.2,0.8,0.3,1)_both] items-center justify-center rounded-full bg-white ${PIN_CHROME}`}>
              <Icon name="location_on" className="text-[19px] text-coral-ink" />
            </div>
          </MarkerContent>
          <MarkerLabel position="right">Campamento base · Santiago</MarkerLabel>
        </MapMarker>
      )}

      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-between px-6 pb-9 pt-[88px] transition-opacity duration-500 ease-in-out max-[899px]:px-4 max-[899px]:pb-0 max-[899px]:pt-[72px] ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isVisible}
        inert={!isVisible}
      >
        {/* Encabezado */}
        <div className={`text-center ${isVisible ? "animate-slide-up" : ""}`}>
          <Kicker icon="groups" index="05" tone="coral" className="mb-2.5">
            El equipo
          </Kicker>
          <h2 className="m-0 font-display text-[clamp(20px,2.8vw,34px)] font-bold leading-[1.08] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            La expedición <em className="crd-accent">ConoceRD</em>
          </h2>
          <p className="mx-auto mt-2 text-sm leading-[1.5] text-[#3A5560] [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
            Dos tripulantes y una ruta: sacar del anonimato los rincones del país.
          </p>
        </div>

        {/* Página de bitácora: créditos + ruta + misión. Opaca porque lleva
            texto largo sobre la toponimia; pegada con cinta como las polaroids. */}
        <section
          aria-label="Créditos de la expedición"
          className={`crd-ol-panel relative w-full max-w-[820px] rounded-panel px-7 pb-6 pt-5 shadow-panel ${PANEL_SOLID} ${
            isVisible ? "animate-slide-up" : ""
          }`}
          style={isVisible ? { animationDelay: "0.12s" } : undefined}
        >
          {/* Cinta adhesiva como elemento (no la clase crd-tape): su ::before
              pisaría el asa del bottom-sheet móvil, que usa el mismo pseudo. */}
          <div
            aria-hidden="true"
            className="absolute -top-2 left-1/2 h-[17px] w-[62px] -translate-x-1/2 rotate-[-2.5deg] border-x border-ink/10 bg-[linear-gradient(180deg,rgba(255,255,255,.62),rgba(253,248,240,.42))] shadow-[0_1px_2px_rgba(38,70,83,0.10)] max-[899px]:hidden"
          />
          {/* Cabecera de bitácora */}
          <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2.5 font-mono text-micro font-bold uppercase tracking-[.14em] text-muted-2">
            <span className="whitespace-nowrap">Bitácora de expedición</span>
            <span aria-hidden="true" className="whitespace-nowrap max-[899px]:hidden">
              Cap. 05 · Tripulación 02
            </span>
          </div>

          {/* Tripulación */}
          <ul className="m-0 grid list-none grid-cols-2 gap-6 p-0 pt-4 max-[899px]:grid-cols-1 max-[899px]:gap-4">
            {CREW.map((crew, i) => (
              <CrewCredential key={crew.name} crew={crew} delay={0.2 + i * 0.1} animate={isVisible} />
            ))}
          </ul>

          {/* Ruta del proyecto */}
          <div className="mt-5 border-t border-dashed border-line pt-4">
            <ProjectRoute />
          </div>

          {/* Misión */}
          <p className="m-0 mt-4 border-t border-dashed border-line pt-4 text-center font-display text-[clamp(20px,1.7vw,22px)] font-semibold leading-[1.25] tracking-[-.01em] text-ink-2">
            Que descubrir <em className="crd-accent">lo nuestro</em> sea tan fácil como abrir el mapa.
          </p>
        </section>
      </div>
    </>
  );
}
