import type { Metadata } from "next";
import Escena from "../_espacio/Escena";
import Contenido from "./Contenido";

export const metadata: Metadata = {
  title: "Insignia, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Insignia»: el logo centrado y a cuerpo de portada. El logo ya dice el
 * nombre y el lema, así que no hay titular: debajo, una sola línea que dice
 * qué es la app, y las dos acciones.
 */
export default function InsigniaPage() {
  return (
    <Escena arcoBajo>
      <Contenido />
    </Escena>
  );
}
