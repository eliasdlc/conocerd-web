import type { Metadata } from "next";
import GloboHero from "../_components/GloboHero";
import Cartografia from "./Cartografia";
import Composicion from "./Composicion";
import PinIsla from "./PinIsla";
import s from "./estilos.module.css";

// Propuesta 10 — "Medallón": el globo como troquel de un sello grabado.
//
// Encuadre `{ padLeft: 0, padBottom: 0.24 }`, y es una propuesta consciente
// sobre el keyframe del hero: la composición es simétrica, así que el planeta
// tiene que estar centrado (en producción se va al 44% derecho). En móvil se
// deja un 24% abajo para que el medallón mande arriba y el texto respire
// debajo; ese 24% es exactamente lo que fija `--cy: 38%` en el CSS.
export const metadata: Metadata = {
  title: "Medallón",
  robots: { index: false, follow: false },
};

export default function PaginaMedallon() {
  return (
    <main>
      <GloboHero
        encuadre={{ padLeft: 0, padBottom: 0.24 }}
        alturaVh={340}
        className={s.escena}
        fondo={<div aria-hidden="true" className={s.cielo} />}
        capasDelMapa={
          <>
            <Cartografia />
            <PinIsla />
          </>
        }
      >
        <Composicion />
      </GloboHero>

      {/* Final de la pista: destino del enlace del cue. */}
      <div id="aterrizaje" aria-hidden="true" className={s.ancla} />
    </main>
  );
}
