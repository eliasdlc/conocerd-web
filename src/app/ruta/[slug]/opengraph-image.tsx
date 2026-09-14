import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { OG_CONTENT_TYPE } from "@/lib/og";
import { OG_SIZE, PaseDeEmbarque, loadOgFonts } from "@/lib/ruta/pase";
import { idsDeSlug } from "@/lib/ruta/slug";

export const alt = "El pase de embarque de esta ruta por República Dominicana: sus paradas en orden, la isla con el recorrido y los kilómetros por carretera.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ids = idsDeSlug(slug);
  if (ids.length === 0) notFound();
  return new ImageResponse(await PaseDeEmbarque({ ids }), { ...size, fonts: await loadOgFonts() });
}
