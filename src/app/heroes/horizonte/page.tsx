import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Cielo from "./Cielo";
import Contenido from "./Contenido";
import Marcadores from "./Marcadores";
import s from "./estilos.module.css";

export const metadata: Metadata = {
  title: "Horizonte — propuesta de primera pantalla",
};

/**
 * «Horizonte» — el planeta amanece por el borde inferior.
 *
 * Encuadre `{ padLeft: 0, padBottom: 0 }`: el globo se centra en el viewport y
 * la composición lo baja después con un transform propio (estilos.module.css).
 * Es a propósito — el reparto del hero en producción (44% a la izquierda / 40%
 * abajo) mueve el globo en horizontal, y aquí lo que hace falta es hundirlo en
 * vertical para que sólo asome su casquete. El canvas conserva el viewport
 * completo, así que la cámara y su padding siguen siendo los del journey; el
 * desplazamiento se anula a mitad de pista y el aterrizaje queda idéntico al de
 * producción.
 */
export default function HorizontePage() {
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
