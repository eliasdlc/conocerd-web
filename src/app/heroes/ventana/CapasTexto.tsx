"use client";

import { useDescenso } from "../_components/GloboHero";
import s from "./estilos.module.css";

// Las dos caras del troquel. Reciben el bloque editorial ya renderizado desde
// el servidor (page.tsx) para que el copy y los CTA existan en el HTML inicial.
//
// El único trabajo de cliente aquí es retirar el bloque del árbol accesible
// cuando el descenso empieza: la opacidad la gobierna el CSS con `--descenso`,
// pero un botón invisible que sigue siendo enfocable y pulsable es una trampa,
// no una transición.
export default function CapasTexto({
  principal,
  espejo,
}: {
  principal: React.ReactNode;
  espejo: React.ReactNode;
}) {
  // 0.10 es donde la opacidad del CSS ya llegó a 0 (1 − t·11), así que el
  // cambio no se ve: sólo deja de existir para el teclado y el lector.
  const retirado = useDescenso().t > 0.1;

  return (
    <>
      <div
        className={`${s.capa} ${s.capaPapel} ${retirado ? s.retirado : ""}`}
        inert={retirado}
      >
        {principal}
      </div>
      {/* La copia dentro del hueco: mismo bloque, mismas cajas, máscara
          complementaria. Nunca es interactiva ni la leen los lectores. */}
      <div className={`${s.capa} ${s.capaHueco}`} aria-hidden="true" inert>
        {espejo}
      </div>
    </>
  );
}
