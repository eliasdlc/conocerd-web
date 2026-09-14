// La respuesta HTTP de /api/clima, separada del handler para poder probarla
// sin levantar Next: con el dato, 200 y caché de 15 minutos en la CDN (más 30
// de gracia mientras se refresca); sin él, 502 con cuerpo vacío. El cliente
// ante un 502 no pinta nada, así que no hay mensaje que mandar.

import type { Clima } from "./openMeteo";

export const CACHE_CLIMA = "public, s-maxage=900, stale-while-revalidate=1800";

export async function responderClima(pedir: () => Promise<Clima>): Promise<Response> {
  try {
    const clima = await pedir();
    return Response.json(clima, { headers: { "Cache-Control": CACHE_CLIMA } });
  } catch (err) {
    console.error("[clima] Open-Meteo falló:", err);
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
