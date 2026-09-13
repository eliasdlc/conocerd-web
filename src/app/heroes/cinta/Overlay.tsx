"use client";

import { useRef } from "react";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { POLAROID_PAPER, PolaroidCaption, PolaroidMedia } from "@/components/Polaroid";
import { CATEGORY_META, FEATURED_DESTINATIONS, type Destination } from "@/data/destinations";
import { useDescenso } from "../_components/GloboHero";
import { useCinta } from "./estado";
import s from "./estilos.module.css";

const ATERRIZAJE = FEATURED_DESTINATIONS[0];

/**
 * Invitación a bajar: nombra dónde aterriza la cámara y, al pulsarla, recorre
 * la pista de GloboHero hasta el final.
 */
function Bajar() {
  const bajar = () => {
    const pista = document.querySelector<HTMLElement>(".crd-globo-pista");
    if (!pista) return;
    const fin = pista.offsetTop + pista.offsetHeight - window.innerHeight;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: fin, behavior: suave ? "smooth" : "auto" });
  };

  return (
    <button type="button" className={s.bajar} onClick={bajar}>
      <span className={s.bajarIcono} aria-hidden="true">
        <Icon name="arrow_downward" />
      </span>
      <span className={s.bajarTexto}>
        <span className={s.bajarRotulo}>Baja y aterriza en</span>
        <span className={s.bajarDestino}>{ATERRIZAJE.name}</span>
      </span>
    </button>
  );
}

// Polaroid de la cinta. El control es un botón transparente que cubre la
// figura: en táctil no hay hover, así que tocar tiene que hacer lo mismo que
// pasar el ratón, y con teclado el foco enciende el pin igual.
//
// El gesto se recuerda desde `pointerdown` porque, al tocar, el navegador
// emula la secuencia del ratón (pointerenter, focus y recién entonces click):
// cuando llega el click la polaroid YA está encendida, y un `onClick` que
// conmutara a secas la apagaría en el mismo gesto.
function Polaroid({ destino, giro }: { destino: Destination; giro: number }) {
  const { activo, setActivo } = useCinta();
  const gesto = useRef({ tactil: false, estaba: false });
  const meta = CATEGORY_META[destino.category];
  const encendida = activo === destino.id;

  return (
    <figure
      className={s.polaroid}
      data-on={encendida ? "1" : undefined}
      style={{ "--giro": `${giro}deg` } as React.CSSProperties}
    >
      <div className={`${POLAROID_PAPER} ${s.papel} relative`}>
        <PolaroidMedia
          image={destino.image}
          alt={`${destino.name}, ${destino.province}`}
          sizes="(max-width: 899px) 40vw, 160px"
          icon={meta.icon}
          chip={destino.tagline}
          className={s.recorte}
        />
        <figcaption className="pb-2.5 pt-2 text-left">
          <PolaroidCaption name={destino.name} meta={destino.meta} />
        </figcaption>
      </div>
      <button
        type="button"
        className={s.control}
        aria-pressed={encendida}
        aria-label={`${destino.name}, ${destino.province}. ${meta.label}. Señalar en el globo`}
        onPointerDown={(e) => {
          gesto.current = { tactil: e.pointerType !== "mouse", estaba: encendida };
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && setActivo(destino.id)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActivo(null)}
        onFocus={() => setActivo(destino.id)}
        onBlur={() => setActivo(null)}
        onClick={() => setActivo(gesto.current.tactil && gesto.current.estaba ? null : destino.id)}
      />
    </figure>
  );
}

export default function Overlay() {
  const { t } = useDescenso();
  const oculto = t > 0.4;

  return (
    <div className={s.raiz} aria-hidden={oculto || undefined} inert={oculto}>
      <div className={s.velo} aria-hidden="true" />

      <div className={s.rail}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/wordmark.svg" alt="ConoceRD" width={668} height={211} className={s.marca} />

        <h1 className={s.titulo} style={{ fontVariationSettings: '"opsz" 96' }}>
          Seis lugares, <em className="crd-accent whitespace-nowrap">una sola ruta</em>
        </h1>

        <p className={s.copy}>
          Cada polaroid es un destino real del recorrido. Rózala y te señalo dónde queda.
        </p>

        <div className={s.acciones}>
          <Button variant="primary" size="lg" icon="download" className="max-desk:h-11 max-desk:px-4 max-desk:text-sm">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront" className="max-desk:h-11 max-desk:px-4 max-desk:text-sm">
            Soy un negocio
          </Button>
        </div>

        <div className={s.bajarCaja}>
          <Bajar />
        </div>
      </div>

      {/* La cinta: seis polaroids apoyadas en el borde inferior del globo. */}
      <div className={s.cinta} data-activo={useCinta().activo ?? undefined}>
        {FEATURED_DESTINATIONS.map((d, i) => (
          <Polaroid key={d.id} destino={d} giro={d.rotate ?? (i % 2 ? 3 : -3)} />
        ))}
      </div>
    </div>
  );
}
