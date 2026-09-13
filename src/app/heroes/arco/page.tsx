import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Cielo from "./Cielo";
import Contenido from "./Contenido";
import Marcadores from "./Marcadores";
import s from "./estilos.module.css";

export const metadata: Metadata = {
  title: "Arco, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

/**
 * «Arco»: el titular escrito sobre la curvatura del planeta.
 *
 * Misma mecánica que Horizonte (el canvas baja para que sólo asome el
 * casquete y vuelve a su sitio al descender). Lo que cambia es dónde vive el
 * titular: no en el cielo, sino posado en el limbo, siguiendo el arco como
 * los textos del cuño de equipaje siguen el suyo. Arriba quedan el logo, una
 * línea y los CTA; al bajar el aro de texto sube con el planeta y se va por
 * el borde superior mientras la cámara aterriza.
 */
export default function ArcoPage() {
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
