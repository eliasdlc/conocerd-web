export type FetchAccountDeletion = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

interface ForwardAccountDeletionOptions {
  apiUrl?: string;
  authorization?: string | null;
  fetchAccountDeletion?: FetchAccountDeletion;
}

function bearerToken(authorization?: string | null) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function forwardAccountDeletion({
  apiUrl,
  authorization,
  fetchAccountDeletion = fetch,
}: ForwardAccountDeletionOptions): Promise<Response> {
  const token = bearerToken(authorization);
  if (!token) {
    return Response.json({ error: "Debes autenticarte de nuevo." }, { status: 401 });
  }

  if (!apiUrl?.trim()) {
    return Response.json(
      { error: "La eliminación de cuenta aún no está configurada en este sitio." },
      { status: 503 },
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${apiUrl.trim().replace(/\/$/, "")}/account-delete`);
  } catch {
    return Response.json(
      { error: "La eliminación de cuenta está temporalmente fuera de servicio." },
      { status: 503 },
    );
  }

  try {
    const upstream = await fetchAccountDeletion(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        "cache-control": "no-store",
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { error: "No pudimos comunicarnos con el servicio. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
