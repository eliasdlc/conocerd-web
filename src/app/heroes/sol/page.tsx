import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Cielo from "./Cielo";
import Contenido from "./Contenido";
import Marcadores from "./Marcadores";
import s from "./estilos.module.css";

export const metadata: Metadata = {
  title: "Sol, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Sol»: el cuño de la marca amanece detrás del planeta.
 *
 * Misma mecánica que Horizonte (el canvas baja para que sólo asome el
 * casquete y vuelve a su sitio al descender), con dos diferencias de
 * estructura: en escritorio el globo se corre a la derecha, así que el
 * horizonte es una diagonal y el titular vive a la izquierda, sobre el cielo;
 * y en la cima del arco sale el cuño de equipaje como si fuera el sol, pintado
 * DEBAJO del mapa, de modo que al bajar es el propio planeta el que lo tapa.
 */
export default function SolPage() {
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
