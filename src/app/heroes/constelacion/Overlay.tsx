"use client";

import Image from "next/image";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { FICHAS, NODOS } from "./datos";
import { useConstelacion } from "./estado";
import Ficha from "./Ficha";
import s from "./estilos.module.css";

const ATERRIZAJE = NODOS.find((n) => n.id === "aguilas")!.destino;

// En móvil los CTA comparten una sola fila de 358 px: bajan a alto de toque
// (44) con el icono al tamaño del texto para que "Descargar la app" y
// "Soy un negocio" quepan sin partirse en dos filas.
const CTA_MOVIL = "max-desk:h-11 max-desk:px-4 max-desk:text-sm max-desk:[&>svg]:text-base";

/**
 * Invitación a bajar. No es "scroll para ver más": lo que sigue es el descenso
 * de la cámara sobre el globo, así que la etiqueta nombra dónde aterriza.
 * Pulsarla recorre la pista completa de GloboHero.
 */
function Bajar() {
  const bajar = () => {
    const pista = document.querySelector<HTMLElement>(".crd-globo-pista");
    if (!pista) return;
    const destino = pista.offsetTop + pista.offsetHeight - window.innerHeight;
    window.scrollTo({ top: destino, behavior: "smooth" });
  };

  return (
    <button type="button" className={s.bajar} onClick={bajar}>
      <span className={s.bajarIcono} aria-hidden="true">
        <Icon name="arrow_downward" />
      </span>
      <span className={s.bajarTexto}>
        <span className={s.bajarKicker}>Baja y la cámara desciende</span>
        <span className={s.bajarDestino}>hasta {ATERRIZAJE.name}</span>
      </span>
    </button>
  );
}

export default function Overlay() {
  const { activo } = useConstelacion();

  return (
    <div className={s.raiz}>
      <div className={s.velo} aria-hidden="true" />

      <div className={s.fichas} data-activo={activo ?? undefined}>
        {FICHAS.map((n) => (
          <Ficha key={n.id} nodo={n} />
        ))}
      </div>

      <div className={s.rail}>
        <Image
          src="/assets/logo.svg"
          alt="ConoceRD, descubre lo nuestro"
          width={1296}
          height={595}
          priority
          unoptimized
          className={s.marca}
        />

        <h1 className={s.titulo} style={{ fontVariationSettings: '"opsz" 96' }}>
          Lo nuestro, <em className="crd-accent">punto por punto</em>
        </h1>

        <p className={s.copy}>
          Cada punto del mapa es un lugar de verdad: qué hay, quién te atiende y cómo llegar sin
          dar vueltas.
        </p>

        <div className={s.acciones}>
          <Button variant="primary" size="lg" icon="download" className={CTA_MOVIL}>
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront" className={CTA_MOVIL}>
            Soy un negocio
          </Button>
        </div>

        <p className={s.nota}>
          <span className={s.notaLinea} aria-hidden="true" />
          <span className="max-desk:hidden">Pasa por una ficha y te la señalo en el globo</span>
          <span className="desk:hidden">Toca una ficha y te la señalo en el globo</span>
        </p>

        <Bajar />
      </div>
    </div>
  );
}
