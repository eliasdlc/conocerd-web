// ─────────────────────────────────────────────────────────────────────────────
//  Las imágenes que viajan en los correos.
//
//  Gmail y Outlook no pintan SVG, así que la estampa y el logo van como PNG.
//  Esta lista es el contrato entre tres sitios: la página que los dibuja
//  (/dev/email-assets), el script que los fotografía
//  (scripts/gen-email-assets.mjs) y el correo que los enseña. Añadir un sello =
//  añadir una entrada y volver a correr `pnpm email:assets`.
// ─────────────────────────────────────────────────────────────────────────────

export type EmailStampSlug = "ruta" | "viajero" | "negocio";

export interface EmailStampSpec {
  slug: EmailStampSlug;
  color: string;
  accent: string;
  accent2: string;
  /** Texto de la cinta. Corto: en la cinta caben ~14 caracteres. */
  line1: string;
  line2: string;
  /** Giro de tampón, horneado en el PNG: el correo no tiene transforms CSS. */
  rotate: number;
}

/** Tamaños de dibujo en CSS px; el script los fotografía a 2× para pantallas retina. */
export const EMAIL_ASSET_PX = {
  /** Ancho al que se muestra el logo en la cabecera del correo. */
  logoWidth: 272,
  /** Lado del SVG del sello. */
  stampSize: 132,
  /** Lado de la caja que lo contiene (y del PNG resultante). El margen extra
   *  evita que el troquel festoneado quede recortado al girar el cuño. */
  stampBox: 148,
  /** Lado del sello cuando va pegado en la esquina de la credencial. Más chico
   *  que el PNG: ahí compite con el titular, no lo encabeza. */
  stampCorner: 126,
} as const;

export const EMAIL_STAMPS: EmailStampSpec[] = [
  {
    slug: "ruta",
    color: "#B23410",
    accent: "#FF8D16",
    accent2: "#25CCB8",
    line1: "RUTA GUARDADA",
    line2: "· HECHO EN RD ·",
    rotate: -7,
  },
  {
    slug: "viajero",
    color: "#B23410",
    accent: "#FF8D16",
    accent2: "#25CCB8",
    line1: "MODO VIAJERO",
    line2: "· EST. 2026 ·",
    rotate: 6,
  },
  {
    slug: "negocio",
    color: "#0C6A60",
    accent: "#FF8D16",
    accent2: "#25CCB8",
    line1: "NEGOCIO LOCAL",
    line2: "· EST. 2026 ·",
    rotate: -8,
  },
];
