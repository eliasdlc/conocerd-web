"use client";

import Icon from "@/components/Icon";
import s from "./estilos.module.css";

// Invitación a bajar. No dice "scroll": nombra el gesto (la ventana se abre) y
// el destino real del descenso — Bahía de las Águilas es el keyframe siguiente
// del recorrido, no un ejemplo inventado.
//
// Es un botón de verdad y lleva a donde promete: un adorno que parece pulsable
// y no responde es peor que no tenerlo.
export default function CueBajar() {
  const bajar = () => {
    // 60% de la pista: el punto donde el troquel ya terminó de abrirse y la
    // cámara está en pleno vuelo hacia el primer destino.
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: total * 0.6, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={bajar}
      className={`${s.cue} ${s.entra}`}
      style={{ "--vt-d": ".38s" } as React.CSSProperties}
    >
      <span aria-hidden="true" className={s.cueDisco}>
        <Icon name="arrow_downward" />
      </span>
      <span>
        <span className={s.cueTexto}>Baja — la ventana se abre</span>
        <span className={s.cueNota}>primera parada: Bahía de las Águilas</span>
      </span>
    </button>
  );
}
