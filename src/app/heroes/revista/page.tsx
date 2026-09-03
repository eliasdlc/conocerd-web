import type { Metadata } from "next";
import Portada from "./Portada";

export const metadata: Metadata = {
  title: "Portada de revista — ConoceRD",
  description:
    "Propuesta de primera pantalla: columna editorial contra foto a sangre que cambia con la categoría elegida.",
};

export default function PaginaRevista() {
  return <Portada />;
}
