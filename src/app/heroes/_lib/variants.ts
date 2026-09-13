// Banco de propuestas para la primera pantalla de la home.
//
// Todas parten de la misma escena: el planeta visto desde el espacio, de noche,
// con las luces de ciudad, nubes y atmósfera de verdad (`_espacio/`). Al bajar
// amanece y la cámara desciende hasta el primer destino, con la matemática
// real del recorrido. Lo que cambia entre propuestas es la composición de la
// primera pantalla: dónde vive la marca, dónde vive el mensaje y qué pasa con
// él al bajar. Cada una es una carpeta hermana bajo /heroes/<slug>; el índice
// y el conmutador flotante leen de aquí.

export type HeroVariant = {
  slug: string;
  nombre: string;
  /** Idea rectora en una línea: lo que la hace distinta de las demás. */
  concepto: string;
  /** Color que domina la propuesta (para la ficha del índice). */
  acento: string;
};

export const HERO_VARIANTS: HeroVariant[] = [
  {
    slug: "amanecer",
    nombre: "Amanecer",
    concepto:
      "La base: logo arriba a la izquierda, titular y línea en el cielo, el punto de luz del país sobre el planeta. Al bajar amanece.",
    acento: "#0F1A2E",
    },
  {
    slug: "insignia",
    nombre: "Insignia",
    concepto:
      "El logo centrado y a cuerpo de portada; debajo, una sola línea que dice qué es la app y las dos acciones. Sin titular.",
    acento: "#FF8D16",
  },
  {
    slug: "corona",
    nombre: "Corona",
    concepto:
      "El logo centrado y grande manda solo en el cielo; la línea corre por la curvatura del planeta, como los arcos del cuño.",
    acento: "#E0552F",
  },
  {
    slug: "capitulos",
    nombre: "Capítulos",
    concepto:
      "En la primera pantalla sólo el logo y las acciones. El mensaje aparece durante la bajada, en dos tarjetas de cristal, mientras la cámara desciende.",
    acento: "#25CCB8",
  },
];

export function findVariant(slug: string): HeroVariant | undefined {
  return HERO_VARIANTS.find((v) => v.slug === slug);
}
