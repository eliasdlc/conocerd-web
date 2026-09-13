import type { Metadata } from "next";
import Escena from "../_espacio/Escena";
import Contenido from "./Contenido";

export const metadata: Metadata = {
  title: "Amanecer, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Amanecer», la base: logo arriba a la izquierda, titular y línea en el
 * cielo, acciones debajo. La escena (planeta, amanecer, descenso) es la
 * compartida de `_espacio`.
 */
export default function AmanecerPage() {
  return (
    <Escena>
      <Contenido />
    </Escena>
  );
}
