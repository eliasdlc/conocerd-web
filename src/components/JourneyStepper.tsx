"use client";

import { CHAPTERS, chapterIndexOfScene, SCENE_COUNT } from "@/lib/journey";

// ─────────────────────────────────────────────────────────────────────────────
//  Panel de comando del journey en MÓVIL — pegado al borde inferior.
//
//  Reemplaza al scroll (decisión del dueño, ago 2026): cada toque avanza a un
//  keyframe completo, así el usuario nunca queda "entre escenas" ni se pierde
//  el vuelo de la cámara por deslizar demasiado rápido. El indicador agrupa
//  las 13 escenas en 7 capítulos —13 puntos no se leen en 390px— y el capítulo
//  activo se ensancha en una barra que muestra el avance dentro de él (los 6
//  destinos). Cada capítulo es tocable: salto directo.
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
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`block size-5 ${className}`}>
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
      className={`fixed bottom-0 left-1/2 z-[95] w-[min(430px,calc(100vw-20px))] -translate-x-1/2 pb-[max(10px,env(safe-area-inset-bottom))] transition-all duration-300 desk:hidden ${
        visible ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 rounded-full bg-cream/95 py-2 pl-2 pr-2 shadow-e1 backdrop-blur-[8px]">
        {/* Escena anterior */}
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Escena anterior"
          className={`flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink/12 bg-white text-ink transition-opacity duration-200 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2 ${
            isFirst ? "cursor-default opacity-35" : ""
          }`}
        >
          <Chevron dir="up" />
        </button>

        {/* Capítulo activo + puntos de capítulo tocables */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-label text-micro font-extrabold uppercase tracking-[.15em] text-muted">
            {CHAPTERS[activeChapter].label}
          </span>
          <div className="flex items-center gap-[5px]">
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
                  className={`h-[7px] flex-none cursor-pointer overflow-hidden rounded-full border-0 p-0 transition-[width,background-color] duration-300 ease-[cubic-bezier(.2,.8,.3,1)] ${
                    isActive
                      ? `bg-coral/25 ${span > 1 ? "w-[30px]" : "w-4"}`
                      : i < activeChapter
                        ? "w-[7px] bg-coral/45"
                        : "w-[7px] bg-ink/12"
                  }`}
                >
                  <span
                    className="block h-full rounded-full bg-coral transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.3,1)]"
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
          className="flex size-12 flex-none cursor-pointer items-center justify-center rounded-full bg-coral text-white shadow-[0_6px_18px_rgba(247,108,77,0.38)] transition-transform duration-200 active:scale-95 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2"
        >
          <Chevron dir="down" />
        </button>
      </div>
    </div>
  );
}
