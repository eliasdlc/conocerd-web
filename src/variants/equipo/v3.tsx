"use client";
// Variante 3 de El equipo — "Conversación de fundadores".
//
// Humaniza sin fotos: la escena es el chat real entre Brauny y Elías que dio
// origen a ConoceRD, en un panel estilo WhatsApp con la paleta de la casa.
// Las burbujas entran escalonadas al activarse la escena (trigger-driven, no
// motion en reposo). Debajo, dos cards compactas con nombre/rol/bio.

import { useReducedMotion } from "motion/react";
import { useScene } from "@/context/SceneContext";
import Kicker from "@/components/Kicker";

// ─── Data ─────────────────────────────────────────────────────────────────────

type Founder = {
  id: "brauny" | "elias";
  name: string;
  shortName: string;
  role: string;
  bio: string;
  initials: string;
  bg: string;
  color: string;
};

const FOUNDERS: Founder[] = [
  {
    id: "brauny",
    name: "Brauny Núñez",
    shortName: "Brauny",
    role: "Líder de Proyecto y Estrategia",
    bio: "Estrategia, marca y modelo de negocio. La visión de a dónde va esto.",
    initials: "BN",
    bg: "#FFE7DF",
    color: "#B23410",
  },
  {
    id: "elias",
    name: "Elías de la Cruz",
    shortName: "Elías",
    role: "Desarrollador y Líder Tecnológico",
    bio: "Arquitectura, app y web. Todas las decisiones técnicas pasan por aquí.",
    initials: "EC",
    bg: "#C6F3EB",
    color: "#0C6A60",
  },
];

type Message = {
  from: Founder["id"];
  text: string;
  time: string;
};

// La conversación es de los propios fundadores — nada de testimonios inventados.
const CHAT: Message[] = [
  {
    from: "brauny",
    text: "¿Tú sabías que la mayoría de los viajeros que llegan al país nunca sale del resort?",
    time: "9:12 p. m.",
  },
  {
    from: "elias",
    text: "Y no son solo ellos. Yo conocí el Salto de Jimenoa el año pasado… y eso queda aquí al lado.",
    time: "9:13 p. m.",
  },
  {
    from: "brauny",
    text: "Eso mismo. Hay un país entero que no sale en las guías, y negocios locales que nadie encuentra.",
    time: "9:13 p. m.",
  },
  {
    from: "elias",
    text: "Por eso hay que hacerla: pa' que la gente conozca el país de verdad y lo que se gasta se quede en la zona.",
    time: "9:14 p. m.",
  },
  {
    from: "brauny",
    text: "Dale. Tú pones el código, yo pongo la calle.",
    time: "9:15 p. m.",
  },
];

const byId = (id: Founder["id"]) => FOUNDERS.find((f) => f.id === id)!;

// ─── Piezas de chat ───────────────────────────────────────────────────────────

function Avatar({
  founder,
  size,
  className = "",
}: {
  founder: Founder;
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full font-display font-bold ${className}`}
      style={{
        width: size,
        height: size,
        background: founder.bg,
        color: founder.color,
        fontSize: size * 0.38,
      }}
    >
      {founder.initials}
    </span>
  );
}

/** Doble check de leído, en mint (guiño WhatsApp con color de la casa). */
function ReadTicks() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 12"
      className="inline-block h-[11px] w-[20px] text-mint-ink"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 6.5 5 10 12 2.5" />
      <path d="M10 8.5 11.5 10 18.5 2.5" />
    </svg>
  );
}

function ChatBubble({
  message,
  firstOfRun,
  animate,
  delay,
}: {
  message: Message;
  firstOfRun: boolean;
  animate: boolean;
  delay: number;
}) {
  const founder = byId(message.from);
  const sent = message.from === "elias";

  return (
    <li
      className={`flex items-start gap-2 ${sent ? "flex-row-reverse" : ""} ${
        animate ? "animate-slide-up" : ""
      }`}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      {/* Avatar solo en la primera burbuja de cada turno; luego, espaciador. */}
      {firstOfRun ? (
        <Avatar founder={founder} size={28} className="mb-0.5 shadow-card" />
      ) : (
        <span aria-hidden="true" className="w-7 shrink-0" />
      )}

      <div
        className={`max-w-[82%] rounded-2xl border px-3.5 py-2 shadow-card ${
          sent
            ? `border-mint/35 bg-mint-soft ${firstOfRun ? "rounded-tr-[6px]" : ""}`
            : `border-line bg-white ${firstOfRun ? "rounded-tl-[6px]" : ""}`
        }`}
      >
        {firstOfRun && (
          <div
            className="mb-0.5 text-mini font-bold leading-none"
            style={{ color: founder.color }}
          >
            {founder.shortName}
          </div>
        )}
        <p className="m-0 text-[13.5px] leading-[1.45] text-ink">
          <span className="sr-only">{founder.shortName} dice: </span>
          {message.text}
        </p>
        <div className="mt-0.5 flex items-center justify-end gap-1 font-mono text-micro leading-none text-muted">
          <span>{message.time}</span>
          {sent && <ReadTicks />}
        </div>
      </div>
    </li>
  );
}

// ─── Card compacta de fundador ────────────────────────────────────────────────

function FounderCard({
  founder,
  animate,
  delay,
}: {
  founder: Founder;
  animate: boolean;
  delay: number;
}) {
  return (
    <div
      className={`flex min-w-[250px] max-w-[320px] flex-[1_1_250px] items-start gap-3 rounded-panel border-[1.5px] border-line bg-cream/94 px-4 py-3.5 shadow-panel backdrop-blur-[14px] ${
        animate ? "animate-slide-up" : ""
      }`}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      <Avatar founder={founder} size={44} className="mt-0.5 shadow-card" />
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-bold leading-[1.2] text-ink">
          {founder.name}
        </h3>
        <div
          className="mt-0.5 text-mini font-bold leading-[1.3]"
          style={{ color: founder.color }}
        >
          {founder.role}
        </div>
        <p className="m-0 mt-1 text-tiny leading-[1.45] text-muted">
          {founder.bio}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipoConversacion() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";
  const reduceMotion = !!useReducedMotion();

  // Cadencia de conversación: cada burbuja "llega" tras la anterior. Con
  // reduced-motion todo aparece a la vez (el keyframe global ya dura ~0ms,
  // pero el delay también debe irse para no dejar burbujas invisibles).
  const d = (t: number) => (reduceMotion ? 0 : t);

  // Índice de la primera burbuja de cada turno (para avatar + esquina).
  const firstOfRun = CHAT.map(
    (message, i) => i === 0 || CHAT[i - 1].from !== message.from,
  );

  return (
    <div
      className={`crd-ol-equipo absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 pb-8 pt-[84px] transition-opacity duration-500 ease-in-out ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      {/* Heading */}
      <div className={`shrink-0 text-center ${isVisible ? "animate-slide-up" : ""}`}>
        <Kicker icon="chat" index="05" tone="coral" className="mb-2">
          El equipo
        </Kicker>
        <h2 className="m-0 font-display text-[clamp(20px,2.6vw,32px)] font-bold leading-[1.08] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
          Esto empezó con una <em className="crd-accent">conversación</em>
        </h2>
        <p className="mx-auto mt-1.5 max-w-[440px] text-sm leading-[1.5] text-[#3A5560] [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
          Dos dominicanos construyendo desde Santiago la app que le faltaba al país.
        </p>
      </div>

      {/* Chat de fundadores */}
      <section
        aria-label="Conversación entre Brauny y Elías, fundadores de ConoceRD"
        className={`w-full max-w-[460px] shrink-0 overflow-hidden rounded-panel border border-line bg-cream-2 shadow-modal ${
          isVisible ? "animate-slide-up" : ""
        }`}
        style={isVisible ? { animationDelay: `${d(0.1)}s` } : undefined}
      >
        {/* Barra del chat */}
        <div className="flex items-center gap-2.5 border-b border-line bg-white px-4 py-2.5">
          <div className="flex" aria-hidden="true">
            <Avatar founder={FOUNDERS[0]} size={30} className="ring-2 ring-white" />
            <Avatar
              founder={FOUNDERS[1]}
              size={30}
              className="-ml-2 ring-2 ring-white"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-tiny font-bold leading-[1.2] text-ink">
              Brauny y Elías
            </div>
            <div className="truncate text-micro leading-[1.3] text-muted">
              fundadores de ConoceRD
            </div>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-[.1em] text-mint-ink">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-mint" />
            en línea
          </span>
        </div>

        {/* Mensajes */}
        <div className="px-3.5 py-3.5">
          <div
            className={`mb-3 text-center ${isVisible ? "animate-slide-up" : ""}`}
            style={isVisible ? { animationDelay: `${d(0.18)}s` } : undefined}
          >
            <span className="inline-block rounded-chip bg-white px-3 py-1 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted shadow-card">
              Santiago · donde empezó esto
            </span>
          </div>
          <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
            {CHAT.map((message, i) => (
              <ChatBubble
                key={i}
                message={message}
                firstOfRun={firstOfRun[i]}
                animate={isVisible}
                delay={d(0.25 + i * 0.14)}
              />
            ))}
          </ol>
        </div>
      </section>

      {/* Cards compactas de los fundadores */}
      <div className="crd-ol-team flex w-full max-w-[660px] shrink-0 flex-wrap items-stretch justify-center gap-3.5">
        {FOUNDERS.map((founder, i) => (
          <FounderCard
            key={founder.id}
            founder={founder}
            animate={isVisible}
            delay={d(0.95 + i * 0.12)}
          />
        ))}
      </div>
    </div>
  );
}
