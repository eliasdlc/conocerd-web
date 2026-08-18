// Banco de propuestas para la primera pantalla de la home (ago 2026).
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

export type GrupoVariante = "libre" | "globo";

export type HeroVariant = {
  slug: string;
  nombre: string;
  /** Idea rectora en una línea — lo que la hace distinta de las demás. */
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
      "Editorial de pasaporte: titular serif enorme, sellos de tinta y un pase de abordar como CTA.",
    acento: "#F76C4D",
    grupo: "libre",
  },
  {
    slug: "mosaico",
    nombre: "Mosaico vivo",
    concepto:
      "Bento asimétrico de destinos reales; el copy se incrusta entre las piezas y en móvil se vuelve carrusel.",
    acento: "#25CCB8",
    grupo: "libre",
  },
  {
    slug: "globo",
    nombre: "Globo protagonista",
    concepto:
      "El país a sangre completa con panel de cristal encima: coordenadas vivas y pines que responden.",
    acento: "#264653",
    grupo: "libre",
  },
  {
    slug: "ruta",
    nombre: "Ruta trazada",
    concepto:
      "Una línea dibujada a mano cruza la pantalla uniendo paradas; el titular vive sobre el trazo.",
    acento: "#FF8D16",
    grupo: "libre",
  },
  {
    slug: "revista",
    nombre: "Portada de revista",
    concepto:
      "Split a pantalla completa: columna editorial contra foto viva que cambia con la categoría elegida.",
    acento: "#B23410",
    grupo: "libre",
  },

  {
    slug: "ventana",
    nombre: "Ventana al país",
    concepto:
      "El globo asoma por un recorte en el papel; al bajar, la ventana se abre y la cámara se lanza dentro.",
    acento: "#F76C4D",
    grupo: "globo",
  },
  {
    slug: "cabina",
    nombre: "Cabina de vuelo",
    concepto:
      "Globo a sangre con instrumental en los bordes: retícula, coordenadas vivas y altímetro que marca el descenso.",
    acento: "#264653",
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
    slug: "constelacion",
    nombre: "Constelación de destinos",
    concepto:
      "Fichas de destino conectadas por hilos finos a sus pines sobre el globo; elegir una apunta la cámara.",
    acento: "#25CCB8",
    grupo: "globo",
  },
  {
    slug: "medallon",
    nombre: "Medallón",
    concepto:
      "El globo tratado como sello troquelado dentro de un anillo con texto curvo; al bajar, el anillo se abre.",
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
