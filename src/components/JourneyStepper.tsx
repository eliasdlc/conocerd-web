"use client";

import { CHAPTERS, chapterIndexOfScene, SCENE_COUNT } from "@/lib/journey";

// ─────────────────────────────────────────────────────────────────────────────
//  Control de pasos del journey en móvil.
//
//  Reemplaza al scroll: cada toque avanza a un keyframe completo, así el
//  usuario nunca se queda "entre escenas". El indicador agrupa las 14 escenas
//  en 7 capítulos — 14 puntos no se leen en 390px — y el capítulo activo se
//  abre en una barra que muestra el avance dentro de él (los 6 destinos).
// ─────────────────────────────────────────────────────────────────────────────

const CORAL = "#F76C4D";
const INK = "#264653";
const MUTED = "#5B6B72";
const LINE = "#EBE6D9";

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

function Chevron({ dir, color }: { dir: "up" | "down"; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" style={{ display: "block" }}>
      <polyline
        points={dir === "up" ? "5,15 12,8 19,15" : "5,9 12,16 19,9"}
        fill="none"
        stroke={color}
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
      className="crd-stepper"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(-50%, 0)" : "translate(-50%, 16px)",
        pointerEvents: visible ? "auto" : "none",
      }}
      role="group"
      aria-label="Navegación del recorrido"
    >
      {/* Pista anterior */}
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst}
        aria-label="Escena anterior"
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 999,
          border: `1.5px solid ${LINE}`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isFirst ? "default" : "pointer",
          opacity: isFirst ? 0.35 : 1,
          transition: "opacity .2s",
          padding: 0,
        }}
      >
        <Chevron dir="up" color={INK} />
      </button>

      {/* Capítulo + progreso */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 10.5,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            color: MUTED,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {CHAPTERS[activeChapter].label}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
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
                style={{
                  width: isActive ? (span > 1 ? 30 : 16) : 7,
                  height: 7,
                  padding: 0,
                  border: "none",
                  borderRadius: 999,
                  background: isActive ? "rgba(247,108,77,0.24)" : i < activeChapter ? "#F9BFB0" : LINE,
                  cursor: "pointer",
                  transition: "width .35s cubic-bezier(.2,.8,.3,1), background .3s",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: "block",
                    height: "100%",
                    width: `${Math.round(fill * 100)}%`,
                    background: CORAL,
                    borderRadius: 999,
                    transition: "width .45s cubic-bezier(.2,.8,.3,1)",
                  }}
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
        style={{
          width: 46,
          height: 46,
          flexShrink: 0,
          borderRadius: 999,
          border: "none",
          background: CORAL,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(247,108,77,0.38)",
          padding: 0,
        }}
      >
        <Chevron dir="down" color="#fff" />
      </button>
    </div>
  );
}
