import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JourneyHome from "@/components/JourneyHome";
import { DESTINATIONS } from "@/data/destinations";
import { contarParadas, idsDeSlug, nombreDeRuta, slugDeRuta } from "@/lib/ruta/slug";

// ─────────────────────────────────────────────────────────────────────────────
//  /ruta/<slug>: una ruta armada con URL propia.
//
//  Es la home entera, no una redirección: los rastreadores de WhatsApp y de
//  Meta siguen los redirects y se quedan con los metadatos de la página final,
//  así que una redirección a `/` enseñaría la tarjeta genérica y no el pase de
//  esta ruta. Aquí la página responde 200 con su título, su descripción y su
//  imagen (./opengraph-image.tsx), y el recorrido lee las paradas de la ruta
//  desde la URL (MapaSection) y salta a Tu ruta al montar (MapScrollJourney).
// ─────────────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ slug: string }> };

const nombre = (id: string) => DESTINATIONS.find((d) => d.id === id)?.name ?? id;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ids = idsDeSlug(slug);
  if (ids.length === 0) return {};
  const title = `${nombreDeRuta(ids)}: ${contarParadas(ids.length)} por RD`;
  const description = `De ${nombre(ids[0])} a ${nombre(ids[ids.length - 1])}, con kilómetros y tiempos reales de carretera. Ábrela en el mapa y cámbiala a tu gusto.`;
  const url = `/ruta/${slugDeRuta(ids)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "ConoceRD", locale: "es_DO", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RutaPage({ params }: Props) {
  const { slug } = await params;
  if (idsDeSlug(slug).length === 0) notFound();
  return <JourneyHome />;
}
