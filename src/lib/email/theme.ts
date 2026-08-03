// ─────────────────────────────────────────────────────────────────────────────
//  Los tokens de los correos.
//
//  Son los mismos de globals.css, copiados a mano: el correo no puede leer
//  custom properties (Outlook ni siquiera entiende `var()`), así que cada color
//  tiene que llegar como hexadecimal literal dentro de un atributo `style`.
//
//  Regla de contraste, importante: sobre crema NUNCA se pone texto en mango
//  (#FF8D16 da 2.1:1 y se lee gris sucio, "sombreado"). Los tonos vivos son
//  para rellenos y bordes; para texto están las variantes `-ink`.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  cream: "#FDF8F0",
  cream2: "#F5EFE2",
  paper: "#FFFFFF",
  ink: "#264653",
  ink2: "#1D3A45",
  muted: "#5B6B72",
  muted2: "#66747B",
  line: "#EBE6D9",
  mango: "#FF8D16",
  mangoSoft: "#FFE6C8",
  coral: "#F76C4D",
  coralInk: "#B23410",
  coralSoft: "#FFE7DF",
  mint: "#25CCB8",
  mintInk: "#0C6A60",
  mintSoft: "#C6F3EB",

  // Sobre el panel de tinta (la credencial). Las reglas se invierten: aquí el
  // texto claro es el que tiene contraste y el mango puro se queda en 4.3:1,
  // así que sube un punto de luz. El mint sí pasa tal cual (5:1).
  onInk: "#FFFFFF",
  onInkSoft: "#CBDDE2",
  onInkLabel: "#9DBDC5",
  onInkLine: "#3E6673",
  mangoOnInk: "#FFA94D",
} as const;

/** Pilas de fuentes seguras para correo: nada de webfonts, nada de `var()`. */
export const F = {
  sans: "Helvetica,Arial,sans-serif",
  serif: "Georgia,'Times New Roman',serif",
  mono: "ui-monospace,'SF Mono',Menlo,Consolas,monospace",
} as const;

/** Ancho de la columna. 560 entra en el panel de lectura de Outlook sin cortarse. */
export const WIDTH = 560;

/** Escapa el texto que va dentro del HTML. Los datos son nuestros, pero el
 *  correo se arma por concatenación y esto no se puede olvidar nunca. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
