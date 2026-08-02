"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 1 de El equipo — "Polaroids del equipo".
//
//  El sistema visual de Destinos (papel polaroid + cinta + caption manuscrito)
//  aplicado a las personas: los 2 fundadores son fotos pegadas sobre el mapa.
//  La "foto" es un avatar de iniciales sobre pastel (slot listo para la foto
//  real vía `photo`). Al tocar —o con Enter/Espacio— la polaroid se voltea en
//  3D y muestra la bio extendida escrita a mano al dorso. En hover la carta
//  hace un "peek" (gira unos grados hacia el flip) para que la interacción se
//  descubra sola; con reduced-motion el giro es instantáneo y sin peek.
//
//  Para captura headless: `&demo-flip=BN|EC|all` monta esa carta ya volteada.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import Icon from "@/components/Icon";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel } from "@/components/map/Map";
import { PIN_CHROME } from "@/components/map/pins";
import Kicker from "@/components/Kicker";
import { POLAROID_PAPER } from "@/components/Polaroid";

// ─── Data ─────────────────────────────────────────────────────────────────────

type Member = {
  name: string;
  role: string;
  /** Línea mono del dorso: qué lleva cada uno, en 3 palabras. */
  tags: string;
  bioLong: string;
  initials: string;
  bg: string;
  color: string;
  /** Inclinación del papel sobre la mesa (deg). */
  tilt: number;
  photo?: string; // foto real cuando la manden; hoy iniciales
};

const TEAM: Member[] = [
  {
    name: "Brauny Núñez",
    role: "Líder de Proyecto y Estrategia",
    tags: "estrategia · marca · negocio",
    bioLong:
      "Marketing con concentración en Inteligencia Estratégica. Conecta la visión de producto con el mercado dominicano y dirige el branding y el modelo de negocio de ConoceRD.",
    initials: "BN",
    bg: "#FFE7DF",
    color: "#B23410",
    tilt: -3,
  },
  {
    name: "Elías de la Cruz",
    role: "Desarrollador y Líder Tecnológico",
    tags: "arquitectura · app · web",
    bioLong:
      "Ingeniería en Ciencias de la Computación. Diseña la arquitectura, construye la app y el sitio, y lidera todas las decisiones técnicas del proyecto.",
    initials: "EC",
    bg: "#C6F3EB",
    color: "#0C6A60",
    tilt: 2.4,
  },
];

// ─── Viewport móvil ───────────────────────────────────────────────────────────
// En móvil la cámara deja Santiago justo debajo del heading y la etiqueta
// "Hecho en Santiago" chocaba con el subtítulo. MarkerLabel no acepta className
// (y envolverla cambia su containing block), así que se omite por JS: el
// subtítulo ya cuenta esa historia en pantallas chicas.

const MOBILE_QUERY = "(max-width: 899px)";

function subscribeToViewport(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

// ─── Glifo de voltear (no existe en el set propio) ────────────────────────────

function FlipGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 9a8 8 0 0 1 13.6-2.6M19.5 15a8 8 0 0 1-13.6 2.6" />
      <path d="M18.3 2.8v3.8h-3.8M5.7 21.2v-3.8h3.8" />
    </svg>
  );
}

// ─── Polaroid con flip 3D ─────────────────────────────────────────────────────

function TeamPolaroid({
  member,
  delay,
  animate,
  demoFlipped,
}: {
  member: Member;
  delay: number;
  animate: boolean;
  demoFlipped: boolean;
}) {
  const [flipped, setFlipped] = useState(demoFlipped);
  const [peek, setPeek] = useState(false);
  const reducedMotion = useReducedMotion();

  // El peek de hover sólo tiene sentido con puntero de verdad: en touch,
  // el enter dispara junto al tap y dejaría la carta a medio girar.
  const showPeek = peek && !flipped && !reducedMotion;

  return (
    <div
      className={`w-[clamp(158px,43vw,246px)] [perspective:1100px] ${animate ? "animate-slide-up" : ""}`}
      style={{
        rotate: `${member.tilt}deg`,
        ...(animate ? { animationDelay: `${delay}s` } : undefined),
      }}
    >
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        onPointerEnter={(e) => e.pointerType === "mouse" && setPeek(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setPeek(false)}
        aria-expanded={flipped}
        className="relative block w-full cursor-pointer appearance-none rounded-md border-0 bg-transparent p-0 text-left text-[inherit] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral-ink"
        style={{
          transform: `translateY(${showPeek ? -5 : 0}px) rotateY(${flipped ? 180 : showPeek ? 16 : 0}deg)`,
          transition: reducedMotion
            ? "none"
            : "transform .6s cubic-bezier(0.2, 0.8, 0.25, 1)",
        }}
      >
        {/* Frente: la foto pegada al papel */}
        <span
          className={`relative block ${POLAROID_PAPER} [backface-visibility:hidden]`}
          aria-hidden={flipped}
        >
          <span
            className="relative block aspect-square w-full overflow-hidden rounded-[3px]"
            style={{ background: member.bg }}
          >
            {member.photo ? (
              <Image
                src={member.photo}
                alt=""
                fill
                sizes="246px"
                className="object-cover [filter:saturate(1.06)_contrast(1.03)_sepia(.07)]"
              />
            ) : (
              <span
                className="absolute inset-0 flex items-center justify-center font-display text-[clamp(46px,5vw,68px)] font-bold"
                style={{ color: member.color }}
              >
                {member.initials}
              </span>
            )}
            {/* Señal de que la foto se voltea */}
            <span
              className="absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/88 text-ink shadow-[0_1px_3px_rgba(38,70,83,0.18)]"
              aria-hidden="true"
            >
              <FlipGlyph />
            </span>
          </span>
          <span className="block pb-3.5 pt-2.5">
            <span className="block font-hand text-2xl font-bold leading-none text-ink">
              {member.name}
            </span>
            <span
              className="mt-1 block font-mono text-mini font-bold leading-[1.35]"
              style={{ color: member.color }}
            >
              {member.role}
            </span>
          </span>
        </span>

        {/* Dorso: la bio escrita a mano en el papel */}
        <span
          className="crd-tape absolute inset-0 flex flex-col overflow-hidden rounded-md bg-[#FFFDF7] px-3.5 pb-3 pt-3.5 shadow-panel [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={!flipped}
        >
          <span
            className="block font-mono text-micro font-bold uppercase tracking-[.12em]"
            style={{ color: member.color }}
          >
            {member.tags}
          </span>
          {/* Mínimo 15px y leading 1.24: a 16px la bio de Brauny se recortaba
              en móvil (el alto lo fija la foto cuadrada del frente). */}
          <span className="mt-1.5 block flex-1 overflow-y-auto font-hand text-[clamp(15px,1.35vw,19px)] font-medium leading-[1.24] text-ink">
            {member.bioLong}
          </span>
          <span className="mt-1.5 flex items-end justify-between gap-2">
            <span
              className="block -rotate-2 font-hand text-xl font-bold leading-none"
              style={{ color: member.color }}
            >
              — {member.name.split(" ")[0]}
            </span>
            <span className="flex items-center gap-1 font-mono text-micro text-muted">
              <FlipGlyph size={11} />
              volver
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipoPolaroidsV1() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";
  const isMobile = useIsMobile();

  // Sólo para auto-verificación en captura headless: ?demo-flip=BN|EC|all
  // monta esa polaroid ya volteada. En uso normal el param no existe.
  const demoFlip =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("demo-flip");

  return (
    <>
      {/* Pin de origen: el equipo construye desde Santiago. */}
      {isVisible && (
        <MapMarker longitude={-70.6947} latitude={19.4508} anchor="bottom">
          <MarkerContent>
            <div
              className={`flex size-[38px] animate-[mapBubbleIn_0.5s_cubic-bezier(0.2,0.8,0.3,1)_both] items-center justify-center rounded-full bg-white ${PIN_CHROME}`}
            >
              <Icon name="location_on" className="text-[19px] text-coral-ink" />
            </div>
          </MarkerContent>
          {/* A la derecha: encima del pin caía sobre la etiqueta "Santiago de
              los Caballeros" del mapa (audit 2.7). En móvil se omite (choca
              con el subtítulo del heading). */}
          {!isMobile && (
            <MarkerLabel position="right">Hecho en Santiago</MarkerLabel>
          )}
        </MapMarker>
      )}

      {/* Overlay — heading arriba, polaroids abajo (el pin respira al centro) */}
      <div
        className={`crd-ol-equipo absolute inset-0 z-10 flex flex-col items-center justify-between px-6 pb-9 pt-[92px] transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isVisible}
        inert={!isVisible}
      >
        {/* Heading (se mantiene el titular actual) */}
        <div className={`text-center ${isVisible ? "animate-slide-up" : ""}`}>
          <Kicker icon="groups" index="05" tone="coral" className="mb-2.5">
            El equipo
          </Kicker>
          <h2 className="m-0 font-display text-[clamp(20px,2.8vw,34px)] font-bold leading-[1.08] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            Hecho por dominicanos,
            <br />
            para descubrir <em className="crd-accent">lo nuestro</em>
          </h2>
          <p className="mx-auto mt-2 text-sm leading-[1.5] text-[#3A5560] [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
            Dos personas construyendo desde Santiago la app que le faltaba al
            país.
          </p>
        </div>

        {/* Polaroids sobre la mesa */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Chip crema y no texto suelto: en móvil caía justo sobre la
              toponimia "Santiago de los Caballeros" y ambos se anulaban. */}
          <p
            className="m-0 -rotate-1 rounded-full bg-cream/92 px-3.5 py-1 font-hand text-xl font-bold leading-none text-ink/85 shadow-[0_1px_4px_rgba(38,70,83,0.10)] backdrop-blur-[6px]"
            aria-hidden="true"
          >
            toca una foto para voltearla
          </p>
          <div className="crd-ol-team flex w-full max-w-[620px] flex-wrap items-start justify-center gap-5">
            {TEAM.map((member, i) => (
              <div key={member.name} className={i === 1 ? "mt-2.5" : ""}>
                <TeamPolaroid
                  member={member}
                  delay={i * 0.1 + 0.15}
                  animate={isVisible}
                  demoFlipped={
                    demoFlip === member.initials || demoFlip === "all"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
