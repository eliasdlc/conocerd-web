import StampCRD from "@/components/StampCRD";
import s from "./estilos.module.css";

/**
 * Fondo de la escena, DEBAJO del globo (prop `fondo` de GloboHero).
 *
 *  · `cielo`: la mañana, con la claridad centrada donde sale el sol.
 *  · `atmosfera`: el halo cálido pegado al limbo, fuera de la silueta.
 *  · `sol`: el cuño de la marca, que ya lleva su amanecer de rayos, posado en
 *    la cima del arco. Está bajo el mapa a propósito: el planeta le tapa el
 *    pie ahora y lo cubre entero cuando sube. La envoltura hace la entrada de
 *    una sola pasada (sale de detrás del horizonte); el hijo lleva la posición
 *    y la opacidad de scroll, para que la animación no las congele.
 */
export default function Cielo() {
  return (
    <>
      <div className={s.cielo} />
      <div className={s.atmosfera} />
      <div className={s.sol}>
        <div className={s.solSale}>
          <StampCRD size={168} rotate={-6} line1="BUENOS DÍAS" className={s.estampa} />
        </div>
      </div>
    </>
  );
}
