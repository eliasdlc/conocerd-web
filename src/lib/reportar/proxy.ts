/**
 * Reenvía una queja del sitio a `conocerd-api`.
 *
 * El sitio no escribe en Firestore: no tiene Admin SDK ni debería tenerlo, y
 * darle credenciales de escritura a un sitio público para un formulario de
 * contacto es exactamente al revés de como se reparte esto. `conocerd-api` es
 * quien valida, pone la cuota y guarda.
 *
 * `CONOCERD_API_URL` se queda en el servidor: si el formulario llamara al API
 * desde el navegador, la URL del backend de confianza viajaría en el bundle y
 * además habría que abrirle CORS a un origen público.
 *
 * Es el mismo camino que ya usa el borrado de cuenta, a propósito: dos formas
 * distintas de hablar con el mismo backend son dos formas de romperse.
 */
export type FetchReporte = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface ForwardOptions {
  apiUrl?: string;
  cuerpo: unknown;
  /** De dónde viene, para que la cuota del API cuente por persona y no por sitio. */
  desde?: string | null;
  fetchReporte?: FetchReporte;
}

export async function forwardReporte({
  apiUrl,
  cuerpo,
  desde,
  fetchReporte = fetch,
}: ForwardOptions): Promise<Response> {
  if (!apiUrl?.trim()) {
    return Response.json(
      { error: "El formulario todavía no está configurado en este sitio." },
      { status: 503 },
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${apiUrl.trim().replace(/\/$/, "")}/problem-reports`);
  } catch {
    return Response.json({ error: "El formulario está fuera de servicio." }, { status: 503 });
  }

  try {
    const upstream = await fetchReporte(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Sin esto, el API vería todas las quejas del sitio saliendo de la
        // misma IP (la del serverless) y su cuota por origen dejaría fuera a
        // todo el mundo en cuanto una persona escribiera diez veces.
        ...(desde ? { "x-forwarded-for": desde } : {}),
      },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });

    const datos = await upstream.json().catch(() => ({}));
    return Response.json(datos, { status: upstream.status });
  } catch {
    return Response.json(
      { error: "No se pudo enviar. Escríbenos a contacto@conocerd.app." },
      { status: 502 },
    );
  }
}
