// ─────────────────────────────────────────────────────────────────────────────
//  Transporte único de los correos transaccionales (Resend).
//
//  Sin `RESEND_API_KEY` / `ITINERARY_FROM` no se envía nada y se devuelve
//  `skipped`: en local la landing tiene que seguir funcionando entera sin
//  credenciales. Qué hacer con ese `skipped` NO se decide aquí — depende de lo
//  que le hayamos prometido a la persona en pantalla, y eso lo sabe quien llama.
// ─────────────────────────────────────────────────────────────────────────────

export type SendResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

/** Buzón que atiende las bajas; recibe de verdad (MX de la raíz en name.com). */
const UNSUBSCRIBE_MAILBOX = "info@conocerd.app";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: OutgoingEmail): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ITINERARY_FROM;
  if (!apiKey || !from) return { ok: true, skipped: true };

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
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
