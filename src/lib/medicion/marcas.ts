// ─────────────────────────────────────────────────────────────────────────────
//  Los puntos que el recorrido anota en su propio reloj.
//
//  Este módulo entra en el bundle inicial, así que no importa maplibre ni nada
//  que lo arrastre, y no guarda nada: escribe una marca nativa (`performance
//  .mark`, del orden de un microsegundo) y, si hay sonda conectada, se la pasa.
//  Sin `?medir` en la URL la sonda no existe y esto son cuatro llamadas por
//  recorrido que nadie lee.
//
//  Quien mide es `lib/medicion/sonda`, que sólo se descarga con `?medir`. La
//  separación existe para que instrumentar no cueste peso: el producto anota,
//  la sonda interpreta.
// ─────────────────────────────────────────────────────────────────────────────

/** Lo que se anota. Un nombre corto y estable: la sonda hace cuentas con ellos. */
export type Marca =
  | "hidratado"
  | "mapa:construye"
  | "mapa:load"
  | "mapa:idle"
  | "paso:pide"
  | "paso:llega";

export type Detalle = Record<string, string | number | boolean>;

/** Lo mínimo que la sonda necesita del mapa: escuchar sus eventos. */
export interface MapaObservable {
  on(tipo: string, cb: () => void): unknown;
  off(tipo: string, cb: () => void): unknown;
  getZoom(): number;
}

export interface Sonda {
  anotar(marca: Marca, detalle?: Detalle): void;
  observarMapa(map: MapaObservable): void;
}

let sonda: Sonda | null = null;

/** La sonda se presenta al cargarse. Sólo hay una. */
export function conectarSonda(s: Sonda) {
  sonda = s;
}

export function haySonda(): boolean {
  return sonda !== null;
}

/**
 * Anota un hito del recorrido. El nombre en el timeline del navegador lleva
 * prefijo `crd:` para poder filtrarlo en el panel de rendimiento de Chrome.
 */
export function marcar(marca: Marca, detalle?: Detalle) {
  if (typeof performance === "undefined") return;
  try {
    performance.mark(`crd:${marca}`, detalle ? { detail: detalle } : undefined);
  } catch {
    // Un navegador sin `detail` en marcas no es motivo para tumbar el recorrido.
  }
  sonda?.anotar(marca, detalle);
}

/** El mapa, para que la sonda pueda escuchar sus teselas y sus reposos. */
export function publicarMapa(map: MapaObservable) {
  sonda?.observarMapa(map);
}
