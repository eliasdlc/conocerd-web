import type { Metadata } from "next";
import Escena from "../_espacio/Escena";
import Contenido from "./Contenido";

export const metadata: Metadata = {
  title: "Corona, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Corona»: el logo centrado y grande manda solo en el cielo, con las dos
 * acciones debajo. La línea que dice qué es la app no compite con él: corre
 * por la curvatura del planeta, como los textos del cuño siguen su arco, y al
 * bajar sube con el planeta y se va por arriba.
 */
export default function CoronaPage() {
  return (
    <Escena arcoBajo cueBajo>
      <Contenido />
    </Escena>
  );
}
