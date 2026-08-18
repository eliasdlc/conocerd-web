import type { Metadata } from "next";
import PantallaGlobo from "./PantallaGlobo";

// Propuesta 3 — "Globo protagonista": el país a sangre completa, oscuro y
// cinematográfico, con el contenido sobre una lámina de cristal.
export const metadata: Metadata = {
  title: "Globo protagonista",
  robots: { index: false, follow: false },
};

export default function PaginaGlobo() {
  return <PantallaGlobo />;
}
