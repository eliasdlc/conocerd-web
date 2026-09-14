// ─────────────────────────────────────────────────────────────────────────────
//  La URL de una ruta armada: `/ruta/<slug>`.
//
//  El slug son los ids de las paradas en orden, separados por `_`. El guion no
//  sirve de separador porque ya vive dentro de varios ids (`playa-rincon`,
//  `lago-enriquillo`). Ids desconocidos se descartan sin romper nada, y una
//  parada repetida se queda con su primera aparición: la URL que alguien
//  escribe a mano tiene que abrir algo, no un 404 por una letra.
// ─────────────────────────────────────────────────────────────────────────────

import { DESTINATIONS } from "@/data/destinations";
import { PRESETS } from "@/data/rutas";

export const MIN_PARADAS = 2;
export const MAX_PARADAS = 8;
export const SEPARADOR = "_";

const CONOCIDOS = new Set(DESTINATIONS.map((d) => d.id));

/** Sólo los ids del catálogo, sin repetidos, en el orden dado, hasta el tope. */
export function paradasValidas(ids: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (CONOCIDOS.has(id) && !out.includes(id)) out.push(id);
    if (out.length === MAX_PARADAS) break;
  }
  return out;
}

/** El slug de estas paradas, o `null` si no llegan al mínimo. */
export function slugDeRuta(ids: readonly string[]): string | null {
  const paradas = paradasValidas(ids);
  return paradas.length >= MIN_PARADAS ? paradas.join(SEPARADOR) : null;
}

/** Las paradas de un slug. Vacío si no hay ni dos válidas. */
export function idsDeSlug(slug: string): string[] {
  const paradas = paradasValidas(slug.split(SEPARADOR));
  return paradas.length >= MIN_PARADAS ? paradas : [];
}

/** El nombre del viaje recomendado con exactamente esas paradas, o "Tu ruta". */
export function nombreDeRuta(ids: readonly string[]): string {
  const clave = ids.join(SEPARADOR);
  return PRESETS.find((p) => p.stops.join(SEPARADOR) === clave)?.name ?? "Tu ruta";
}

/** "3 paradas" / "1 parada". */
export function contarParadas(n: number): string {
  return `${n} ${n === 1 ? "parada" : "paradas"}`;
}
