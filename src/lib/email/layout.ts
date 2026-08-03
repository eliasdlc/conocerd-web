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
  return `<p style="margin:0;font:700 12px/1.3 ${F.mono};letter-spacing:.14em;color:${color};text-transform:uppercase;">${esc(
    text
  )}</p>`;
}

export function heading(text: string, size = 29): string {
  return `<h1 style="margin:8px 0 0 0;font:700 ${size}px/1.15 ${F.serif};color:${C.ink};">${esc(text)}</h1>`;
}

export function subheading(text: string): string {
  return `<h2 style="margin:0 0 8px 0;font:700 19px/1.25 ${F.serif};color:${C.ink};">${esc(text)}</h2>`;
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
export function button(href: string, label: string, bg: string = C.mango, fg = "#FFFFFF"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr><td align="center" bgcolor="${bg}" style="border-radius:999px;background:${bg};">
      <a href="${href}" style="display:inline-block;padding:14px 26px;font:700 15px/1 ${F.sans};color:${fg};text-decoration:none;border-radius:999px;">${esc(
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

function header(assets: EmailAssets): string {
  return `<tr><td align="center" style="padding:4px 0 22px 0;">
    <a href="${SITE_URL}" style="text-decoration:none;">
      <img src="${assets.src(LOGO_ASSET)}" width="${EMAIL_ASSET_PX.logoWidth}"
        alt="ConoceRD"
        style="display:block;width:${EMAIL_ASSET_PX.logoWidth}px;height:auto;border:0;${ALT_TYPE}" />
    </a>
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
}

export function shell({ title, preheader, content, footerNote, assets }: ShellOptions): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<!-- Sin esto, el modo oscuro de Gmail/Apple Mail invierte el crema por su
     cuenta y deja los textos de marca con un halo gris encima. -->
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};">
  <tr><td align="center" style="padding:28px 12px 40px 12px;">
    <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:${WIDTH}px;max-width:100%;">
      ${header(assets)}
      ${content}
      ${footer(footerNote)}
    </table>
  </td></tr>
</table>
</body></html>`;
}
