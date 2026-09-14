// GET /api/clima: el clima de ahora en los 18 destinos y la hora en Santo
// Domingo. Lo pinta el chip de cada polaroid y la línea que abre Tu ruta. Sin
// clave ni variable de entorno: Open-Meteo no pide ninguna. La caché vive en
// la CDN (lib/clima/responder).

import { pedirClima } from "@/lib/clima/openMeteo";
import { responderClima } from "@/lib/clima/responder";

export async function GET() {
  return responderClima(() => pedirClima());
}
