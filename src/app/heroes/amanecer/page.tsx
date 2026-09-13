import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Cielo from "./Cielo";
import Contenido from "./Contenido";
import Espacio from "./Espacio";
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
 * casquete y vuelve a su sitio al descender), pero el planeta está en el
 * espacio: estrellas, la Tierra de noche con sus luces de ciudad, nubes y la
 * atmósfera del globo (Espacio.tsx). Lo único que se ve del país es un punto
 * de luz. Al bajar amanece: el cielo pasa a crema, las luces ceden a la Tierra
 * de día y ésta al mapa de marca justo antes de aterrizar. El hero es la única
 * superficie oscura de la home y el descenso es la transición, una sola vez y
 * con motivo.
 */
export default function AmanecerPage() {
  return (
    <main>
      <GloboHero
        encuadre={{ padLeft: 0, padBottom: 0 }}
        alturaVh={300}
        className={s.escena}
        fondo={<Cielo />}
        capasDelMapa={
          <>
            <Espacio />
            <Marcadores />
          </>
        }
      >
        <CapaHero>
          <Contenido />
        </CapaHero>
      </GloboHero>
    </main>
  );
}
