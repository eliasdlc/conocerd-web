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
  ink: "#0F1A2E",
  ink2: "#090F1B",
  ink3: "#3B5073",
  muted: "#677080",
  muted2: "#7D8594",
  line: "#EBE6D9",
  lineStrong: "#D9D2C1",
  mango: "#FF8D16",
  mangoSoft: "#FFE6C8",
  mangoInk: "#985409",
  coral: "#E0552F",
  coralInk: "#B23410",
  coralSoft: "#FFE7DF",
  mint: "#25CCB8",
  mintInk: "#0C6A60",
  mintSoft: "#C6F3EB",

  // Sobre el panel de tinta (la credencial). Las reglas se invierten: aquí el
  // texto claro es el que tiene contraste.
  //
  // Con la tinta anterior (#264653) el mango puro se quedaba en 4.3:1 y hacía
  // falta un `mangoOnInk` aclarado. Sobre la tinta nueva el mango de marca da
  // 7.51:1, así que ese apaño desaparece y el acento sobre tinta es el mismo
  // hex en el correo y en la card del CTA del sitio.
  onInk: "#FFFFFF",
  onInkSoft: "#CBDDE2",   // 12.41:1 sobre ink
  onInkLabel: "#9DBDC5",  // 8.72:1 sobre ink
  // Hairline sobre tinta: es el blanco al 16 % del sistema, ya compuesto sobre
  // la tinta. El correo no puede fiarse de rgba() en todos los clientes.
  onInkLine: "#353F4F",
} as const;

/** Pilas de fuentes seguras para correo: nada de webfonts, nada de `var()`.
 *
 *  Un correo no carga la tipografía de marca, así que aquí no hay Bricolage ni
 *  Plus Jakarta: hay dos roles y sus mejores equivalentes instalados. `display`
 *  arranca por Trebuchet, que es el mismo primer recambio que la web declara
 *  detrás de Bricolage: un grotesco con carácter, no el serif de antes, que
 *  contaba una marca que ya no existe.
 *
 *  Tampoco hay mono: salió del sistema. Las cifras van en `display` y los
 *  metadatos en `sans`. */
export const F = {
  sans: "Helvetica,Arial,sans-serif",
  display: "'Trebuchet MS',Helvetica,Arial,sans-serif",
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
