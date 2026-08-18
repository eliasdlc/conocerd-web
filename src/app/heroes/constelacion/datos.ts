import { DESTINATIONS, FEATURED_DESTINATIONS, type Destination } from "@/data/destinations";

// ─────────────────────────────────────────────────────────────────────────────
//  Geometría de la constelación.
//
//  Problema de partida: en el keyframe del hero (zoom 2.5 en desktop, 1.15 en
//  móvil) la isla entera mide ~22 px de ancho. Seis pines sobre sus coordenadas
//  reales serían un borrón de 20 px y los hilos convergerían todos al mismo
//  punto: ilegible.
//
//  Solución: cada destino tiene un SLOT en pantalla —ángulo y radio alrededor
//  del centro del globo— derivado de su rumbo real desde el centro del país y
//  separado a mano lo justo para que se lean. El pin viaja entre su coordenada
//  verdadera y su slot según el descenso: en reposo está en el slot (constelación
//  legible, con un hilo fino de vuelta a su punto exacto sobre la isla) y al
//  aterrizar está exactamente sobre su coordenada. La vista explotada se cierra
//  sola a medida que la cámara baja, que es cuando la isla ya da espacio real.
//
//  Los ángulos están en grados de pantalla: 0 = derecha, 90 = abajo.
// ─────────────────────────────────────────────────────────────────────────────

/** Centro del keyframe `hero`: origen de la constelación en pantalla. */
export const CENTRO_HERO: [number, number] = [-70.1627, 18.7357];

/** Primer destino del recorrido: el pin que queda en pie al aterrizar. */
export const DESTINO_ATERRIZAJE = "aguilas";

export type AnclaFicha = {
  /** Desplazamiento del nodo de la ficha respecto al centro del globo (px). */
  dx: number;
  dy: number;
  /** Borde de la ficha donde vive el nodo: `der` = ficha a la izquierda del nodo. */
  lado: "izq" | "der";
  /** `--descenso` al que la ficha acaba de retirarse. Escalonadas 0.52→0.64:
   *  el tramo 0→0.34 de la pista no mueve la cámara (easing de GloboHero), así
   *  que la retirada lo ocupa y el scroll nunca se siente muerto. */
  salida: number;
};

export type NodoConstelacion = {
  id: string;
  destino: Destination;
  angulo: number;
  radio: number;
  anguloMovil: number;
  radioMovil: number;
  /** Solo los destinos con ficha; el resto son estrellas sin nombre. */
  ficha?: AnclaFicha;
  /** La ficha desaparece bajo 900 px de ancho (no cabe junto al texto). */
  soloAncho?: boolean;
  /** La ficha no se muestra en móvil (la fila inferior admite tres). */
  soloDesk?: boolean;
};

const porId = (id: string): Destination => {
  const d = FEATURED_DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`Destino destacado desconocido: ${id}`);
  return d;
};

export const NODOS: NodoConstelacion[] = [
  {
    id: "aguilas",
    destino: porId("aguilas"),
    angulo: 132,
    radio: 80,
    anguloMovil: 130,
    radioMovil: 58,
    ficha: { dx: -271, dy: 228, lado: "der", salida: 0.64 },
    soloAncho: true,
  },
  {
    id: "charcos",
    destino: porId("charcos"),
    angulo: 250,
    radio: 72,
    anguloMovil: 252,
    radioMovil: 56,
    ficha: { dx: -251, dy: -292, lado: "der", salida: 0.56 },
    soloAncho: true,
  },
  {
    id: "limon",
    destino: porId("limon"),
    angulo: 318,
    radio: 74,
    anguloMovil: 312,
    radioMovil: 58,
    ficha: { dx: 233, dy: -242, lado: "izq", salida: 0.52 },
  },
  {
    id: "haitises",
    destino: porId("haitises"),
    angulo: 352,
    radio: 66,
    anguloMovil: 352,
    radioMovil: 46,
    ficha: { dx: 243, dy: 168, lado: "izq", salida: 0.60 },
    soloDesk: true,
  },
  {
    id: "duarte",
    destino: porId("duarte"),
    angulo: 208,
    radio: 58,
    anguloMovil: 212,
    radioMovil: 48,
  },
  {
    id: "constanza",
    destino: porId("constanza"),
    angulo: 160,
    radio: 52,
    anguloMovil: 162,
    radioMovil: 36,
  },
];

/** Fichas del overlay, en el orden en que se leen (y en que se retiran). */
export const FICHAS = NODOS.filter((n) => n.ficha);

export const TOTAL_DESTINOS = DESTINATIONS.length;
export const TOTAL_PROVINCIAS = new Set(DESTINATIONS.map((d) => d.province)).size;
