// Banco de propuestas para la primera pantalla de la home.
//
// Cada variante vive en su propio directorio bajo /heroes/<slug> y es
// autónoma: no toca la home real ni el journey. El índice (/heroes) y el
// conmutador flotante leen de aquí, así que añadir una propuesta es añadir una
// entrada + su carpeta.
//
// Dos tandas, y la distinción importa:
//  - `libre`: exploración abierta del lenguaje de marca, con o sin mapa.
//  - `globo`: el globo del journey es obligatorio y visible, porque al bajar la
//    cámara desciende sobre él hacia el primer destino (scrollytelling). Estas
//    se construyen sobre `_components/GloboHero`.
//
// Todas hablan el sistema de la web (los nueve roles de color, Bricolage para
// titulares, Jakarta para etiquetas, coral sólo en acción y selección) y
// reutilizan las piezas de marca que ya existen: polaroid con cinta, cuño de
// equipaje, pin de marca, teléfono con la app.

export type GrupoVariante = "libre" | "globo";

export type HeroVariant = {
  slug: string;
  nombre: string;
  /** Idea rectora en una línea: lo que la hace distinta de las demás. */
  concepto: string;
  /** Color de marca que domina la propuesta (para la ficha del índice). */
  acento: string;
  grupo: GrupoVariante;
};

export const GRUPOS: { id: GrupoVariante; titulo: string; nota: string }[] = [
  {
    id: "libre",
    titulo: "Tanda 1 · Exploración libre",
    nota: "Cinco lenguajes distintos para la primera pantalla, sin obligación de mostrar el mapa.",
  },
  {
    id: "globo",
    titulo: "Tanda 2 · Con el globo del recorrido",
    nota: "El globo está presente y visible desde el primer frame: al bajar, la cámara desciende sobre él hasta el primer destino. Baja en la propia propuesta para sentir el descenso.",
  },
];

export const HERO_VARIANTS: HeroVariant[] = [
  {
    slug: "sello",
    nombre: "Sello de entrada",
    concepto:
      "Portada de documento de viaje: titular a cuerpo de portada, cuños de tinta y un pase de abordar como CTA.",
    acento: "#E0552F",
    grupo: "libre",
  },
  {
    slug: "mosaico",
    nombre: "Mosaico vivo",
    concepto:
      "Bento asimétrico de destinos reales; el copy ocupa una celda más y en móvil las piezas se vuelven carrusel.",
    acento: "#25CCB8",
    grupo: "libre",
  },
  {
    slug: "mesa",
    nombre: "Mesa de viaje",
    concepto:
      "Las polaroids del recorrido tiradas sobre la mesa, con cinta y cuño de equipaje; el titular es la nota que las acompaña.",
    acento: "#FF8D16",
    grupo: "libre",
  },
  {
    slug: "ruta",
    nombre: "Ruta trazada",
    concepto:
      "Una línea dibujada a mano cruza la pantalla uniendo paradas reales; el titular vive sobre el trazo y el CTA es el destino.",
    acento: "#FF8D16",
    grupo: "libre",
  },
  {
    slug: "revista",
    nombre: "Portada de revista",
    concepto:
      "Split a pantalla completa: columna editorial contra foto a sangre que cambia con la categoría elegida.",
    acento: "#B23410",
    grupo: "libre",
  },

  {
    slug: "ventana",
    nombre: "Ventana al país",
    concepto:
      "El globo asoma por un recorte en el papel; al bajar, la ventana se abre y la cámara se lanza dentro.",
    acento: "#E0552F",
    grupo: "globo",
  },
  {
    slug: "en-la-mano",
    nombre: "La app en la mano",
    concepto:
      "El teléfono con la app de verdad se apoya sobre el globo; al bajar, el teléfono se retira y la cámara aterriza donde la pantalla señalaba.",
    acento: "#0F1A2E",
    grupo: "globo",
  },
  {
    slug: "horizonte",
    nombre: "Horizonte",
    concepto:
      "El planeta sale por el borde inferior como un amanecer; el titular ocupa el cielo y el descenso lo atraviesa.",
    acento: "#FF8D16",
    grupo: "globo",
  },
  {
    slug: "amanecer",
    nombre: "Amanecer",
    concepto:
      "El planeta de noche, visto desde el espacio: cielo de tinta, el limbo encendido y un solo punto de luz en el país. Al bajar amanece.",
    acento: "#0F1A2E",
    grupo: "globo",
  },
  {
    slug: "sol",
    nombre: "Sol",
    concepto:
      "El globo corrido a la derecha y el cuño de la marca amaneciendo detrás del limbo; el titular vive a la izquierda, sobre el cielo.",
    acento: "#FF8D16",
    grupo: "globo",
  },
  {
    slug: "constelacion",
    nombre: "Constelación de destinos",
    concepto:
      "Fichas de destino conectadas por hilos finos a sus pines sobre el globo; elegir una apunta la cámara.",
    acento: "#25CCB8",
    grupo: "globo",
  },
  {
    slug: "cinta",
    nombre: "Cinta de polaroids",
    concepto:
      "El globo arriba y una cinta de polaroids reales abajo; rozar una enciende su pin y al bajar la cinta se retira bajo la cámara.",
    acento: "#0C6A60",
    grupo: "globo",
  },
];

export function findVariant(slug: string): HeroVariant | undefined {
  return HERO_VARIANTS.find((v) => v.slug === slug);
}

export function variantesDe(grupo: GrupoVariante): HeroVariant[] {
  return HERO_VARIANTS.filter((v) => v.grupo === grupo);
}
