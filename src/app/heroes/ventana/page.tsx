import type { Metadata } from "next";
import GloboHero, { type Encuadre } from "../_components/GloboHero";
import CapasTexto from "./CapasTexto";
import Editorial from "./Editorial";
import PinRD from "./PinRD";
import s from "./estilos.module.css";

export const metadata: Metadata = {
  title: "Ventana al país — propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

// Propuesta sobre el keyframe del hero. El encuadre actual (padLeft 0.44 /
// padBottom 0.40) se mueve un punto en cada eje:
//
//  · Desktop 0.49 — el globo se va un poco más a la derecha para que entre el
//    creciente de cielo que separa el limbo del planeta del filo del troquel.
//    Sin ese aire, el hueco se llena de mapa y deja de leerse como esfera.
//  · Móvil 0.55 — sube el planeta lo justo para que el arco superior lo
//    envuelva entero (limbo incluido, 45px de cielo bajo el polo sur) y quede
//    media pantalla de papel para el bloque editorial.
const ENCUADRE: Encuadre = { padLeft: 0.49, padBottom: 0.55 };

export default function VentanaPage() {
  return (
    <main>
      <GloboHero
        encuadre={ENCUADRE}
        // 280 en vez de 320: el tramo en el que la cámara todavía no se mueve
        // (el primer tercio de la pista) lo llena la apertura del troquel, así
        // que no hace falta tanta pista para que el gesto se lea; con 320 el
        // descenso pedía tres pantallas de scroll para arrancar.
        alturaVh={280}
        className={s.escena}
        fondo={<div aria-hidden="true" className={s.cielo} />}
        capasDelMapa={<PinRD />}
      >
        <div aria-hidden="true" className={s.papel} />
        <div aria-hidden="true" className={s.sombra} />
        <CapasTexto principal={<Editorial />} espejo={<Editorial espejo />} />
        <div aria-hidden="true" className={s.canto} />
      </GloboHero>
    </main>
  );
}
