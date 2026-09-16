import s from "./espacio.module.css";

/**
 * Fondo de la escena, DEBAJO del globo (prop `fondo` de GloboHero).
 *
 *  · `noche`: la tinta con el campo de estrellas. Deriva muy despacio.
 *  · `titila`: una segunda copia de las estrellas, desplazada, que respira en
 *    opacidad: es lo que hace que el cielo parpadee sin animar cada estrella.
 *  · `fugaz`: dos estrellas fugaces, cada una con su ciclo.
 *  · `dia`: el cielo cálido de la web, que cubre la noche al bajar. Es el
 *    amanecer: un crossfade entre dos cielos opacos, nunca tinta sobre crema.
 *  · `alba`: la claridad que nace en el horizonte.
 *  · `atmosfera` y `aliento`: el filo cálido del amanecer sobre el limbo. La
 *    atmósfera azul de verdad la dibuja MapLibre (Espacio.tsx).
 */
export default function Cielo() {
  return (
    <>
      <div className={s.noche}>
        <div className={s.estrellas} />
        <div className={s.titila} />
        <div className={s.fugaz} />
        <div className={`${s.fugaz} ${s.fugaz2}`} />
      </div>
      <div className={s.dia} />
      <div className={s.alba} />
      <div className={s.atmosferaEntra}>
        <div className={s.atmosfera} />
        <div className={s.aliento} />
      </div>
    </>
  );
}
