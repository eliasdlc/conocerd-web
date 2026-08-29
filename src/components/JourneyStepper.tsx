"use client";

import { CHAPTERS, chapterIndexOfScene, SCENE_COUNT } from "@/lib/journey";

// ─────────────────────────────────────────────────────────────────────────────
//  Panel de comando del recorrido — pegado al borde inferior, en teléfono y en
//  escritorio.
//
//  Reemplaza al scroll: cada pulsación avanza a un keyframe completo, así nadie
//  queda "entre escenas" ni se pierde el vuelo de la cámara por deslizar
//  demasiado rápido o por la irregularidad del gesto. El indicador agrupa
//  las 13 escenas en 7 capítulos (13 puntos no se leen en 390px) y el capítulo
//  activo se ensancha en una barra que muestra el avance dentro de él (los 6
//  destinos). Cada capítulo es tocable: salto directo.
//
//  Es el dock de la app en versión de una pieza: barra de cristal de 64 de alto
//  en el teléfono, flotando a 15 de los lados y 21 del borde.
//
//  En escritorio va compacto (44 de alto, 318 de ancho) y a la esquina inferior
//  izquierda, no centrado. Centrado chocaba con todo lo demás que vive centrado
//  abajo: el filtro de categorías del mapa quedaba entero por debajo, y la
//  tarjeta del CTA y el roadmap de Equipo perdían su última línea. La única
//  alternativa era que cada escena reservara una franja inferior, o sea
//  quitarle pantalla a la escena para hacerle sitio a la chrome. La esquina no
//  le cuesta un píxel a nadie: los paneles laterales van centrados en vertical
//  y terminan muy por encima del borde.
//
//  El avance va en `selected`, como todo estado del sistema; el acento se
//  reserva a la acción.
// ─────────────────────────────────────────────────────────────────────────────

export interface JourneyStepperProps {
  index: number;
  onPrev: () => void;
  onNext: () => void;
  /** Salto directo al primer keyframe de un capítulo. */
  onChapter: (sceneIndex: number) => void;
  /** Última escena: el botón de avanzar sale del journey (footer). */
  onEnd: () => void;
  visible: boolean;
}

function Chevron({ dir, className = "" }: { dir: "up" | "down"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`block size-5 desk:size-4 ${className}`}>
      <polyline
        points={dir === "up" ? "5,15 12,8 19,15" : "5,9 12,16 19,9"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function JourneyStepper({
  index,
  onPrev,
  onNext,
  onChapter,
  onEnd,
  visible,
}: JourneyStepperProps) {
  const activeChapter = chapterIndexOfScene(index);
  const isFirst = index === 0;
  const isLast = index === SCENE_COUNT - 1;

  return (
    <div
      role="group"
      aria-label="Navegación del recorrido"
      className={`fixed bottom-[max(21px,env(safe-area-inset-bottom))] left-1/2 z-[95] w-[min(430px,calc(100vw-30px))] -translate-x-1/2 transition-all duration-300 desk:bottom-3 desk:left-4 desk:w-[318px] desk:translate-x-0 ${
        visible ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex h-16 items-center gap-3 rounded-full border border-[var(--crd-glass-line)] bg-[var(--crd-glass)] px-[5px] shadow-e1 backdrop-blur-[24px] backdrop-saturate-[1.8] desk:h-11 desk:gap-2 desk:px-1">
        {/* Escena anterior */}
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Escena anterior"
          className={`flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border border-line bg-paper text-ink transition-opacity duration-200 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2 desk:size-9 ${
            isFirst ? "cursor-default opacity-35" : ""
          }`}
        >
          <Chevron dir="up" />
        </button>

        {/* Capítulo activo + puntos de capítulo tocables */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 desk:gap-1">
          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-label text-micro font-extrabold uppercase tracking-[.15em] text-muted desk:text-[9px] desk:tracking-[.12em]">
            {CHAPTERS[activeChapter].label}
          </span>
          <div className="flex items-center gap-[5px] desk:gap-1">
            {CHAPTERS.map((c, i) => {
              const isActive = i === activeChapter;
              const span = c.last - c.first + 1;
              const fill = isActive ? (index - c.first + 1) / span : 0;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => onChapter(c.first)}
                  aria-label={`Ir a ${c.label}`}
                  aria-current={isActive ? "step" : undefined}
                  className={`h-[7px] flex-none cursor-pointer overflow-hidden rounded-full border-0 p-0 transition-[width,background-color] duration-300 ease-[cubic-bezier(.2,.8,.3,1)] desk:h-[5px] ${
                    isActive
                      ? `bg-line-strong ${span > 1 ? "w-[34px] desk:w-[26px]" : "w-4 desk:w-3"}`
                      : i < activeChapter
                        ? "w-[7px] bg-selected desk:w-[5px]"
                        : "w-[7px] bg-line-strong desk:w-[5px]"
                  }`}
                >
                  <span
                    className="block h-full rounded-full bg-selected transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.3,1)]"
                    style={{ width: `${Math.round(fill * 100)}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Siguiente — en la última escena entrega el paso al footer */}
        <button
          type="button"
          onClick={isLast ? onEnd : onNext}
          aria-label={isLast ? "Ver el pie de página" : "Siguiente escena"}
          className="flex size-[54px] flex-none cursor-pointer items-center justify-center rounded-full bg-selected text-on-selected transition-transform duration-200 active:scale-95 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2 desk:size-[38px]"
        >
          <Chevron dir="down" />
        </button>
      </div>
    </div>
  );
}
