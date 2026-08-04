import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard, loadOgFonts } from "@/lib/og";

export const alt =
  "ConoceRD — Descubre lo nuestro. Polaroids de Bahía de las Águilas, Salto El Limón y 27 Charcos sobre la ruta punteada del mapa.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    await OgCard({
      eyebrow: "Descubre lo nuestro",
      title: ["La República Dominicana", "que no sale en las guías"],
      subtitle:
        "Destinos auténticos, negocios locales y experiencias reales, hechas por gente de aquí.",
      badge: "Lista de espera abierta",
    }),
    { ...size, fonts: await loadOgFonts() }
  );
}
