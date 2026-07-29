import type { Metadata } from "next";
import ListaExperience from "@/components/lista/ListaExperience";

// ─────────────────────────────────────────────────────────────────────────────
//  /lista — destino del QR (§2.3).
//
//  La home es un scroll journey con mapa y GSAP: pesado en el 4G de un salón
//  lleno y con el formulario al final. Esta página es lo contrario — estática,
//  sin mapa, sin journey, y el campo de correo por encima del fold. El `?ref=`
//  de la URL lo captura el propio formulario.
//
//  El shell se queda en el servidor (fondo, decorado y metadatos) y sólo el
//  cuerpo es cliente, porque el toggle de audiencia gobierna todo el contenido.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Lista de espera — ConoceRD",
  description:
    "Entra a la lista de fundadores de ConoceRD. Viajeros: badge de fundador y acceso anticipado a la beta. Negocios: perfil destacado gratis los primeros meses tras el lanzamiento.",
};

export default function ListaPage() {
  return (
    // overflow-x-clip y no hidden: `hidden` convierte a <main> en contenedor de
    // scroll y el `position:sticky` de la columna del formulario dejaría de
    // activarse en escritorio.
    <main className="relative min-h-[100dvh] overflow-x-clip bg-[linear-gradient(180deg,#FDF8F0_0%,#F5EFE2_100%)] px-[clamp(18px,5vw,32px)] pb-12 pt-8">
      {/* Manchas de color de la paleta: dan profundidad al crema sin cargar
          una sola imagen ni animar nada en reposo. Son tres gradientes, así que
          viven en .crd-lista-blooms. */}
      <div aria-hidden="true" className="crd-lista-blooms pointer-events-none absolute inset-0" />

      <div className="relative">
        <ListaExperience />
      </div>
    </main>
  );
}
