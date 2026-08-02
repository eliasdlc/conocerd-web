"use client";
// Variante 5 de El equipo — "Manifiesto tipográfico".
//
// La apuesta es texto y nada más: un manifiesto en Fraunces al centro, sobre
// un velo crema radial que protege la lectura sin tapar el mapa de Santiago
// (los bordes quedan libres para que la ciudad respire). Cada línea entra con
// stagger cuando la escena se activa — trigger-driven, sin motion en reposo.
// Al pie, una sola línea mono con los dos nombres y roles y el enlace de
// contacto. La personalidad la pone el copy, no el adorno.

import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { useScene } from "@/context/SceneContext";

// ─── Copy ─────────────────────────────────────────────────────────────────────
// Tres frases, una idea cada una: origen → crianza → motivo. El acento coral
// abre ("de aquí") y cierra ("el resort") el arco; la línea del medio va en
// redonda para que el énfasis no se vuelva ruido.

const LINES: { text: React.ReactNode; delay: number }[] = [
  {
    text: (
      <>
        Somos <em className="crd-accent">de aquí</em>.
      </>
    ),
    delay: 0.05,
  },
  {
    text: <>Crecimos entre estas playas y estas lomas.</>,
    delay: 0.2,
  },
  {
    text: (
      <>
        Y nos cansamos de que el mundo solo conozca{" "}
        <em className="crd-accent">el resort</em>.
      </>
    ),
    delay: 0.35,
  },
];

const TEAM_LINE = [
  { name: "Brauny Núñez", role: "Estrategia" },
  { name: "Elías de la Cruz", role: "Tecnología" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipoManifiesto() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";

  return (
    <div
      className={`crd-ol-equipo absolute inset-0 z-10 flex flex-col items-center justify-center px-6 py-16 text-center transition-opacity duration-500 ease-in-out ${
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isVisible}
      inert={!isVisible}
    >
      {/* Velo crema radial: denso detrás del texto, transparente en los bordes
          para que Santiago siga presente. Es la única "superficie" de la
          variante — nada de paneles. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 58% 54% at 50% 46%, rgba(253,248,240,0.95) 0%, rgba(253,248,240,0.85) 46%, rgba(253,248,240,0.32) 74%, rgba(253,248,240,0) 100%)",
        }}
      />

      {/* `my-auto`: en móvil el global .crd-ol-equipo fuerza justify-start;
          los márgenes auto recentran el manifiesto sin pelear con ese CSS. */}
      <div className="relative my-auto flex max-w-[820px] flex-col items-center">
        <Kicker
          icon="groups"
          index="05"
          tone="coral"
          className={`mb-6 ${isVisible ? "animate-slide-up" : ""}`}
        >
          El equipo
        </Kicker>

        {/* El manifiesto ES el titular de la escena. Cada línea es un bloque
            con su propio delay: entran una detrás de otra al activarse la
            escena (reduced-motion las colapsa vía la regla global). */}
        <h2 className="m-0 font-display text-[clamp(27px,4vw,52px)] font-bold leading-[1.12] tracking-[-.014em] text-ink-2">
          {LINES.map((line, i) => (
            <span
              key={i}
              className={`block text-balance [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_18px_rgba(253,248,240,0.65)] ${
                i > 0 ? "mt-[0.3em]" : ""
              } ${isVisible ? "animate-slide-up" : ""}`}
              style={isVisible ? { animationDelay: `${line.delay}s` } : undefined}
            >
              {line.text}
            </span>
          ))}
        </h2>

        {/* Firma: una sola línea mono — nombres, roles y contacto. El enlace
            conserva un target de 44px con padding compensado para no romper
            la altura visual de la línea. */}
        <p
          className={`m-0 mt-9 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-micro font-bold uppercase tracking-[.14em] text-[#3A5560] [text-shadow:0_1px_2px_rgba(253,248,240,0.9)] max-[899px]:flex-col ${
            isVisible ? "animate-slide-up" : ""
          }`}
          style={isVisible ? { animationDelay: "0.55s" } : undefined}
        >
          {/* Las rayas viven DENTRO del grupo siguiente (nowrap) para no
              quedar colgando; en móvil la línea se apila en columna y las
              rayas sobran. */}
          {TEAM_LINE.map((member, i) => (
            <span key={member.name} className="whitespace-nowrap">
              {i > 0 && (
                <span aria-hidden="true" className="mr-3 text-ink/30 max-[899px]:hidden">
                  —
                </span>
              )}
              {member.name} <span className="opacity-45">·</span> {member.role}
            </span>
          ))}
          <span className="whitespace-nowrap">
            <span aria-hidden="true" className="mr-3 text-ink/30 max-[899px]:hidden">
              —
            </span>
            <a
              href="mailto:contacto@conocerd.app"
              className="-my-3 inline-flex min-h-[44px] items-center gap-1 py-3 text-coral-ink underline decoration-coral-ink/40 underline-offset-4 transition-colors hover:text-coral hover:decoration-coral/50 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral-ink"
            >
              Escríbenos
              <Icon name="arrow_outward" className="text-[13px]" aria-hidden="true" />
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
