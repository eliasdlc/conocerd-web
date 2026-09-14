// ─────────────────────────────────────────────────────────────────────────────
//  Del código WMO de Open-Meteo a una etiqueta corta y un glifo del set propio.
//
//  Open-Meteo devuelve el tiempo actual como un código de la tabla WMO 4677.
//  Aquí se reduce a lo que un chip de una línea puede decir en español
//  dominicano, y a un tono: cálido para el cielo abierto (tinte mint) y frío
//  para lo cubierto o mojado (tinte azul). Un color solo nunca lleva el
//  significado: el glifo y la palabra van siempre con él.
// ─────────────────────────────────────────────────────────────────────────────

import type { IconName } from "@/components/Icon";

export type Cielo = {
  etiqueta: string;
  icono: IconName;
  tono: "calido" | "frio";
};

/** Etiqueta, glifo y tono para un código WMO. Un código desconocido se lee
 *  como nublado: es lo menos comprometido que se puede decir. */
export function cieloDeWMO(codigo: number): Cielo {
  if (codigo === 0) return { etiqueta: "despejado", icono: "sunny", tono: "calido" };
  if (codigo === 1) return { etiqueta: "casi despejado", icono: "sunny", tono: "calido" };
  if (codigo === 2) return { etiqueta: "poco nublado", icono: "partly_cloudy", tono: "calido" };
  if (codigo === 3) return { etiqueta: "nublado", icono: "cloud", tono: "frio" };
  if (codigo === 45 || codigo === 48) return { etiqueta: "neblina", icono: "fog", tono: "frio" };
  if (codigo >= 51 && codigo <= 57) return { etiqueta: "llovizna", icono: "rain", tono: "frio" };
  if (codigo >= 61 && codigo <= 67) return { etiqueta: "lluvia", icono: "rain", tono: "frio" };
  if (codigo >= 71 && codigo <= 77) return { etiqueta: "nieve", icono: "rain", tono: "frio" };
  if (codigo >= 80 && codigo <= 86) return { etiqueta: "chubascos", icono: "rain", tono: "frio" };
  if (codigo >= 95) return { etiqueta: "tormenta", icono: "thunderstorm", tono: "frio" };
  return { etiqueta: "nublado", icono: "cloud", tono: "frio" };
}

/** "32°" : entero, sin decimales, con el signo de grado pegado. */
export function grados(temp: number): string {
  return `${Math.round(temp)}°`;
}
