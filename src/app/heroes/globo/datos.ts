// Datos de la propuesta "Globo protagonista".
//
// Todo sale de @/data/destinations: ni un destino, provincia o cifra inventada.
// Los contadores se derivan del propio arreglo, así que si mañana entran tres
// destinos nuevos la pantalla lo dice sola.

import { CATEGORIES, DESTINATIONS, type Destination } from "@/data/destinations";

/** Los cuatro pines de la primera pantalla, repartidos por la isla: suroeste,
 *  norte, nordeste y el centro histórico del sur. `lado` dice de qué lado del
 *  pin cuelga la etiqueta, para no tirarla encima de la costa vecina ni de la
 *  etiqueta del pin de al lado. */
const ELEGIDOS: { id: string; lado: "izq" | "der" }[] = [
  { id: "aguilas", lado: "der" },
  { id: "charcos", lado: "der" },
  { id: "playa-rincon", lado: "izq" },
  { id: "zona-colonial", lado: "izq" },
];

export type PinHero = { d: Destination; lado: "izq" | "der" };

export const PINES: PinHero[] = ELEGIDOS.flatMap(({ id, lado }) => {
  const d = DESTINATIONS.find((x) => x.id === id);
  return d ? [{ d, lado }] : [];
});

export const TOTAL_DESTINOS = DESTINATIONS.length;
export const TOTAL_PROVINCIAS = new Set(DESTINATIONS.map((d) => d.province)).size;
export const TOTAL_CATEGORIAS = CATEGORIES.length;

// Sanidad en desarrollo: si alguien renombra un id, la pantalla lo canta en la
// consola en vez de quedarse callada con tres pines.
if (process.env.NODE_ENV !== "production" && PINES.length !== ELEGIDOS.length) {
  console.warn("[globo] algún id de ELEGIDOS ya no existe en DESTINATIONS");
}

export type Vista = { lng: number; lat: number; zoom: number };

/** Centro de la isla — el mismo punto que encuadra el journey de la home. */
export const CENTRO_ISLA: [number, number] = [-70.22, 18.82];

export const VISTA_INICIAL: Vista = {
  lng: CENTRO_ISLA[0],
  lat: CENTRO_ISLA[1],
  zoom: 6.4,
};

/** "18.820° N · 70.220° O" — el formato que se lee en un GPS, no en un JSON. */
export function grados(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const eo = lng >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lng).toFixed(3)}° ${eo}`;
}
