import type { Metadata } from "next";
import Escena from "../_espacio/Escena";
import Contenido from "./Contenido";

export const metadata: Metadata = {
  title: "Capítulos, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Capítulos»: en la primera pantalla sólo el logo, grande y centrado, y las
 * dos acciones. El mensaje no está en el hero: aparece durante la bajada, en
 * dos tarjetas de cristal que entran y salen mientras la cámara desciende, y
 * termina en la etiqueta de aterrizaje.
 */
export default function CapitulosPage() {
  return (
    <Escena arcoBajo>
      <Contenido />
    </Escena>
  );
}
