import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Composicion from "./Composicion";
import PinAterrizaje from "./PinAterrizaje";
import s from "./estilos.module.css";

export const metadata: Metadata = {
  title: "La app en la mano, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

// Propuesta "La app en la mano": el producto de verdad, encima del globo.
//
// La mitad izquierda es la nota editorial; la derecha es el globo del
// recorrido con el teléfono apoyado sobre su borde, enseñando una captura real
// de la app (el mismo mockup del S25 Ultra que usa la home en Viajeros). Al
// bajar, el teléfono se retira por abajo y la cámara aterriza donde la
// pantalla señalaba: Bahía de las Águilas, el primer destino del recorrido.
//
// Encuadre: padLeft 0.42 deja el centro del globo en el 71% del ancho, con
// sitio para el teléfono en el cuadrante inferior derecho. En móvil el globo
// sube (padBottom 0.5) y el teléfono se apoya en su borde inferior.
export default function EnLaManoPage() {
  return (
    <main>
      <GloboHero
        encuadre={{ padLeft: 0.42, padBottom: 0.5 }}
        alturaVh={280}
        className={s.escena}
        capasDelMapa={<PinAterrizaje />}
      >
        <CapaHero>
          <Composicion />
        </CapaHero>
      </GloboHero>
    </main>
  );
}
