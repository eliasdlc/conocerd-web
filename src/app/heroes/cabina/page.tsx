import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import Cabina from "./Cabina";
import MarcadorObjetivo from "./MarcadorObjetivo";
import { ENCUADRE } from "./instrumentos";
import s from "./cabina.module.css";

export const metadata: Metadata = {
  title: "Cabina de vuelo",
  robots: { index: false, follow: false },
};

/**
 * Propuesta "Cabina de vuelo": el globo a sangre, sin un solo panel encima, y
 * el contenido repartido por los bordes como el instrumental de una cabina.
 *
 * Encuadre 0.34 / 0.38 (el hero en producción usa 0.44 / 0.40): con 0.44 el
 * globo se iba tan a la derecha que el altímetro del costado lo tapaba y la
 * mira quedaba pegada al borde. A 0.34 el globo sigue cediendo la columna
 * izquierda al titular, pero se ve entero y con aire a los dos lados. En móvil
 * 0.38 deja el globo completo entre las dos franjas del HUD.
 */
export default function PaginaCabina() {
  return (
    <GloboHero
      encuadre={ENCUADRE}
      alturaVh={320}
      fondo={<div aria-hidden="true" className={s.cielo} />}
      capasDelMapa={<MarcadorObjetivo />}
    >
      <Cabina />
    </GloboHero>
  );
}
