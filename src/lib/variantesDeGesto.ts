import type { GestoParams } from "@/hooks/useJourneyGestos";
import { STEP_BASE_MS } from "@/hooks/useJourneySteps";

// Variantes de feel del slideshow de escritorio, para compararlas en un mismo
// preview con `?gesto=<clave>`. Cada una es un umbral de gesto, un silencio
// que separa dos gestos y una duración de paso. Se queda una sola tras la
// elección.
export type VarianteDeGesto = { gesto: GestoParams; pasoMs: number };

export const VARIANTES: Record<string, VarianteDeGesto> = {
  // Firme: un notch de rueda o medio swipe corto de trackpad, paso a 1150.
  firme: { gesto: { umbral: 40, silencioMs: 220 }, pasoMs: STEP_BASE_MS },
  // Suave: pide un gesto algo más decidido y el vuelo dura más.
  suave: { gesto: { umbral: 60, silencioMs: 300 }, pasoMs: 1400 },
  // Agil: responde al primer roce y el paso es más corto.
  agil: { gesto: { umbral: 30, silencioMs: 160 }, pasoMs: 900 },
};

export const VARIANTE_POR_DEFECTO = "firme";

export function variantePorQuery(): VarianteDeGesto {
  if (typeof window === "undefined") return VARIANTES[VARIANTE_POR_DEFECTO];
  const clave = new URLSearchParams(window.location.search).get("gesto") ?? "";
  return VARIANTES[clave] ?? VARIANTES[VARIANTE_POR_DEFECTO];
}
