"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  El equipo — síntesis del rework jul-ago 2026 (nació como la variante v6
//  del sistema de variantes, promovida a sección real).
//
//  · La frase manifiesto de la v5 abre la escena con una entrada suave
//    (blur + rise, línea por línea, trigger-driven).
//  · Después "caen" las dos polaroids sobre la mesa, pegadas con cintitas.
//    Fixes sobre la v1: el hover ya no hace el peek 3D que glitcheaba (ahora
//    es un lift sutil del papel), el dorso se lee en sans —no en manuscrito—
//    y el volteo tiene un arco con rebote leve en vez del giro seco.
//  · El roadmap de "en qué estamos" (idea de la v2) vive en una card al lado:
//    los 5 pasos oficiales de la hoja de ruta, vamos por el 3, con pulso
//    EN VIVO como si se actualizara al momento.
//  · La estampa ConoceRD va pegada a la card del roadmap.
//  · Nada marcado en el mapa (se quitó el pin de Santiago).
//
//  Para captura headless: `&demo-flip=BN|EC|all` monta esa carta ya volteada.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Caveat } from "next/font/google";
import { useReducedMotion } from "motion/react";
import Icon from "@/components/Icon";
import { useScene } from "@/context/SceneContext";
import { PANEL_SOLID } from "@/lib/surfaces";
import StampCRD from "@/components/StampCRD";

// La manuscrita se declara aquí y no en el layout raíz porque tiene un solo uso
// en todo el producto: la firma del dorso de estas polaroids. Declarada arriba,
// se precargaba en cada página del sitio (incluida /privacidad) para una firma
// que vive al final del journey y sólo aparece al voltear la carta.
//
// Se aplica con `className` y no con una variable CSS: un `--font-caveat` que
// vive fuera de `:root` no puede resolver el rol `--font-hand`, que se computa
// allí. Es tinta de contenido, como una foto, no un rol del sistema.
//
// `preload: false`: no compite por ancho de banda con el hero. El navegador la
// pide cuando llega a pintarla.
const caveat = Caveat({ subsets: ["latin"], display: "swap", preload: false });

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
    photo: "/assets/equipo-brauny.webp",
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
    photo: "/assets/equipo-elias.webp",
  },
];

// La frase de la v5: origen → crianza → motivo.
const LINES: { text: React.ReactNode; delay: number }[] = [
  {
    text: (
      <>
        Somos <em className="crd-accent">de aquí</em>.
      </>
    ),
    delay: 0.05,
  },
  { text: <>Crecimos entre estas playas y estas lomas.</>, delay: 0.22 },
  {
    text: (
      <>
        Y nos cansamos de que el mundo solo conozca{" "}
        <em className="crd-accent">el resort</em>.
      </>
    ),
    delay: 0.39,
  },
];

// Hoja de ruta oficial de ConoceRD (la pasó el dueño, ago 2026).
type Step = { name: string; detail: string };
const ROADMAP: Step[] = [
  { name: "Idea desarrollada y validada", detail: "Encuestas a negocios y viajeros, modelo de negocio definido." },
  { name: "MVP funcional", detail: "Mapa, rutas, navegación GPS, diario de viaje y cuentas." },
  { name: "Piloto con negocios y usuarios reales", detail: "Prueba en las provincias con mayor flujo turístico, membresía gratis los primeros 2 meses." },
  { name: "Lanzamiento a nivel nacional", detail: "Tiendas de aplicaciones, web y equipo comercial propio." },
  { name: "Nuevas fuentes de ingreso", detail: "Publicidad y comisiones por reserva sobre la base de negocios ya suscritos." },
];
const CURRENT_STEP = 2; // índice 0-based: vamos por el paso 3

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

// ─── Cintita adhesiva (esquina) ───────────────────────────────────────────────

function CornerTape({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-[16px] w-[52px] border-x border-ink/10 bg-[linear-gradient(180deg,rgba(255,255,255,.6),rgba(253,248,240,.4))] shadow-[0_1px_2px_rgba(38,70,83,0.10)] ${className}`}
    />
  );
}

// ─── Polaroid con flip 3D (fixes de hover, dorso y volteo) ───────────────────

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
  const reducedMotion = useReducedMotion();

  // El pulso de "papel que se levanta" se re-dispara con WAAPI sobre el MISMO
  // nodo. Antes iba con un key={flipped} que remontaba el subárbol entero y el
  // botón nuevo nacía ya rotado: la transición del volteo nunca corría y el
  // cambio se veía instantáneo.
  const popRef = useRef<HTMLSpanElement | null>(null);
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (reducedMotion) return;
    popRef.current?.animate(
      [
        { transform: "scale(1) translateY(0)" },
        { transform: "scale(1.04) translateY(-6px)", offset: 0.45 },
        { transform: "scale(1) translateY(0)" },
      ],
      { duration: 620, easing: "ease-in-out" }
    );
  }, [flipped, reducedMotion]);

  return (
    <div
      className={`w-[clamp(150px,42vw,224px)] desk:w-[clamp(170px,16vw,224px)] ${animate ? "equipo6-drop" : "opacity-0"}`}
      style={{
        rotate: `${member.tilt}deg`,
        ...(animate ? { animationDelay: `${delay}s` } : undefined),
      }}
    >
      {/* El lift de hover vive AQUÍ, fuera del elemento que rota en Y: mover
          la carta bajo el cursor con rotateY era el "bug rarísimo" del peek. */}
      <div className="transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.3,1)] hover:-translate-y-1 [perspective:1100px]">
        <span ref={popRef} className="block">
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            aria-expanded={flipped}
            aria-label={
              flipped
                ? `Volver a la foto de ${member.name}`
                : `Voltear la foto de ${member.name} y leer su bio`
            }
            className="relative block w-full cursor-pointer appearance-none rounded-md border-0 bg-transparent p-0 text-left text-[inherit] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral-ink"
            style={{
              transform: `rotateY(${flipped ? 180 : 0}deg)`,
              // Sin overshoot: con 180° el rebote enseñaba el dorso espejado
              // un instante. El "rebote" vive en el pulso del wrapper.
              transition: reducedMotion
                ? "none"
                : "transform .62s cubic-bezier(0.2, 0.85, 0.25, 1)",
            }}
          >
            {/* Frente: la foto pegada al papel, con sus cintitas */}
            <span
              className="crd-tape relative block rounded-[6px] border border-line bg-[#FFFDF7] px-3 pb-0 pt-3 shadow-e1 [backface-visibility:hidden]"
              aria-hidden={flipped}
            >
              <CornerTape className="-right-3.5 top-5 rotate-[48deg]" />
              <span
                className="relative block aspect-square w-full overflow-hidden rounded-[3px]"
                style={{ background: member.bg }}
              >
                {member.photo ? (
                  <Image
                    src={member.photo}
                    alt=""
                    fill
                    sizes="224px"
                    className="object-cover [filter:saturate(1.06)_contrast(1.03)_sepia(.07)]"
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center font-display text-[clamp(42px,5vw,64px)] font-bold"
                    style={{ color: member.color }}
                  >
                    {member.initials}
                  </span>
                )}
                {/* Señal de que la foto se voltea */}
                <span
                  className="absolute bottom-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/70 text-ink backdrop-blur-[12px]"
                  aria-hidden="true"
                >
                  <FlipGlyph />
                </span>
              </span>
              <span className="block pb-3 pt-2.5">
                {/* El nombre deja la manuscrita: Caveat baja a un solo uso en
                    todo el producto, y es la firma del dorso. */}
                <span className="block font-display text-lg font-bold leading-tight tracking-[-.02em] text-ink">
                  {member.name}
                </span>
                <span
                  className="mt-1 block font-label text-mini font-bold leading-[1.35]"
                  style={{ color: member.color }}
                >
                  {member.role}
                </span>
              </span>
            </span>

            {/* Dorso: la bio en sans legible; solo la firma va a mano */}
            <span
              className="crd-tape absolute inset-0 flex flex-col overflow-hidden rounded-[6px] border border-line bg-[#FFFDF7] px-3.5 pb-3 pt-3.5 shadow-e1 [backface-visibility:hidden] [transform:rotateY(180deg)]"
              aria-hidden={!flipped}
            >
              {/* El área va en mintInk en las dos personas: el dorso no
                  repite el tono del rol, que ya vive en el frente. */}
              <span className="block font-label text-micro font-extrabold uppercase tracking-[.12em] text-mint-ink">
                {member.tags}
              </span>
              <span className="mt-1.5 block flex-1 overflow-y-auto text-[11.5px] leading-[1.5] text-ink [scrollbar-width:thin]">
                {member.bioLong}
              </span>
              <span className="mt-1.5 flex items-end justify-between gap-2">
                <span
                  className={`${caveat.className} block -rotate-2 text-xl font-bold leading-none`}
                  style={{ color: member.color }}
                >
                  — {member.name.split(" ")[0]}
                </span>
                <span className="flex items-center gap-1 text-micro text-muted">
                  <FlipGlyph size={11} />
                  volver
                </span>
              </span>
            </span>
          </button>
        </span>
      </div>
    </div>
  );
}

// ─── Roadmap "en vivo" ────────────────────────────────────────────────────────

// El anillo de 4 en `paper` no es decoración: es lo que tapa el riel por
// detrás del punto. El resplandor lo lleva SÓLO el paso actual, porque es el
// único que lleva acento: un paso hecho con resplandor diría que sigue vivo.
function StepDot({ state }: { state: "done" | "current" | "next" }) {
  if (state === "done") {
    return (
      <span className="relative z-[1] flex size-7 flex-none items-center justify-center rounded-full bg-mint-ink text-white ring-4 ring-paper">
        <Icon name="check" className="text-[13px]" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative z-[1] flex size-7 flex-none items-center justify-center rounded-full bg-coral text-white shadow-e2 ring-4 ring-paper">
        <Icon name="rocket_launch" className="text-[13px]" />
      </span>
    );
  }
  return (
    <span className="relative z-[1] flex size-7 flex-none items-center justify-center rounded-full border-2 border-dashed border-line-strong bg-paper ring-4 ring-paper" />
  );
}

function RoadmapCard({ visible }: { visible: boolean }) {
  const done = CURRENT_STEP; // pasos completados
  return (
    <section
      aria-label="En qué va ConoceRD ahora mismo"
      className={`relative w-[clamp(280px,26vw,352px)] rounded-surface ${PANEL_SOLID} px-5 pb-5 pt-4 shadow-e1 max-[899px]:w-full ${
        visible ? "animate-slide-up" : "opacity-0"
      }`}
      style={visible ? { animationDelay: "0.55s" } : undefined}
    >
      {/* La estampa ConoceRD, pegada a la card */}
      {/* En ventanas bajas la tarjeta sube y el voladizo del sello alcanzaba la
          última línea del manifiesto: allí se apoya más dentro (globals.css). */}
      <div aria-hidden="true" className="crd-eq-sello absolute -top-9 right-1 desk:-top-6 desk:-right-7">
        <StampCRD size={106} rotate={8} line1="SANTIAGO, RD" line2="· EST. 2026 ·" />
      </div>

      <h3 className="m-0 pr-16 font-display text-[19px] font-bold leading-tight text-ink">
        En esto estamos <em className="crd-accent">ahora mismo</em>
      </h3>

      {/* Riel de avance: se llena al entrar la escena, con 0.9s de retardo.
          Va en `selected` y no en el acento: el avance es un estado. */}
      <div className="mt-2.5 h-[2px] overflow-hidden rounded-full bg-line-strong" aria-hidden="true">
        <div
          className="h-full rounded-full bg-selected transition-[width] duration-1000 ease-out"
          style={{
            width: visible ? `${((CURRENT_STEP + 0.5) / ROADMAP.length) * 100}%` : "0%",
            transitionDelay: "0.9s",
          }}
        />
      </div>

      <ol className="relative m-0 mt-3.5 flex list-none flex-col gap-2.5 p-0">
        {/* raíl punteado que une los pasos */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[13.5px] top-4 w-0 border-l-2 border-dashed border-line-strong"
        />
        {ROADMAP.map((s, i) => {
          const state = i < done ? "done" : i === done ? "current" : "next";
          return (
            <li key={s.name} className="flex items-start gap-2.5">
              <StepDot state={state} />
              <div className="min-w-0 pt-0.5">
                <span
                  className={`block font-label text-mini leading-[1.25] ${
                    state === "current" ? "font-bold text-ink" : "font-semibold text-muted"
                  }`}
                >
                  {s.name}
                </span>
                <p className={`m-0 mt-0.5 text-mini leading-[1.4] ${state === "next" ? "text-muted-2" : "text-muted"}`}>
                  {s.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const EQ6_CSS = `
@keyframes equipo6-line {
  from { opacity: 0; transform: translateY(16px); filter: blur(7px); }
  to   { opacity: 1; transform: none; filter: blur(0); }
}
.equipo6-line { animation: equipo6-line .7s cubic-bezier(.2,.7,.25,1) both; }
@keyframes equipo6-drop {
  0%   { opacity: 0; transform: translateY(-52px) scale(1.05); }
  70%  { opacity: 1; transform: translateY(4px) scale(1); }
  100% { opacity: 1; transform: none; }
}
.equipo6-drop { animation: equipo6-drop .62s cubic-bezier(.25,.9,.3,1.1) both; }
@media (prefers-reduced-motion: reduce) {
  .equipo6-line, .equipo6-drop { animation: none; opacity: 1; }
}
`;

export default function EquipoSection() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";

  // Sólo para auto-verificación en captura headless: ?demo-flip=BN|EC|all
  // monta esa polaroid ya volteada. En uso normal el param no existe.
  const demoFlip =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("demo-flip");

  return (
    <>
      <style>{EQ6_CSS}</style>

      {/* Sin pin ni etiqueta en el mapa: la escena vive en el overlay. */}
      <div
        // Las dos franjas del cromo flotante, en los dos viewports: el panel de
        // pasos ya no es sólo del teléfono. Con `pb-8` la última línea del
        // manifiesto pasaba por detrás del cristal del panel hasta en 1440x900.
        className={`crd-ol-equipo absolute inset-0 z-10 flex flex-col items-center justify-center gap-[clamp(18px,3.2vh,30px)] px-6 pb-[calc(16px+var(--crd-stepper-h))] pt-[var(--crd-nav-clear)] transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isVisible}
        inert={!isVisible}
      >
        {/* Velo crema radial (v5): protege la lectura sin tapar Santiago. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 62% 58% at 50% 44%, rgba(253,248,240,0.94) 0%, rgba(253,248,240,0.82) 48%, rgba(253,248,240,0.3) 76%, rgba(253,248,240,0) 100%)",
          }}
        />

        {/* La frase manifiesto (v5), con entrada suave línea a línea */}
        <div className="relative max-w-[780px] text-center">
          <h2 className="crd-eq-manifiesto m-0 font-display text-[clamp(22px,3vw,40px)] font-bold leading-[1.14] tracking-[-.014em] text-ink-2">
            {LINES.map((line, i) => (
              <span
                key={i}
                className={`block text-balance [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_18px_rgba(253,248,240,0.65)] ${
                  i > 0 ? "mt-[0.22em]" : ""
                } ${isVisible ? "equipo6-line" : "opacity-0"}`}
                style={isVisible ? { animationDelay: `${line.delay}s` } : undefined}
              >
                {line.text}
              </span>
            ))}
          </h2>
        </div>

        {/* La mesa: polaroids que caen + roadmap en vivo con la estampa */}
        <div className="relative flex w-full max-w-[860px] items-center justify-center gap-[clamp(20px,3.5vw,44px)] max-[899px]:flex-col">
          <div className="flex flex-col items-center gap-2">
            <div className="crd-ol-team flex items-start justify-center gap-5">
              {TEAM.map((member, i) => (
                <div key={member.name} className={i === 1 ? "mt-3" : ""}>
                  <TeamPolaroid
                    member={member}
                    delay={i * 0.14 + 0.5}
                    animate={isVisible}
                    demoFlipped={demoFlip === member.initials || demoFlip === "all"}
                  />
                </div>
              ))}
            </div>
            {/* La pista es interfaz, no contenido, así que deja la manuscrita:
                Caveat sólo vive en la firma del dorso. Píldora de cristal del
                tema, como todo lo que flota sobre el mapa. */}
            <p
              className={`m-0 rounded-full border border-[var(--crd-glass-line)] bg-[var(--crd-glass)] px-3.5 py-1.5 font-label text-micro font-extrabold uppercase leading-none tracking-[.12em] text-muted backdrop-blur-[24px] backdrop-saturate-[1.8] ${
                isVisible ? "equipo6-line" : "opacity-0"
              }`}
              style={isVisible ? { animationDelay: "0.85s" } : undefined}
              aria-hidden="true"
            >
              toca una foto para voltearla
            </p>
          </div>

          <RoadmapCard visible={isVisible} />
        </div>
      </div>
    </>
  );
}
