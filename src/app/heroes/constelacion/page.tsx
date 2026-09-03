import type { Metadata } from "next";
import Constelacion from "./Constelacion";

// Propuesta 9 — "Constelación de destinos": el globo con los pines reales de
// los seis destinos del recorrido, cuatro fichas alrededor y un hilo fino de
// cada ficha a su pin. La primera pantalla explica sola lo que hace la app:
// te dice dónde ir. Al bajar, las fichas se retiran y el pin de Bahía de las
// Águilas se queda solo mientras la cámara aterriza encima.
export const metadata: Metadata = {
  title: "Constelación de destinos",
  robots: { index: false, follow: false },
};

export default function PaginaConstelacion() {
  return <Constelacion />;
}
