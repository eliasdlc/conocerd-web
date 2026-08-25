"use client";

import { useId } from "react";
import { PIN_SILHOUETTE, PIN_VIEWBOX, PIN_ASPECT, PIN_WINDOW } from "@/components/BrandPin";

// ─────────────────────────────────────────────────────────────────────────────
//  Pin de meta: la última parada de un recorrido.
//
//  Antes era una banderita a cuadros con asta, que no pertenecía a ninguna
//  familia del producto. Ahora es el pin de la marca —la misma silueta que
//  BrandPin, punta asimétrica incluida— con el damero ocupando la ventana en
//  lugar de la flor de Bayahíbe. Un solo pin, dos contenidos.
//
//  La ventana aquí NO es un hueco: el damero necesita su propio fondo claro
//  para leerse sobre cartografía de cualquier tono.
// ─────────────────────────────────────────────────────────────────────────────

/** Damero de 6 × 6 sobre el cuadrado que envuelve la ventana, recortado al
 *  disco. Las casillas del borde quedan como cuñas y eso es lo que hace que se
 *  lea como bandera de meta y no como tablero. */
const GRID = 6;
const CELL = (PIN_WINDOW.r * 2) / GRID;
const ORIGIN_X = PIN_WINDOW.cx - PIN_WINDOW.r;
const ORIGIN_Y = PIN_WINDOW.cy - PIN_WINDOW.r;

const CELLS: Array<{ x: number; y: number }> = [];
for (let row = 0; row < GRID; row++) {
  for (let col = 0; col < GRID; col++) {
    if ((row + col) % 2 !== 1) continue;
    CELLS.push({ x: ORIGIN_X + col * CELL, y: ORIGIN_Y + row * CELL });
  }
}

export interface GoalPinProps {
  /** Ancho en px. El alto es 1.25 veces esto. */
  size?: number;
  /** Tinta de la silueta y de las casillas oscuras del damero. */
  color?: string;
  /** Fondo del damero. */
  background?: string;
  className?: string;
}

export function GoalPin({
  size = 34,
  color = "#0F1A2E",
  background = "#FFFFFF",
  className = "",
}: GoalPinProps) {
  const clipId = useId();

  return (
    <svg
      viewBox={PIN_VIEWBOX}
      width={size}
      height={size * PIN_ASPECT}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={PIN_WINDOW.cx} cy={PIN_WINDOW.cy} r={PIN_WINDOW.r} />
        </clipPath>
      </defs>
      <path d={PIN_SILHOUETTE} fill={color} />
      <circle cx={PIN_WINDOW.cx} cy={PIN_WINDOW.cy} r={PIN_WINDOW.r} fill={background} />
      <g clipPath={`url(#${clipId})`} fill={color}>
        {CELLS.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={CELL} height={CELL} />
        ))}
      </g>
    </svg>
  );
}
