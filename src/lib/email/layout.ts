// ─────────────────────────────────────────────────────────────────────────────
//  El chasis y las piezas de todos los correos de ConoceRD.
//
//  HTML de correo, no de web: tablas, estilos en línea y anchos fijos. Los
//  clientes de correo no entienden flex/grid, ni hojas externas, ni `var()`, y
//  Outlook renderiza con el motor de Word (sin `border-radius` ni `box-shadow`;
//  se degradan a esquinas rectas, que es un degradado aceptable).
//
//  Todo lo que se repetía entre correos vive aquí — cabecera con el logo,
//  sello, botones, tarjetas, pie — para que el itinerario y las bienvenidas no
//  se separen visualmente con el tiempo.
// ─────────────────────────────────────────────────────────────────────────────

import { SITE_URL } from "@/lib/site";
import type { EmailAssets } from "./assets";
import { C, F, WIDTH, esc } from "./theme";
import { EMAIL_ASSET_PX, type EmailStampSlug } from "./stamps";

/** Buzón que atiende las bajas; recibe de verdad (MX de la raíz en name.com). */
export const UNSUBSCRIBE_MAILBOX = "info@conocerd.app";

const INSTAGRAM = { handle: "@conocerd.app", url: "https://instagram.com/conocerd.app" };

/** URL absoluta de un asset. Los correos no resuelven rutas relativas. */
export function asset(p: string): string {
  return `${SITE_URL}${p}`;
}

/**
 * Los binarios de marca que viajan dentro del mensaje (ver `assets.ts`). En
 * carpeta aparte de las fotos de los destinos: esto es chasis —lo lee el
 * servidor y entra en el bundle de la ruta— y aquello es contenido que se
 * genera en lote y sólo se sirve por URL.
 */
export const LOGO_ASSET = "/assets/email/marca/logo.png";
export const stampAsset = (slug: EmailStampSlug) => `/assets/email/marca/sello-${slug}.png`;

/**
 * Estilo del texto alternativo. Cuando una imagen no llega —bloqueada, aún sin
 * publicar, formato que el cliente no lee— casi todos los clientes pintan el
 * `alt` con la tipografía del sistema en negro: se ve como un error. Heredar la
 * tipografía del correo hace que la caída parezca parte del diseño.
 */
export const ALT_TYPE = `font:700 13px/1.4 ${F.sans};color:${C.muted};`;

/** Enlace al mapa del sitio, que es la demo de rutas. */
export const DEMO_URL = `${SITE_URL}/#trigger-mapa`;

// ─── Piezas ──────────────────────────────────────────────────────────────────

/** Una fila de la columna principal. `pad` en la sintaxis de CSS. */
export function row(html: string, pad = "0 0 18px 0"): string {
  return `<tr><td style="padding:${pad};">${html}</td></tr>`;
}

/** Etiqueta mono en versalitas sobre el titular. Coral-ink: 6:1 sobre crema. */
export function kicker(text: string, color: string = C.coralInk): string {
  return `<p style="margin:0;font:700 12px/1.3 ${F.sans};letter-spacing:.14em;color:${color};text-transform:uppercase;">${esc(
    text
  )}</p>`;
}

export function heading(text: string, size = 29): string {
  return `<h1 style="margin:8px 0 0 0;font:700 ${size}px/1.15 ${F.display};color:${C.ink};">${esc(text)}</h1>`;
}

export function subheading(text: string): string {
  return `<h2 style="margin:0 0 8px 0;font:700 19px/1.25 ${F.display};color:${C.ink};">${esc(text)}</h2>`;
}

export function paragraph(html: string, color: string = C.muted, size = 15): string {
  return `<p style="margin:10px 0 0 0;font:400 ${size}px/1.6 ${F.sans};color:${color};">${html}</p>`;
}

/** Línea de puntos: el mismo separador punteado que usa el sitio. */
export function divider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px dashed ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
}

/**
 * Botón "a prueba de balas": el color vive en el <td>, no en el <a>, porque
 * Outlook ignora el fondo de un enlace en línea. El padding va en el <td> por
 * la misma razón.
 */
/* El relleno por defecto es la tinta y no el mango: la etiqueta va a 15 w700 y
 * blanco sobre mango da 2.31:1. Es el mismo par que el sitio quitó de todos sus
 * botones. Por debajo de 19 w700 el relleno del sistema es la tinta, 17.4:1. */
export function button(
  href: string,
  label: string,
  bg: string = C.ink,
  fg = "#FFFFFF",
  align: "left" | "center" = "center"
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 ${
    align === "center" ? "auto" : "auto 0 0"
  };">
    <tr><td align="center" bgcolor="${bg}" style="border-radius:999px;background:${bg};">
      <a href="${href}" style="display:inline-block;padding:15px 30px;font:700 15px/1 ${F.sans};color:${fg};text-decoration:none;border-radius:999px;">${esc(
        label
      )}</a>
    </td></tr>
  </table>`;
}

/** Tarjeta blanca con borde: el contenedor de todo lo que no es texto suelto. */
export function card(inner: string, pad = "18px 20px"): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${C.paper};border:1px solid ${C.line};border-radius:14px;">
    <tr><td style="padding:${pad};">${inner}</td></tr>
  </table>`;
}

/**
 * Lista de beneficios. Cada punto lleva una pastilla de color a la izquierda en
 * vez de un icono: los iconos del sitio son una fuente que el correo no puede
 * cargar, y una imagen por punto multiplica las descargas del mensaje.
 */
export function bulletList(
  items: { title: string; desc: string }[],
  dot: string = C.mango
): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${items
      .map(
        (it, i) => `<tr>
      <td width="26" valign="top" style="padding:${i ? "14px" : "0"} 0 0 0;">
        <div style="width:10px;height:10px;margin-top:5px;border-radius:3px;background:${dot};font-size:0;line-height:0;">&nbsp;</div>
      </td>
      <td valign="top" style="padding:${i ? "14px" : "0"} 0 0 0;">
        <p style="margin:0;font:700 15px/1.35 ${F.sans};color:${C.ink};">${esc(it.title)}</p>
        <p style="margin:3px 0 0 0;font:400 14px/1.5 ${F.sans};color:${C.muted};">${esc(it.desc)}</p>
      </td>
    </tr>`
      )
      .join("")}
  </table>`;
}

/** Colores de las pastillas de `grid2`, en orden. Alternarlos evita que una
 *  rejilla de cuatro puntos iguales se lea como una tabla. */
const GRID_DOTS = [C.mango, C.mint, C.coral, C.ink];

/**
 * Rejilla de dos columnas para beneficios cortos.
 *
 * Cuatro promesas apiladas en vertical son una lista que se salta; en dos
 * columnas se leen de un vistazo y el correo pierde un tercio de su alto. La
 * clase `.stack` la parte en una sola columna en el móvil (media query del
 * `shell`); Outlook de escritorio la ignora, y ahí la pantalla siempre es ancha.
 */
export function grid2(items: { title: string; desc: string }[], dots: readonly string[] = GRID_DOTS): string {
  const cell = (it: { title: string; desc: string }, i: number) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="22" valign="top" style="padding:2px 0 0 0;">
          <div style="width:9px;height:9px;border-radius:3px;background:${
            dots[i % dots.length]
          };font-size:0;line-height:0;">&nbsp;</div>
        </td>
        <td valign="top">
          <p style="margin:0;font:700 15px/1.3 ${F.sans};color:${C.ink};">${esc(it.title)}</p>
          <p style="margin:4px 0 0 0;font:400 13px/1.5 ${F.sans};color:${C.muted};">${esc(it.desc)}</p>
        </td>
      </tr>
    </table>`;

  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const top = i ? "22px" : "0";
    rows.push(`<tr>
      <td class="stack" width="48%" valign="top" style="padding:${top} 12px 0 0;">${cell(items[i], i)}</td>
      <td class="stack stack-gap" width="48%" valign="top" style="padding:${top} 0 0 12px;">${
        items[i + 1] ? cell(items[i + 1], i + 1) : "&nbsp;"
      }</td>
    </tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
}

/** Banda crema con esquinas redondeadas: agrupa sin encerrar en una tarjeta. */
export function band(inner: string, pad = "20px 22px 22px 22px"): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    bgcolor="${C.cream2}" style="background:${C.cream2};border-radius:16px;">
    <tr><td style="padding:${pad};">${inner}</td></tr>
  </table>`;
}

export interface CredentialOptions {
  assets: EmailAssets;
  slug: EmailStampSlug;
  /** Etiqueta mono sobre el titular. */
  eyebrow: string;
  eyebrowColor: string;
  headline: string;
  body: string;
  /** Los datos del carnet, en dos columnas. */
  facts: { label: string; value: string }[];
}

/**
 * La credencial: panel de tinta con el sello pegado en la esquina.
 *
 * Es la cabecera de las bienvenidas y hace dos trabajos. Uno, dar el premio
 * antes que cualquier explicación: quien abre esto quiere saber qué se llevó,
 * no leer un párrafo de agradecimiento. Y dos, romper la columna — un panel
 * oscuro de borde a borde es lo único que impide que el correo se lea como una
 * pila de tarjetas iguales.
 *
 * El sello va en su propia celda con márgenes negativos para que se salga por
 * la esquina, como pegado a mano. Si un cliente los ignora (Outlook), cae
 * dentro del panel y sigue leyéndose como un cuño: la caída es un cambio de
 * posición, no un descuadre.
 */
export function credential({
  assets,
  slug,
  eyebrow,
  eyebrowColor,
  headline,
  body,
  facts,
}: CredentialOptions): string {
  const w = EMAIL_ASSET_PX.stampCorner;

  const fact = (f: { label: string; value: string }, i: number) => `
    <td class="stack${i ? " stack-gap" : ""}" width="50%" valign="top"
      style="padding:0 ${i ? "0" : "10px"} 0 ${i ? "10px" : "0"};">
      <p style="margin:0;font:700 10px/1.3 ${F.sans};letter-spacing:.14em;color:${
        C.onInkLabel
      };text-transform:uppercase;">${esc(f.label)}</p>
      <p style="margin:5px 0 0 0;font:700 14px/1.35 ${F.sans};color:${C.onInk};">${esc(f.value)}</p>
    </td>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    bgcolor="${C.ink}" style="background:${C.ink};border-radius:20px;">
    <tr><td style="padding:28px 28px 24px 28px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" style="padding:0 8px 0 0;">
            <p style="margin:0;font:700 11px/1.3 ${F.sans};letter-spacing:.16em;color:${eyebrowColor};text-transform:uppercase;">${esc(
              eyebrow
            )}</p>
            <h1 style="margin:10px 0 0 0;font:700 30px/1.12 ${F.display};color:${C.onInk};">${esc(
              headline
            )}</h1>
            <p style="margin:12px 0 0 0;font:400 15px/1.6 ${F.sans};color:${C.onInkSoft};">${esc(
              body
            )}</p>
          </td>
          <td class="stamp-cell" width="112" valign="top" align="right" style="padding:0;font-size:0;line-height:0;">
            <img src="${assets.src(stampAsset(slug))}" width="${w}" height="${w}" alt=""
              style="display:block;width:${w}px;height:${w}px;border:0;margin:-58px -46px 0 0;" />
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0 0;">
        <tr><td style="border-top:1px dashed ${C.onInkLine};font-size:0;line-height:0;padding:0;">&nbsp;</td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0 0;">
        <tr>${facts.map(fact).join("")}</tr>
      </table>

    </td></tr>
  </table>`;
}

/**
 * El sello, ya rasterizado y con su giro de tampón horneado en el PNG.
 *
 * `alt` vacío a propósito: el cuño es decoración —lo que dice ya está escrito
 * en el titular que va justo debajo— y un `alt` con frase deja dos líneas de
 * texto suelto encima del correo cuando la imagen no carga. Vacío, el hueco
 * simplemente no existe, y los lectores de pantalla lo saltan, que es lo
 * correcto para un adorno.
 */
export function stamp(assets: EmailAssets, slug: EmailStampSlug): string {
  const w = EMAIL_ASSET_PX.stampBox;
  return `<img src="${assets.src(stampAsset(slug))}" width="${w}" height="${w}" alt=""
    style="display:block;margin:0 auto;width:${w}px;height:${w}px;border:0;" />`;
}

// ─── Chasis ──────────────────────────────────────────────────────────────────

/**
 * Cabecera. Con `tag` el logo se va a la izquierda y la etiqueta al otro
 * extremo: basta esa asimetría para que el correo no empiece pareciendo una
 * columna centrada. Sin `tag` se queda centrada, que es como la quiere el
 * itinerario.
 */
function header(assets: EmailAssets, tag?: HeaderTag): string {
  const logo = `<a href="${SITE_URL}" style="text-decoration:none;">
      <img src="${assets.src(LOGO_ASSET)}" width="${EMAIL_ASSET_PX.logoWidth}"
        alt="ConoceRD"
        style="display:block;width:${EMAIL_ASSET_PX.logoWidth}px;height:auto;border:0;${ALT_TYPE}" />
    </a>`;

  if (!tag) {
    return `<tr><td align="center" style="padding:4px 0 22px 0;">${logo}</td></tr>`;
  }

  return `<tr><td style="padding:2px 0 26px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" style="padding:0;">${logo}</td>
        <td valign="middle" align="right" style="padding:0;">
          <span style="display:inline-block;padding:7px 13px;border-radius:999px;background:${tag.bg};
            font:700 10px/1 ${F.sans};letter-spacing:.12em;color:${tag.fg};">${esc(tag.text)}</span>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function footer(note: string): string {
  return `<tr><td style="padding:26px 0 0 0;">
    ${divider()}
    <p style="margin:18px 0 0 0;font:400 13px/1.6 ${F.sans};color:${C.muted};text-align:center;">
      ${note}
    </p>
    <p style="margin:14px 0 0 0;text-align:center;">
      <a href="${INSTAGRAM.url}" style="font:700 13px/1 ${F.sans};color:${C.ink};text-decoration:none;border-bottom:2px solid ${C.mint};padding-bottom:2px;">
        Síguenos en ${INSTAGRAM.handle}
      </a>
    </p>
    <p style="margin:18px 0 0 0;font:400 12px/1.55 ${F.sans};color:${C.muted2};text-align:center;">
      Estás en la lista de espera de ConoceRD y te avisamos cuando abra la app.
      ¿No quieres más correos? Responde a este con «Baja».<br />
      Santiago, República Dominicana · ${new Date().getFullYear()}
    </p>
  </td></tr>`;
}

/** Pastilla del extremo derecho de la cabecera («VIAJERO · FUNDADOR»). */
export interface HeaderTag {
  text: string;
  bg: string;
  fg: string;
}

export interface ShellOptions {
  /** Asunto/título; también el <title> del documento. */
  title: string;
  /** Texto de vista previa en la bandeja. Sin esto, el cliente enseña el alt del logo. */
  preheader: string;
  /** Filas `<tr>` de la columna principal. */
  content: string;
  /** Última línea del pie, antes de la letra pequeña legal. */
  footerNote: string;
  /** De dónde salen el logo y el sello: adjuntos o URL. Ver `assets.ts`. */
  assets: EmailAssets;
  /** Etiqueta de la cabecera. Sin ella, el logo va centrado. */
  tag?: HeaderTag;
}

export function shell({ title, preheader, content, footerNote, assets, tag }: ShellOptions): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<!-- Sin esto, el modo oscuro de Gmail/Apple Mail invierte el crema por su
     cuenta y deja los textos de marca con un halo gris encima. -->
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(title)}</title>
<!-- Lo único que no va en línea. Gmail, Apple Mail e iOS aplican estas reglas;
     Outlook de escritorio ignora las media queries, y ahí la ventana siempre
     es ancha, así que el diseño de dos columnas es el correcto. -->
<style>
  @media only screen and (max-width:600px) {
    .stack { display:block !important; width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .stack-gap { padding-top:18px !important; }
    /* El sello se queda —en el móvil es donde más se abre el correo—: sólo
       encoge y pega menos vuelo para no comerse el titular. */
    .stamp-cell { width:84px !important; }
    .stamp-cell img { width:92px !important; height:92px !important; margin:-34px -22px 0 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.cream};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};">
  <tr><td align="center" style="padding:28px 12px 40px 12px;">
    <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${WIDTH}px;max-width:100%;">
      ${header(assets, tag)}
      ${content}
      ${footer(footerNote)}
    </table>
  </td></tr>
</table>
</body></html>`;
}
