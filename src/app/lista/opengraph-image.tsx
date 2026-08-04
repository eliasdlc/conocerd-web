import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, OgCard, loadOgFonts } from "@/lib/og";

export const alt =
  "Lista de fundadores de ConoceRD — badge de fundador para viajeros y perfil destacado gratis para negocios.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    await OgCard({
      eyebrow: "LISTA DE FUNDADORES",
      title: ["Entra antes de que", "abramos al público"],
      subtitle:
        "Viajeros: badge de fundador y acceso anticipado. Negocios: perfil destacado gratis los primeros meses.",
      badge: "Apúntate en un minuto",
    }),
    { ...size, fonts: await loadOgFonts() }
  );
}
