import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Cielo from "./Cielo";
import Contenido from "./Contenido";
import Marcadores from "./Marcadores";
import s from "./estilos.module.css";

export const metadata: Metadata = {
  title: "Amanecer, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Amanecer»: el planeta de noche, visto desde el espacio.
 *
 * Misma geometría que Horizonte (el canvas baja para que sólo asome el
 * casquete y vuelve a su sitio al descender), pero el cielo es de tinta y el
 * limbo está encendido: lo único que se ve del país es un punto de luz. Al
 * bajar amanece: la tinta se disuelve en el crema del sitio mientras el
 * planeta sube y la cámara aterriza. El hero es la única superficie oscura de
 * la home y el descenso es la transición de tema, una sola vez y con motivo.
 */
export default function AmanecerPage() {
  return (
    <main>
      <GloboHero
        encuadre={{ padLeft: 0, padBottom: 0 }}
        alturaVh={300}
        className={s.escena}
        fondo={<Cielo />}
        capasDelMapa={<Marcadores />}
      >
        <CapaHero>
          <Contenido />
        </CapaHero>
      </GloboHero>
    </main>
  );
}
