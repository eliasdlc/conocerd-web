// ─────────────────────────────────────────────────────────────────────────────
//  El correo del itinerario.
//
//  Lo que la persona armó en el mapa le llega escrito: cada parada con su foto,
//  qué es, qué hacer ahí y cuánto maneja hasta la siguiente, por carretera de
//  verdad (matriz `pairs.json`, la misma que dibuja la ruta).
//
//  El chasis (logo, sello, botones, tarjetas, pie) es el compartido de
//  `lib/email/layout`: este archivo sólo pone lo que es propio de una ruta.
//
//  Sin `RESEND_API_KEY` / `ITINERARY_FROM` esto es un no-op explícito
//  (`skipped`): el correo ya quedó guardado en la lista y la landing sigue
//  funcionando en local, igual que el alta en el ESP.
// ─────────────────────────────────────────────────────────────────────────────

import { DESTINATIONS, CATEGORY_META, type Destination } from "@/data/destinations";
import { SITE_URL } from "@/lib/site";
import pairs from "@/data/routes/pairs.json";

import { loadEmailAssets, type EmailAssets, type RenderMode } from "@/lib/email/assets";
import {
  ALT_TYPE,
  LOGO_ASSET,
  button,
  card,
  heading,
  kicker,
  paragraph,
  row,
  shell,
  stamp,
  stampAsset,
} from "@/lib/email/layout";
import { sendEmail, type RenderedEmail, type SendResult } from "@/lib/email/send";
import { C, F, WIDTH, esc } from "@/lib/email/theme";

const IDS = pairs.ids as string[];
const KM = pairs.km as number[][];
const MIN = pairs.min as number[][];

const DEST: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d])
);

/** Ids que el endpoint acepta: los que existen y están en la matriz de pares. */
export const ROUTABLE_IDS = new Set(
  DESTINATIONS.filter((d) => IDS.includes(d.id)).map((d) => d.id)
);

export type ItineraryResult = SendResult;

/** Ancho útil de la columna una vez descontado el borde de la tarjeta. */
const CARD_W = WIDTH - 2;

function pairKm(a: string, b: string): number {
  return KM[IDS.indexOf(a)][IDS.indexOf(b)] ?? 0;
}
function pairMin(a: string, b: string): number {
  return MIN[IDS.indexOf(a)][IDS.indexOf(b)] ?? 0;
}

function fmtDur(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function mapsUrl(d: Destination): string {
  const [lng, lat] = d.coords;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function itineraryTotals(stops: string[]): { km: number; min: number } {
  let km = 0;
  let min = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    km += pairKm(stops[i], stops[i + 1]);
    min += pairMin(stops[i], stops[i + 1]);
  }
  return { km: Math.round(km), min: Math.round(min) };
}

/** Las tres cifras de la ruta, en una tira de tres columnas. */
function totalsStrip(stops: number, km: number, min: number): string {
  const cell = (value: string, label: string, first = false) =>
    `<td align="center" width="33%" style="padding:16px 6px;${
      first ? "" : `border-left:1px solid ${C.line};`
    }">
      <div style="font:700 22px/1.1 ${F.mono};color:${C.ink};">${value}</div>
      <div style="margin-top:3px;font:700 11px/1.4 ${F.sans};letter-spacing:.07em;color:${C.muted};text-transform:uppercase;">${label}</div>
    </td>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${C.paper};border:1px solid ${C.line};border-radius:14px;">
    <tr>
      ${cell(String(stops), stops === 1 ? "parada" : "paradas", true)}
      ${cell(`${km} km`, "por carretera")}
      ${cell(fmtDur(min), "manejando")}
    </tr>
  </table>`;
}

/**
 * La foto de la parada, en la copia que el correo sí sabe pintar.
 *
 * El sitio sirve WebP y Outlook de escritorio no lo lee — la tarjeta se
 * quedaría con el nombre del lugar donde va la playa. Las copias JPEG salen del
 * mismo original con `pnpm email:photos`; el nombre es el contrato entre ese
 * script y esta función.
 */
function photoPath(d: Destination): string {
  const file = d.image.split("/").pop()!.replace(/\.\w+$/, ".jpg");
  return `/assets/email/${file}`;
}

function stopBlock(assets: EmailAssets, id: string, i: number): string {
  const d = DEST[id];
  const meta = CATEGORY_META[d.category];

  return `
  <tr><td style="padding:0 0 8px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${C.paper};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
      <tr><td align="center" bgcolor="${C.cream2}" style="background:${C.cream2};">
        <img src="${assets.src(photoPath(d))}" width="${CARD_W}" alt="${esc(d.name)}"
          style="display:block;width:100%;max-width:${CARD_W}px;height:auto;border:0;${ALT_TYPE}" />
      </td></tr>
      <tr><td style="padding:16px 20px 20px 20px;">
        <p style="margin:0;font:700 12px/1 ${F.mono};letter-spacing:.1em;color:${meta.ink};text-transform:uppercase;">
          Parada ${i + 1} &nbsp;·&nbsp; ${esc(meta.label)}
        </p>
        <h2 style="margin:7px 0 0 0;font:700 22px/1.2 ${F.serif};color:${C.ink};">
          ${esc(d.name)}
        </h2>
        <p style="margin:4px 0 0 0;font:400 13px/1.4 ${F.sans};color:${C.muted};">
          ${esc(d.province)} &nbsp;·&nbsp; ★ ${d.rating.toFixed(1)}
        </p>
        <p style="margin:11px 0 0 0;font:400 15px/1.6 ${F.sans};color:${C.ink};">
          ${esc(d.desc)}
        </p>
        <p style="margin:11px 0 0 0;font:400 13px/1.6 ${F.sans};color:${C.muted};">
          <strong style="color:${C.ink};">Qué hacer:</strong> ${esc(d.activities.join(" · "))}
        </p>
        <p style="margin:16px 0 0 0;">
          <a href="${mapsUrl(d)}"
            style="display:inline-block;padding:10px 18px;background:${C.cream2};border-radius:999px;font:700 13px/1 ${F.sans};color:${C.ink};text-decoration:none;">
            Cómo llegar &rarr;
          </a>
        </p>
      </td></tr>
    </table>
  </td></tr>`;
}

function legBlock(a: string, b: string): string {
  return `
  <tr><td align="center" style="padding:4px 0 12px 0;">
    <p style="margin:0;font:700 13px/1 ${F.mono};color:${C.muted};">
      ↓ &nbsp;${Math.round(pairKm(a, b))} km &nbsp;·&nbsp; ${fmtDur(pairMin(a, b))} manejando
    </p>
  </td></tr>`;
}

export async function renderItineraryEmail(
  stops: string[],
  mode: RenderMode = "send"
): Promise<RenderedEmail> {
  const assets = await loadEmailAssets([LOGO_ASSET, stampAsset("ruta")], mode);
  const { km, min } = itineraryTotals(stops);
  const first = DEST[stops[0]];
  const last = DEST[stops[stops.length - 1]];
  const subject = `Tu ruta por RD: ${first.name} → ${last.name} (${stops.length} paradas)`;

  const paradas = stops
    .map(
      (id, i) => stopBlock(assets, id, i) + (i < stops.length - 1 ? legBlock(id, stops[i + 1]) : "")
    )
    .join("");

  const content = [
    row(
      `${stamp(assets, "ruta")}
       <div style="text-align:center;">
         ${kicker("Tu ruta, parada por parada")}
         ${heading("Aquí está tu viaje")}
       </div>`,
      "0 0 6px 0"
    ),
    row(
      paragraph(
        "Lo armaste tú en el mapa. Te lo dejamos escrito para el día del viaje: qué es cada lugar, qué hacer ahí y cuánto manejas de una parada a la otra."
      ),
      "0 0 22px 0"
    ),
    row(totalsStrip(stops.length, km, min), "0 0 20px 0"),
    paradas,
    row(
      card(
        `<p style="margin:0 0 16px 0;text-align:center;font:400 15px/1.6 ${F.sans};color:${C.muted};">
          Cambia una parada, añade otra o empieza un viaje nuevo. La ruta se arma en el mapa y te llega igual de escrita.
        </p>
        ${button(`${SITE_URL}/#trigger-mapa`, "Arma otra ruta")}`,
        "22px 20px"
      ),
      "16px 0 0 0"
    ),
  ].join("");

  const html = shell({
    title: subject,
    preheader: `${stops.length} paradas · ${km} km · ${fmtDur(min)} manejando por República Dominicana.`,
    content,
    footerNote: "Te llegó esto porque guardaste una ruta en ConoceRD.",
    assets,
  });

  const text = [
    "Tu ruta por República Dominicana",
    `${stops.length} paradas · ${km} km · ${fmtDur(min)} manejando`,
    "",
    ...stops.flatMap((id, i) => {
      const d = DEST[id];
      const lines = [
        `${i + 1}. ${d.name} (${d.province})`,
        `   ${d.desc}`,
        `   Qué hacer: ${d.activities.join(", ")}`,
        `   Cómo llegar: ${mapsUrl(d)}`,
      ];
      if (i < stops.length - 1) {
        lines.push(
          `   ↓ ${Math.round(pairKm(id, stops[i + 1]))} km · ${fmtDur(pairMin(id, stops[i + 1]))} manejando`
        );
      }
      return [...lines, ""];
    }),
    `Arma otra ruta: ${SITE_URL}/#trigger-mapa`,
    "",
    "Te llegó esto porque guardaste una ruta en ConoceRD. Si no quieres más",
    "correos, responde a este con «Baja».",
  ].join("\n");

  return { subject, html, text, attachments: assets.attachments };
}

export async function sendItineraryEmail(
  to: string,
  stops: string[]
): Promise<ItineraryResult> {
  const { subject, html, text, attachments } = await renderItineraryEmail(stops);
  const sent = await sendEmail({ to, subject, html, text, attachments });

  // En local el no-op es a propósito. En producción no: el mapa estampa el
  // sello de "listo" cuando el endpoint responde `ok`, así que saltarse el
  // envío en silencio le promete a la persona un correo que nunca sale.
  if (sent.ok && sent.skipped) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Falta RESEND_API_KEY o ITINERARY_FROM" };
    }
    console.warn("[itinerario] envío omitido: falta RESEND_API_KEY o ITINERARY_FROM");
  }
  return sent;
}
