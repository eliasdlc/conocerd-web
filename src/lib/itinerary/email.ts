// ─────────────────────────────────────────────────────────────────────────────
//  El correo del itinerario.
//
//  Lo que la persona armó en el mapa le llega escrito: cada parada con su foto,
//  qué es, qué hacer ahí y cuánto maneja hasta la siguiente, por carretera de
//  verdad (matriz `pairs.json`, la misma que dibuja la ruta).
//
//  Sin `RESEND_API_KEY` / `ITINERARY_FROM` esto es un no-op explícito
//  (`skipped`): el correo ya quedó guardado en la lista y la landing sigue
//  funcionando en local, igual que el alta en el ESP.
//
//  HTML de correo, no de web: tablas, estilos en línea y anchos fijos. Los
//  clientes de correo no entienden flex/grid ni hojas externas.
// ─────────────────────────────────────────────────────────────────────────────

import { DESTINATIONS, CATEGORY_META, type Destination } from "@/data/destinations";
import { SITE_URL } from "@/lib/site";
import pairs from "@/data/routes/pairs.json";

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

export type ItineraryResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

/** Buzón que atiende las bajas; recibe de verdad (MX de la raíz en name.com). */
const UNSUBSCRIBE_MAILBOX = "info@conocerd.app";

const C = {
  cream: "#FDF8F0",
  cream2: "#F5EEE3",
  ink: "#264653",
  muted: "#6B7C82",
  mango: "#FF8D16",
  line: "#E5DCD0",
};

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

/** Escapa el texto que va dentro del HTML (los datos son nuestros, pero el
 *  correo se arma por concatenación y esto no se puede olvidar nunca). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function stopBlock(id: string, i: number): string {
  const d = DEST[id];
  const meta = CATEGORY_META[d.category];
  const img = `${SITE_URL}${d.image}`;

  return `
  <tr><td style="padding:0 0 8px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#FFFFFF;border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
      <tr><td>
        <img src="${img}" width="536" alt="${esc(d.name)}"
          style="display:block;width:100%;max-width:536px;height:auto;border:0;" />
      </td></tr>
      <tr><td style="padding:16px 18px 18px 18px;">
        <p style="margin:0 0 6px 0;font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.1em;color:${meta.ink};text-transform:uppercase;">
          Parada ${i + 1} &nbsp;·&nbsp; ${esc(meta.label)}
        </p>
        <h2 style="margin:0;font:700 21px/1.25 Georgia,'Times New Roman',serif;color:${C.ink};">
          ${esc(d.name)}
        </h2>
        <p style="margin:4px 0 0 0;font:400 13px/1.4 Helvetica,Arial,sans-serif;color:${C.muted};">
          ${esc(d.province)} &nbsp;·&nbsp; ★ ${d.rating.toFixed(1)}
        </p>
        <p style="margin:10px 0 0 0;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:${C.ink};">
          ${esc(d.desc)}
        </p>
        <p style="margin:10px 0 0 0;font:400 13px/1.6 Helvetica,Arial,sans-serif;color:${C.muted};">
          <strong style="color:${C.ink};">Qué hacer:</strong> ${esc(d.activities.join(" · "))}
        </p>
        <p style="margin:14px 0 0 0;">
          <a href="${mapsUrl(d)}"
            style="display:inline-block;padding:9px 16px;background:${C.cream2};border-radius:999px;font:700 13px/1 Helvetica,Arial,sans-serif;color:${C.ink};text-decoration:none;">
            Cómo llegar &rarr;
          </a>
        </p>
      </td></tr>
    </table>
  </td></tr>`;
}

function legBlock(a: string, b: string): string {
  return `
  <tr><td align="center" style="padding:2px 0 10px 0;">
    <p style="margin:0;font:700 13px/1 ui-monospace,Menlo,Consolas,monospace;color:${C.muted};">
      ↓ &nbsp;${Math.round(pairKm(a, b))} km &nbsp;·&nbsp; ${fmtDur(pairMin(a, b))} manejando
    </p>
  </td></tr>`;
}

export function renderItineraryEmail(stops: string[]): { subject: string; html: string; text: string } {
  const { km, min } = itineraryTotals(stops);
  const first = DEST[stops[0]];
  const last = DEST[stops[stops.length - 1]];
  const subject = `Tu ruta por RD: ${first.name} → ${last.name} (${stops.length} paradas)`;

  const body = stops
    .map((id, i) => stopBlock(id, i) + (i < stops.length - 1 ? legBlock(id, stops[i + 1]) : ""))
    .join("");

  const html = `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">
  ${stops.length} paradas · ${km} km · ${fmtDur(min)} manejando por República Dominicana.
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};">
  <tr><td align="center" style="padding:28px 12px 40px 12px;">
    <table role="presentation" width="536" cellpadding="0" cellspacing="0" border="0" style="width:536px;max-width:100%;">

      <tr><td style="padding:0 0 20px 0;">
        <p style="margin:0;font:700 12px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em;color:${C.mango};text-transform:uppercase;">
          ConoceRD &nbsp;·&nbsp; Tu ruta
        </p>
        <h1 style="margin:8px 0 0 0;font:700 30px/1.15 Georgia,'Times New Roman',serif;color:${C.ink};">
          Aquí está tu viaje, parada por parada
        </h1>
        <p style="margin:10px 0 0 0;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:${C.muted};">
          Lo armaste tú en el mapa. Te lo dejamos escrito para el día del viaje:
          qué es cada lugar, qué hacer ahí y cuánto manejas de una parada a la otra.
        </p>
      </td></tr>

      <tr><td style="padding:0 0 20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:#FFFFFF;border:1px solid ${C.line};border-radius:14px;">
          <tr>
            <td align="center" style="padding:14px 6px;">
              <div style="font:700 22px/1.1 ui-monospace,Menlo,Consolas,monospace;color:${C.ink};">${stops.length}</div>
              <div style="font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.06em;color:${C.muted};text-transform:uppercase;">${stops.length === 1 ? "parada" : "paradas"}</div>
            </td>
            <td align="center" style="padding:14px 6px;border-left:1px solid ${C.line};">
              <div style="font:700 22px/1.1 ui-monospace,Menlo,Consolas,monospace;color:${C.ink};">${km} km</div>
              <div style="font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.06em;color:${C.muted};text-transform:uppercase;">por carretera</div>
            </td>
            <td align="center" style="padding:14px 6px;border-left:1px solid ${C.line};">
              <div style="font:700 22px/1.1 ui-monospace,Menlo,Consolas,monospace;color:${C.ink};">${fmtDur(min)}</div>
              <div style="font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.06em;color:${C.muted};text-transform:uppercase;">manejando</div>
            </td>
          </tr>
        </table>
      </td></tr>

      ${body}

      <tr><td align="center" style="padding:14px 0 0 0;">
        <a href="${SITE_URL}"
          style="display:inline-block;padding:13px 22px;background:${C.mango};border-radius:999px;font:700 15px/1 Helvetica,Arial,sans-serif;color:#FFFFFF;text-decoration:none;">
          Arma otra ruta en ConoceRD
        </a>
        <p style="margin:16px 0 0 0;font:400 12px/1.5 Helvetica,Arial,sans-serif;color:${C.muted};">
          Te llegó esto porque guardaste una ruta en ConoceRD. Estás en la lista de
          espera; te avisamos cuando abra la app.
          Si no quieres más correos, responde a este con «Baja».
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

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
    `Arma otra ruta: ${SITE_URL}`,
    "",
    "Te llegó esto porque guardaste una ruta en ConoceRD. Si no quieres más",
    "correos, responde a este con «Baja».",
  ].join("\n");

  return { subject, html, text };
}

export async function sendItineraryEmail(
  to: string,
  stops: string[]
): Promise<ItineraryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ITINERARY_FROM;
  if (!apiKey || !from) {
    // En local el no-op es a propósito. En producción no: el mapa estampa el
    // sello de "listo" cuando el endpoint responde `ok`, así que saltarse el
    // envío en silencio le promete a la persona un correo que nunca sale.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "Falta RESEND_API_KEY o ITINERARY_FROM" };
    }
    console.warn("[itinerario] envío omitido: falta RESEND_API_KEY o ITINERARY_FROM");
    return { ok: true, skipped: true };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { subject, html, text } = renderItineraryEmail(stops);
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      // Gmail y Yahoo penalizan a un remitente nuevo sin salida de un clic.
      // `mailto:` en vez de URL porque no hay endpoint de baja todavía.
      headers: { "List-Unsubscribe": `<mailto:${UNSUBSCRIBE_MAILBOX}?subject=Baja>` },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
