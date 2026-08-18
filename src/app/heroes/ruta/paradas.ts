import { DESTINATIONS, CATEGORY_META, type Destination } from "@/data/destinations";

// ─── Las paradas del itinerario ──────────────────────────────────────────────
//
// Destinos REALES tomados de la fuente de verdad del proyecto: aquí sólo viven
// la anotación manuscrita (copy propio de esta propuesta) y dónde cae el nodo
// sobre cada trazo. Nombre, provincia y categoría se leen de @/data/destinations,
// así que corregir un dato allí lo corrige aquí.
//
// El orden es un viaje coherente de suroeste a nordeste: Pedernales → La Vega →
// Puerto Plata → Samaná. En móvil cae la tercera (27 Charcos) y quedan tres
// paradas; por eso Los Haitises lleva su número alternativo.

function destino(id: string): Destination {
  const d = DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`Parada desconocida: ${id}`);
  return d;
}

export type Parada = {
  destino: Destination;
  numero: string;
  /** Numeración cuando la parada 03 no se pinta (móvil). */
  numeroMovil?: string;
  /** Anotación a mano. Corta a propósito: es marginalia, no cuerpo de texto. */
  nota: string;
  color: string;
  /** Sólo en el trazo ancho: en el vertical no cabe sin apretar. */
  soloDesk?: boolean;
  /** Posición del nodo sobre el trazo, en % del lienzo. */
  desk: { x: number; y: number };
  movil?: { x: number; y: number };
  /** Desplazamiento de la etiqueta respecto al nodo, en px (sólo desktop). */
  etiqueta: { x: number; y: number; ancho: number };
};

export const PARADAS: Parada[] = [
  {
    destino: destino("aguilas"),
    numero: "01",
    nota: "ni un edificio en 8 km",
    color: CATEGORY_META.playa.color,
    desk: { x: 11.94, y: 81.33 },
    movil: { x: 11.18, y: 10 },
    etiqueta: { x: -12, y: -112, ancho: 230 },
  },
  {
    destino: destino("constanza"),
    numero: "02",
    nota: "aquí sí se siente el frío",
    color: CATEGORY_META.naturaleza.color,
    desk: { x: 31.39, y: 72 },
    movil: { x: 29.41, y: 48.67 },
    etiqueta: { x: -12, y: 16, ancho: 240 },
  },
  {
    destino: destino("charcos"),
    numero: "03",
    nota: "tírate sin pensarlo",
    color: CATEGORY_META.aventura.color,
    soloDesk: true,
    desk: { x: 59.17, y: 26.67 },
    etiqueta: { x: -12, y: -112, ancho: 220 },
  },
  {
    destino: destino("haitises"),
    numero: "04",
    numeroMovil: "03",
    nota: "se entra en bote, temprano",
    color: CATEGORY_META.naturaleza.color,
    desk: { x: 79.86, y: 44.89 },
    movil: { x: 12.35, y: 84 },
    etiqueta: { x: 26, y: -86, ancho: 228 },
  },
];
