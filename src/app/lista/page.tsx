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
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        // `clip` y no `hidden`: `hidden` convierte a <main> en contenedor de
        // scroll y el `position:sticky` de la columna del formulario dejaría
        // de activarse en escritorio.
        overflowX: "clip",
        background: "linear-gradient(180deg,#FDF8F0 0%,#F5EFE2 100%)",
        padding: "32px clamp(18px,5vw,32px) 48px",
      }}
    >
      {/* Manchas de color de la paleta: dan profundidad al crema sin cargar
          una sola imagen ni animar nada en reposo. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(620px 420px at 12% -6%, rgba(37,204,184,.20), transparent 70%),
            radial-gradient(560px 400px at 96% 8%, rgba(247,108,77,.16), transparent 72%),
            radial-gradient(700px 500px at 78% 104%, rgba(255,141,22,.13), transparent 74%)
          `,
        }}
      />

      <div style={{ position: "relative" }}>
        <ListaExperience />
      </div>
    </main>
  );
}
