import s from "./estilos.module.css";

/**
 * Fondo de la escena, DEBAJO del globo (prop `fondo` de GloboHero).
 *
 *  · `noche`: la tinta.
 *  · `dia`: el cielo cálido de la web, que cubre la noche al bajar. Es el
 *    amanecer: un crossfade entre dos cielos opacos, nunca tinta sobre crema.
 *  · `alba`: la claridad cálida que nace en el horizonte. Sube de intensidad
 *    en el primer tramo del descenso y se va con la noche.
 *  · `atmosfera`: el limbo encendido. Sombra exterior sobre un círculo del
 *    tamaño exacto del globo, así que el brillo sólo existe fuera de la
 *    silueta y el planeta no se tiñe. La envoltura lleva la entrada de una
 *    sola pasada; la opacidad de scroll vive en el hijo para no congelarse.
 */
export default function Cielo() {
  return (
    <>
      <div className={s.noche} />
      <div className={s.dia} />
      <div className={s.alba} />
      <div className={s.atmosferaEntra}>
        <div className={s.atmosfera} />
      </div>
    </>
  );
}
