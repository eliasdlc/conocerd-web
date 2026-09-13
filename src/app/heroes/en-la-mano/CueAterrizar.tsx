"use client";

import Icon from "@/components/Icon";
import { FEATURED_DESTINATIONS } from "@/data/destinations";
import s from "./estilos.module.css";

// Invitación a bajar. Nombra dónde aterriza la cámara (el primer destino del
// recorrido) y, al pulsarla, recorre la pista de GloboHero hasta el final.
export default function CueAterrizar() {
  const destino = FEATURED_DESTINATIONS[0];

  const bajar = () => {
    const pista = document.querySelector<HTMLElement>(".crd-globo-pista");
    if (!pista) return;
    const fin = pista.offsetTop + pista.offsetHeight - window.innerHeight;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: fin, behavior: suave ? "smooth" : "auto" });
  };

  return (
    <button type="button" onClick={bajar} className={`${s.cue} ${s.entra}`} style={{ animationDelay: "360ms" }}>
      <span aria-hidden="true" className={s.cueDisco}>
        <Icon name="arrow_downward" />
      </span>
      <span className={s.cueTexto}>
        <span className={s.cueRotulo}>Baja y aterriza en</span>
        <span className={s.cueDestino}>{destino.name}</span>
      </span>
    </button>
  );
}
