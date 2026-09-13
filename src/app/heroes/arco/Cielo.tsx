import s from "./estilos.module.css";

/**
 * Fondo de la escena, DEBAJO del globo (prop `fondo` de GloboHero): cielo de
 * mañana y el halo cálido pegado al limbo, fuera de la silueta. Los dos se
 * apagan antes de la mitad del descenso.
 */
export default function Cielo() {
  return (
    <>
      <div className={s.cielo} />
      <div className={s.atmosfera} />
    </>
  );
}
