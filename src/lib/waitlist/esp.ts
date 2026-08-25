// ─────────────────────────────────────────────────────────────────────────────
//  Alta en la audiencia del ESP (Resend).
//
//  El ESP es la fuente de verdad de los correos; la base de datos guarda la
//  segmentación y el `ref`. Sin `RESEND_API_KEY` esto es un no-op silencioso:
//  el registro se guarda igual y la landing sigue funcionando en local.
// ─────────────────────────────────────────────────────────────────────────────

import type { Audience } from "./constants";

export type EspContact = {
  email: string;
  audience: Audience;
  name?: string;
};

export type EspResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

export async function addToAudience(contact: EspContact): Promise<EspResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) return { ok: true, skipped: true };

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    // Resend trata el alta como idempotente por correo dentro de una audiencia,
    // así que un reenvío del mismo formulario no duplica el contacto.
    const { error } = await resend.contacts.create({
      audienceId,
      email: contact.email,
      firstName: contact.name,
      unsubscribed: false,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
