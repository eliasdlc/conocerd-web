// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/itinerario — "Guardar viaje" del mapa.
//
//  Guarda el correo en la lista de espera (mismo store que /api/subscribe, con
//  `ref` que dice de dónde vino) y le manda a la persona su ruta escrita: cada
//  parada con foto, descripción, qué hacer y cuánto maneja hasta la siguiente.
//
//  Orden deliberado, igual que en /api/subscribe: valida → honeypot → rate
//  limit → guarda → envía. El correo queda a salvo aunque el envío falle; el
//  reintento es idempotente porque el store deduplica por correo.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

import { clientIp, rateLimit } from "@/lib/rateLimit";
import { addToAudience } from "@/lib/waitlist/esp";
import { HONEYPOT_FIELD } from "@/lib/waitlist/constants";
import { getWaitlistStore } from "@/lib/waitlist/store";
import { ROUTABLE_IDS, renderItineraryEmail, sendItineraryEmail } from "@/lib/itinerary/email";

// Un envío es más caro que un alta en la lista: límite más apretado.
const RATE_LIMIT = { limit: 3, windowMs: 60_000 };

/** Tope de paradas: por encima el correo deja de ser un itinerario legible. */
const MAX_STOPS = 12;

type ItineraryResponse = { ok: true } | { ok: false; error: string };

const schema = z.object({
  // Mismo trato que en la lista de espera: los teclados móviles capitalizan y
  // dejan espacios, y " Elias@Ejemplo.COM " es un correo perfectamente válido.
  email: z
    .string()
    .max(254)
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.email("Correo inválido")),
  stops: z
    .array(z.string().max(60))
    .min(2, "Tu ruta necesita al menos dos paradas")
    .max(MAX_STOPS, `Máximo ${MAX_STOPS} paradas por correo`)
    .refine((ids) => ids.every((id) => ROUTABLE_IDS.has(id)), "Ruta inválida")
    .refine((ids) => new Set(ids).size === ids.length, "Hay paradas repetidas"),
  [HONEYPOT_FIELD]: z.string().max(200).optional(),
});

function json(body: ItineraryResponse, init?: ResponseInit) {
  return Response.json(body, init);
}

/**
 * Preview del correo en el navegador, solo en desarrollo:
 *   /api/itinerario?stops=aguilas,barahona,constanza
 * Iterar el diseño de un correo mandándoselo a uno mismo es insoportable.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const raw = new URL(request.url).searchParams.get("stops") ?? "";
  const stops = raw.split(",").filter((id) => ROUTABLE_IDS.has(id));
  if (stops.length < 2) {
    return new Response("Pasa ?stops=id1,id2,… con al menos dos destinos válidos", {
      status: 400,
    });
  }
  // `preview`: el navegador no sabe qué es un `cid:`, así que la marca se pinta
  // desde las rutas del propio servidor en vez de viajar adjunta.
  const { html } = await renderItineraryEmail(stops, "preview");
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos" },
      { status: 400 }
    );
  }

  const { email, stops } = parsed.data;

  // Honeypot: respondemos como si todo hubiera ido bien, sin guardar ni enviar.
  if (parsed.data[HONEYPOT_FIELD]) return json({ ok: true });

  const limit = rateLimit(`itinerario:${clientIp(request.headers)}`, RATE_LIMIT);
  if (!limit.allowed) {
    return json(
      { ok: false, error: "Demasiados envíos seguidos. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let status: "created" | "already_subscribed";
  try {
    status = await getWaitlistStore().save({
      email,
      audience: "viajero",
      ref: "mapa-itinerario",
      consentAt: new Date(),
    });
  } catch (err) {
    console.error("[itinerario] fallo al guardar", err);
    return json(
      { ok: false, error: "No pudimos guardar tu correo. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  const sent = await sendItineraryEmail(email, stops);
  if (!sent.ok) {
    console.error("[itinerario] fallo al enviar", sent.error);
    return json(
      { ok: false, error: "No pudimos enviar el correo. Inténtalo de nuevo en un momento." },
      { status: 502 }
    );
  }

  // El alta en el ESP no bloquea la respuesta: la persona ya tiene su correo y
  // el registro está en la base; reconciliar la audiencia después es barato.
  if (status === "created") {
    const esp = await addToAudience({ email, audience: "viajero" });
    if (!esp.ok) console.error("[itinerario] alta en el ESP falló", esp.error);
  }

  return json({ ok: true });
}
