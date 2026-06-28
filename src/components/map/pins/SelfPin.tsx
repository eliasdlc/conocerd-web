"use client";

import { useId } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Self-pin de navegación (#4). Silueta tipo Waze con gradiente Mango
//  (#FFAA47 → #F47F0E) + borde crema. Rota con el heading (rota con el rumbo en
//  los mockups / constructor de ruta). Portado de conocerd_map_pins.html.
// ─────────────────────────────────────────────────────────────────────────────

const ARROW_PATH = `M100,30 C110,30 122,40 132,58
  C146,82 162,116 168,138
  C172,154 168,166 152,168
  C134,170 116,150 100,150
  C84,150 66,170 48,168
  C32,166 28,154 32,138
  C38,116 54,82 68,58
  C78,40 90,30 100,30 Z`;

export interface SelfPinProps {
  /** Rumbo en grados (0 = norte). El pin apunta hacia ahí. */
  heading?: number;
  size?: number;
}

export function SelfPin({ heading = 0, size = 48 }: SelfPinProps) {
  const gradId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `rotate(${heading}deg)`,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.45))",
      }}
    >
      <defs>
        <linearGradient id={gradId} x1="100" y1="30" x2="100" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFAA47" />
          <stop offset="100%" stopColor="#F47F0E" />
        </linearGradient>
      </defs>
      {/* borde crema (stroke ancho, detrás) */}
      <path d={ARROW_PATH} fill="none" stroke="#FBF7EF" strokeWidth={20} strokeLinejoin="round" />
      {/* relleno mango gradiente */}
      <path d={ARROW_PATH} fill={`url(#${gradId})`} />
    </svg>
  );
}
