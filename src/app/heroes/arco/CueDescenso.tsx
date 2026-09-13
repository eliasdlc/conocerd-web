"use client";

import Icon from "@/components/Icon";
import s from "./estilos.module.css";

/**
 * Invitación a bajar, bajo el titular y sobre la corteza. Lleva al final de
 * la pista, donde la cámara aterriza en el primer destino: "aquí abajo".
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
      <button type="button" onClick={bajar} className={`${s.cueBoton} ${s.entra}`} style={{ animationDelay: "640ms" }}>
        <span className="font-label text-micro font-extrabold uppercase tracking-[.14em]">
          Aterriza
        </span>
        <span aria-hidden="true" className={s.cueFlecha}>
          <Icon name="arrow_downward" className="text-base" />
        </span>
        <span className="sr-only">Descender sobre el globo hasta el primer destino</span>
      </button>
    </div>
  );
}
