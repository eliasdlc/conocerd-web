// La frase que abre Tu ruta: el punto más caliente y el más frío del país
// ahora mismo, con su nombre. Es lo que ninguna guía cuenta: en la misma tarde
// hay 32° en una playa y 14° en una loma a tres horas de carro.

import type { Clima } from "./openMeteo";

export type Extremos = {
  caliente: { id: string; temp: number };
  frio: { id: string; temp: number };
};

/** El más caliente y el más frío. `null` si no hay al menos dos destinos con
 *  dato, o si todos marcan lo mismo: entonces no hay contraste que contar. */
export function extremosDeClima(destinos: Clima["destinos"]): Extremos | null {
  const lista = Object.entries(destinos).map(([id, c]) => ({ id, temp: c.temp }));
  if (lista.length < 2) return null;
  let caliente = lista[0];
  let frio = lista[0];
  for (const d of lista) {
    if (d.temp > caliente.temp) caliente = d;
    if (d.temp < frio.temp) frio = d;
  }
  if (caliente.id === frio.id || Math.round(caliente.temp) === Math.round(frio.temp)) return null;
  return { caliente, frio };
}
