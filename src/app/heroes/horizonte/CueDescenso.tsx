"use client";

import Icon from "@/components/Icon";
import s from "./estilos.module.css";

/**
 * Invitación a bajar. No es un "scroll para ver más": lleva al final de la
 * pista, que es exactamente donde la cámara termina de descender sobre el globo
 * y aterriza en el primer destino. Botón de verdad, porque parece pulsable.
 */
export default function CueDescenso() {
  const bajar = () => {
    const pista = document.querySelector<HTMLElement>(".crd-globo-pista");
    const fin = pista
      ? pista.getBoundingClientRect().top + window.scrollY + pista.offsetHeight - window.innerHeight
      : document.documentElement.scrollHeight - window.innerHeight;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: fin, behavior: suave ? "smooth" : "auto" });
  };

  return (
    <div className={s.cue}>
      <button type="button" onClick={bajar} className={`${s.cueBoton} ${s.entra}`} style={{ animationDelay: "560ms" }}>
        <span className="font-mono text-micro font-bold uppercase tracking-[.16em]">
          Baja sobre el país
        </span>
        <span aria-hidden="true" className={s.cueFlecha}>
          <Icon name="arrow_downward" className="text-base" />
        </span>
        <span className="sr-only">
          Descender sobre el globo hasta el primer destino
        </span>
      </button>
    </div>
  );
}
