"use client";

import type { Category } from "@/data/destinations";
import { CATEGORY_META } from "@/data/destinations";
import Icon from "@/components/Icon";
import { PIN_SHADOW } from "./chrome";

// ─────────────────────────────────────────────────────────────────────────────
//  Pin de categoría. Un solo ADN con el pin de la app, pieza por pieza, para
//  que el producto tenga un solo pin:
//
//   · círculo de 34 con el relleno `deep` de la categoría,
//   · anillo INTERIOR de 2.5 en la tinta de esa categoría, que es lo que le da
//     canto de día (el borde crema al 95 % rendía 1.09:1 contra el mapa),
//   · glifo de 17 al centro en BLANCO,
//   · sombra de contacto neutra.
//
//  El glifo es blanco en los cinco: es lo que hace que el mapa se lea como una
//  sola familia y no como cinco pines de distinta procedencia. Sobre el relleno
//  vivo el blanco reprobaba 3:1 (playa 2.02, aventura 2.31, naturaleza 2.78,
//  gastro 2.91, cultura 3.05), así que el relleno del pin es `deep` —el mismo
//  color profundizado— y ahí da de 3.25 a 3.28:1. Ver CATEGORY_META.
//
//  El glifo blanco cambia a la vez aquí y en app_map_marker_bytes.dart: el pin
//  es uno solo.
//
//  Se renderiza en HTML/CSS (en vez de <foreignObject>) para nitidez
//  consistente dentro de los markers HTML de MapLibre.
// ─────────────────────────────────────────────────────────────────────────────

export type PinState = "default" | "upcoming" | "done";

// `fill`/`ring` undefined ⇒ el par de la categoría (deep + tinta).
const STATE: Record<PinState, { fill?: string; ring?: string; opacity: number }> = {
  default: { opacity: 1 },
  /** Próxima parada de la ruta: el acento, como en el mapa de la app. El coral
   *  del sistema ya da 3.81:1 con blanco, así que no necesita profundizarse. */
  upcoming: { fill: "#E0552F", ring: "#B23410", opacity: 1 },
  /** Parada ya visitada: el mint del sistema profundizado, atenuado. */
  done: { fill: "#1B9F90", ring: "#0C6A60", opacity: 0.8 },
};

export interface CategoryPinProps {
  category: Category;
  state?: PinState;
  /** Diámetro del círculo en px. */
  size?: number;
}

export function CategoryPin({ category, state = "default", size = 34 }: CategoryPinProps) {
  const meta = CATEGORY_META[category];
  const s = STATE[state];
  const fill = s.fill ?? meta.deep;
  const ring = s.ring ?? meta.ink;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: fill,
        opacity: s.opacity,
        // El anillo va por dentro para que no engorde el pin: dos pines
        // adyacentes en el mapa se tocan por el borde, no por el halo.
        boxShadow: `inset 0 0 0 2.5px ${ring}, ${PIN_SHADOW}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
      }}
    >
      <Icon
        name={meta.icon}
        style={{ fontSize: Math.round(size * 0.5), color: "var(--color-on-selected)" }}
      />
    </div>
  );
}
