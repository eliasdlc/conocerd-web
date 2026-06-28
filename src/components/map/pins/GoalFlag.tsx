"use client";

import { useId } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Bandera de meta (#4). Cuadros 4×3 + asta. Marca la última parada / meta de
//  un recorrido. Portado de conocerd_map_pins.html.
// ─────────────────────────────────────────────────────────────────────────────

const DARK = "#1A1A1A";
const LIGHT = "#ffffff";

// Patrón 4×3 (true = oscuro), tablero de ajedrez.
const ROWS = [
  [true, false, true, false],
  [false, true, false, true],
  [true, false, true, false],
];

const COL_X = [25.76, 38.64, 51.52, 64.4];
const ROW_Y = [7.36, 18.4, 29.44];
const CW = 12.88;
const CH = 11.04;

export interface GoalFlagProps {
  size?: number;
}

export function GoalFlag({ size = 52 }: GoalFlagProps) {
  const clipId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 92 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.45))" }}
    >
      {/* sombra del asta */}
      <rect x="25.5" y="7.4" width="4.4" height="79.2" rx="2.2" fill="rgba(0,0,0,0.22)" />
      <clipPath id={clipId}>
        <rect x="25.76" y="7.36" width="51.52" height="33.12" rx="2.3" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {ROWS.map((row, r) =>
          row.map((dark, c) => (
            <rect
              key={`${r}-${c}`}
              x={COL_X[c]}
              y={ROW_Y[r]}
              width={CW}
              height={CH}
              fill={dark ? DARK : LIGHT}
            />
          ))
        )}
      </g>
      {/* borde de la bandera */}
      <rect
        x="25.76"
        y="7.36"
        width="51.52"
        height="33.12"
        rx="2.3"
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.3"
      />
      {/* asta */}
      <rect x="23.56" y="7.36" width="4.4" height="77.28" rx="2.2" fill="#2B2B2B" />
    </svg>
  );
}
