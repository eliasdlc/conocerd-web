// ─────────────────────────────────────────────────────────────────────────────
//  El clima de ahora en los 18 destinos, desde Open-Meteo.
//
//  Una sola llamada con las 18 coordenadas separadas por coma: Open-Meteo
//  responde con un objeto por punto, en el mismo orden. No pide clave y su
//  licencia permite el uso no comercial y comercial con atribución.
//
//  Este módulo no sabe de HTTP de Next ni de caché: arma la URL, valida la
//  respuesta y la convierte al mapa por id de destino. Quien lo llama (el
//  route handler) decide cuánto se guarda.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { DESTINATIONS } from "@/data/destinations";

export type ClimaDestino = {
  /** Temperatura del aire a 2 m, en °C, con un decimal. */
  temp: number;
  /** Código WMO del tiempo presente. */
  codigo: number;
  /** Si en ese punto es de día ahora mismo. */
  dia: boolean;
};

export type Clima = {
  /** La hora en Santo Domingo, ya escrita: "4:00 p. m.". */
  hora: string;
  destinos: Record<string, ClimaDestino>;
};

export const ZONA_HORARIA = "America/Santo_Domingo";

const PUNTO = z.object({
  current: z.object({
    temperature_2m: z.number(),
    weather_code: z.number().int(),
    is_day: z.number().int(),
  }),
});

// Con una sola coordenada Open-Meteo devuelve el objeto suelto, no una lista.
// Los 18 destinos siempre llegan como lista, pero el parser acepta las dos
// formas para que un catálogo de un solo destino no rompa nada.
const RESPUESTA = z.union([z.array(PUNTO), PUNTO.transform((p) => [p])]);

/** La URL de la llamada para estos destinos, en su orden. */
export function urlOpenMeteo(
  destinos: readonly { coords: readonly [number, number] }[]
): string {
  const lat = destinos.map((d) => d.coords[1]).join(",");
  const lon = destinos.map((d) => d.coords[0]).join(",");
  const q = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,weather_code,is_day",
    timezone: ZONA_HORARIA,
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

/** Valida el JSON de Open-Meteo y lo cruza con los ids, por posición. Lanza si
 *  la forma no es la esperada o si faltan puntos. */
export function parsearOpenMeteo(json: unknown, ids: readonly string[]): Record<string, ClimaDestino> {
  const puntos = RESPUESTA.parse(json);
  if (puntos.length !== ids.length) {
    throw new Error(`Open-Meteo devolvió ${puntos.length} puntos para ${ids.length} destinos`);
  }
  const out: Record<string, ClimaDestino> = {};
  puntos.forEach((p, i) => {
    out[ids[i]] = {
      temp: p.current.temperature_2m,
      codigo: p.current.weather_code,
      dia: p.current.is_day === 1,
    };
  });
  return out;
}

/** "4:00 p. m." en la hora de Santo Domingo, para el instante dado. */
export function horaEnRD(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-DO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: ZONA_HORARIA,
  }).format(ahora);
}

/** Pide el clima de todos los destinos del catálogo. Lanza si la red o la
 *  forma fallan: el route handler traduce eso a un 502. */
export async function pedirClima(fetchFn: typeof fetch = fetch): Promise<Clima> {
  const res = await fetchFn(urlOpenMeteo(DESTINATIONS), { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const destinos = parsearOpenMeteo(await res.json(), DESTINATIONS.map((d) => d.id));
  return { hora: horaEnRD(), destinos };
}
