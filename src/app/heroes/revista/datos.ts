import {
  CATEGORY_META,
  CATEGORIES,
  DESTINATIONS,
  type Category,
  type Destination,
} from "@/data/destinations";

// ─────────────────────────────────────────────────────────────────────────────
//  Portada de revista — el "sumario" de la edición.
//
//  Cada categoría del producto tiene UNA foto de portada, que es un destino
//  real del catálogo (nunca uno inventado). La foto se elige por lo que aguanta
//  un recorte a sangre en vertical (desktop) y en banda (móvil), y por variedad
//  de paleta entre las cinco: playa turquesa, manglar, calle colonial, mármol
//  bajo nubes y cascada.
//
//  El crédito sale de `imageCredit`; donde el archivo no lo exige (CC0 / fondo
//  propio) el dato no existe y la línea sencillamente no se pinta: inventarle
//  una autoría a una foto es peor que no acreditarla.
// ─────────────────────────────────────────────────────────────────────────────

export type Pieza = {
  categoria: Category;
  destino: Destination;
  /** La línea de copy que cambia al elegir la categoría. Una sola frase. */
  linea: string;
  /** `object-position` del recorte a sangre: cada foto tiene su sujeto. */
  encuadre: string;
};

function destino(id: string): Destination {
  const d = DESTINATIONS.find((x) => x.id === id);
  if (!d) throw new Error(`Portada: no existe el destino "${id}"`);
  return d;
}

/** Orden de portada = orden de los chips y de las muescas del pliegue. */
export const PIEZAS: Pieza[] = [
  {
    categoria: "playa",
    destino: destino("playa-rincon"),
    linea:
      "El bote sale a las 9:00: con quién ir, cuánto cuesta y dónde comer después.",
    encuadre: "58% 52%",
  },
  {
    categoria: "naturaleza",
    destino: destino("haitises"),
    linea:
      "Manglares, cuevas y cayos con guías del patronato local, no con intermediarios.",
    encuadre: "52% 50%",
  },
  {
    categoria: "cultura",
    destino: destino("zona-colonial"),
    linea:
      "Quinientos años de calle, contados por la gente que vive en ellas.",
    encuadre: "48% 58%",
  },
  {
    categoria: "gastronomia",
    destino: destino("santiago"),
    linea:
      "Dónde se come el sancocho de verdad en el Cibao: precio, horario y cómo llegar.",
    encuadre: "50% 42%",
  },
  {
    categoria: "aventura",
    destino: destino("jarabacoa"),
    linea:
      "Rafting, saltos y montaña con operadores verificados uno por uno.",
    encuadre: "46% 50%",
  },
];

// El orden de portada es una decisión editorial, pero no puede dejar fuera una
// categoría del producto: si mañana se añade una, esto revienta en build.
if (PIEZAS.length !== CATEGORIES.length) {
  throw new Error(
    `Portada: hay ${CATEGORIES.length} categorías y ${PIEZAS.length} piezas de portada.`
  );
}

export const PIEZA_INICIAL = PIEZAS[0];

export function meta(categoria: Category) {
  return CATEGORY_META[categoria];
}
