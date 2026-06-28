"use client";

import type { Category } from "@/data/destinations";
import { CATEGORY_META } from "@/data/destinations";

// ─────────────────────────────────────────────────────────────────────────────
//  Pin de categoría (#4). Portado de conocerd_map_pins.html (app_map_markers.dart):
//  círculo de color + ícono Material, borde crema y sombra de contacto.
//  Renderizado en HTML/CSS (en vez de <foreignObject>) para nitidez consistente
//  dentro de los markers HTML de MapLibre.
// ─────────────────────────────────────────────────────────────────────────────

export type PinState = "default" | "upcoming" | "done";

// Estados exactos del HTML de referencia.
// `fill` undefined ⇒ usa el color de marca de la categoría.
const STATE: Record<
  PinState,
  { fill?: string; fillOpacity: number; borderOpacity: number; iconOpacity: number; shadowAlpha: number }
> = {
  default: { fillOpacity: 1, borderOpacity: 0.95, iconOpacity: 1, shadowAlpha: 0.28 },
  upcoming: { fill: "#FF6B35", fillOpacity: 1, borderOpacity: 0.95, iconOpacity: 1, shadowAlpha: 0.28 },
  done: { fill: "#43A047", fillOpacity: 0.78, borderOpacity: 0.7, iconOpacity: 0.85, shadowAlpha: 0.18 },
};

const CREAM = "251,247,239"; // #FBF7EF en RGB (borde crema)

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

export interface CategoryPinProps {
  category: Category;
  state?: PinState;
  /** Diámetro del círculo en px. */
  size?: number;
}

export function CategoryPin({ category, state = "default", size = 36 }: CategoryPinProps) {
  const meta = CATEGORY_META[category];
  const s = STATE[state];
  const fillRgb = hexToRgb(s.fill ?? meta.color);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `rgba(${fillRgb},${s.fillOpacity})`,
        border: `2px solid rgba(${CREAM},${s.borderOpacity})`,
        boxShadow: `0 2px 5px rgba(0,0,0,${s.shadowAlpha})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
      }}
    >
      <span
        className="ms"
        style={{
          fontSize: Math.round(size * 0.52),
          color: `rgba(255,255,255,${s.iconOpacity})`,
        }}
      >
        {meta.icon}
      </span>
    </div>
  );
}
