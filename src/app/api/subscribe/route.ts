// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/subscribe — alta en la lista de espera (viajeros y negocios).
//
//  Orden deliberado: valida → honeypot → rate limit → guarda → ESP. El alta en
//  el ESP va después y no bloquea la respuesta si falla: el correo ya está a
//  salvo en la base, y perder un registro delante de alguien que acaba de
//  escanear un QR es mucho peor que reconciliar la audiencia después.
// ─────────────────────────────────────────────────────────────────────────────

import { clientIp, rateLimit } from "@/lib/rateLimit";
import { addToAudience } from "@/lib/waitlist/esp";
import { HONEYPOT_FIELD, subscribeSchema, type SubscribeResult } from "@/lib/waitlist/schema";
import { getWaitlistStore } from "@/lib/waitlist/store";

const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

function json(body: SubscribeResult, init?: ResponseInit) {
  return Response.json(body, init);
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

  if (status === "created") {
    const esp = await addToAudience({
      email: data.email,
      audience: data.audience,
      name: data.name,
    });
    if (!esp.ok) console.error("[subscribe] alta en el ESP falló", esp.error);
  }

  return json({ ok: true, status });
}
