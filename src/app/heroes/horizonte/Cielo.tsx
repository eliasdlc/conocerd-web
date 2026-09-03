import s from "./estilos.module.css";

/**
 * Fondo de la escena: cielo de amanecer + la atmósfera que abraza el limbo.
 *
 * Va en la prop `fondo` de GloboHero, o sea DEBAJO del canvas: por construcción
 * no puede tapar el mapa cuando la cámara aterriza. Las dos capas se apagan con
 * `--cielo-op` antes de la mitad del descenso.
 */
export default function Cielo() {
  return (
    <>
      <div className={s.cielo} />
      <div className={s.atmosfera} />
    </>
  );
}
