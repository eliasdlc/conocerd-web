import type { Metadata } from "next";
import Cinta from "./Cinta";

export const metadata: Metadata = {
  title: "Cinta de polaroids, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

// Propuesta "Cinta de polaroids": el globo arriba y, apoyada en su borde
// inferior, una cinta con las seis polaroids reales del recorrido. Rozar una
// enciende su pin sobre el país; al bajar, la cinta se retira bajo la cámara y
// el pin del primer destino se queda en pie mientras la cámara aterriza.
export default function CintaPage() {
  return <Cinta />;
}
