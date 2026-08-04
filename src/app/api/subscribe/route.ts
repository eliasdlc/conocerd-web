// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/subscribe — alta en la lista de espera (viajeros y negocios).
//
//  Orden deliberado: valida → honeypot → rate limit → guarda → bienvenida +
//  ESP. Lo que va después de guardar no bloquea la respuesta si falla: el
//  correo ya está a salvo en la base, y perder un registro delante de alguien
//  que acaba de escanear un QR es mucho peor que reconciliar la audiencia
//  después o quedarnos sin mandar un agradecimiento.
// ─────────────────────────────────────────────────────────────────────────────

import { after } from "next/server";

import { renderWelcomeEmail, sendWelcomeEmail } from "@/lib/email/welcome";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { addToAudience } from "@/lib/waitlist/esp";
import { HONEYPOT_FIELD, subscribeSchema, type SubscribeResult } from "@/lib/waitlist/schema";
import { getWaitlistStore } from "@/lib/waitlist/store";

const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

function json(body: SubscribeResult, init?: ResponseInit) {
  return Response.json(body, init);
}

/**
 * Preview del correo de bienvenida en el navegador, sólo en desarrollo:
 *   /api/subscribe?audience=negocio&name=Elias&businessName=La%20Casona
 * Iterar el diseño de un correo mandándoselo a uno mismo es insoportable.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }
  const params = new URL(request.url).searchParams;
  const audience = params.get("audience") === "negocio" ? "negocio" : "viajero";
  // `preview`: el navegador no sabe qué es un `cid:`, así que la marca se pinta
  // desde las rutas del propio servidor en vez de viajar adjunta.
  const { html } = await renderWelcomeEmail(
    audience,
    {
      name: params.get("name") ?? undefined,
      businessName: params.get("businessName") ?? undefined,
    },
    "preview"
  );
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(payload);
  if (!parsed.success) {
    // Un error por campo: es lo que el formulario sabe pintar.
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "form";
      fields[path] ??= issue.message;
    }
    return json(
      { ok: false, error: "Revisa los datos del formulario", fields },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Honeypot: respondemos como si todo hubiera ido bien, sin guardar nada.
  if (data[HONEYPOT_FIELD]) {
    return json({ ok: true, status: "created" });
  }

  const limit = rateLimit(`subscribe:${clientIp(request.headers)}`, RATE_LIMIT);
  if (!limit.allowed) {
    return json(
      { ok: false, error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let status: "created" | "already_subscribed";
  try {
    status = await getWaitlistStore().save({
      email: data.email,
      audience: data.audience,
      name: data.name,
      businessName: data.businessName,
      businessType: data.businessType,
      whatsapp: data.whatsapp,
      instagram: data.instagram,
      ref: data.ref,
      consentAt: new Date(),
    });
  } catch (err) {
    console.error("[subscribe] fallo al guardar", err);
    return json(
      { ok: false, error: "No pudimos guardar tu correo. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  // Sólo en un alta nueva: repetirle la bienvenida a quien ya estaba dentro es
  // ruido, y la pantalla de éxito ya le dice que su correo estaba registrado.
  //
  // Va en `after`, no en el camino de la respuesta: ninguna de las dos llamadas
  // cambia lo que ve la persona (el registro ya está guardado y la pantalla de
  // éxito no promete un correo inmediato, a diferencia del mapa, que estampa
  // "te lo mandamos" y por eso allí un fallo sí es un error), y sumaban medio
  // segundo largo de espera delante de alguien que acaba de escanear un QR.
  if (status === "created") {
    after(async () => {
      const [welcome, esp] = await Promise.all([
        sendWelcomeEmail(data.email, data.audience, {
          name: data.name,
          businessName: data.businessName,
        }),
        addToAudience({ email: data.email, audience: data.audience, name: data.name }),
      ]);
      if (!welcome.ok) console.error("[subscribe] bienvenida falló", welcome.error);
      if (!esp.ok) console.error("[subscribe] alta en el ESP falló", esp.error);
    });
  }

  return json({ ok: true, status });
}
