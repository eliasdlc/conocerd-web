// Kilómetros y minutos por carretera entre paradas consecutivas, de la matriz
// precalculada de pares (`data/routes/pairs.json`, OSRM). Lo usa la sección
// Tu ruta en el navegador y la imagen del pase de embarque en el servidor: las
// dos suman igual, así que el pase nunca dice un número distinto del itinerario.

import pairs from "@/data/routes/pairs.json";

const IDS = pairs.ids as string[];
const KM = pairs.km as number[][];
const MIN = pairs.min as number[][];

export function kmEntre(a: string, b: string): number {
  return KM[IDS.indexOf(a)]?.[IDS.indexOf(b)] ?? 0;
}

export function minEntre(a: string, b: string): number {
  return MIN[IDS.indexOf(a)]?.[IDS.indexOf(b)] ?? 0;
}

/** Totales redondeados de una ruta en el orden dado. */
export function totalesDeRuta(stops: readonly string[]): { km: number; min: number } {
  let km = 0;
  let min = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    km += kmEntre(stops[i], stops[i + 1]);
    min += minEntre(stops[i], stops[i + 1]);
  }
  return { km: Math.round(km), min: Math.round(min) };
}

/** "3 h 10 min", "45 min", "2 h". */
export function duracion(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
