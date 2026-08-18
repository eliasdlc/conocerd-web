"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import { REFERENCE_VIEWPORT, type JourneyViewport } from "@/lib/journey";
import { MOBILE_BREAKPOINT } from "@/hooks/useIsMobile";
import { useDescenso } from "../_components/GloboHero";
import {
  FASES,
  OBJETIVO,
  TOTAL_CATEGORIAS,
  TOTAL_DESTINOS,
  TOTAL_PROVINCIAS,
  altitudEnKm,
  altitudEnMetros,
  camaraEn,
  centroDeCamara,
  indiceFase,
  latitud,
  longitud,
  rumbo,
} from "./instrumentos";
import s from "./cabina.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Cabina de vuelo — overlay de la propuesta.
//
//  El globo va a sangre y sin panel encima: el contenido se reparte por los
//  bordes como el instrumental de una cabina. Cada número que se ve sale de la
//  cámara real del journey; al bajar, la altitud cae, la fase pasa de órbita a
//  aterrizaje y la mira se cierra sobre el destino.
// ─────────────────────────────────────────────────────────────────────────────

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

const MONO = "font-mono font-bold uppercase tracking-[.14em]";

/** Viewport real. Arranca en el de referencia para que servidor y cliente pinten
 *  lo mismo en el primer frame; el efecto lo corrige al montar. */
function useViewport(): JourneyViewport {
  const [vp, setVp] = useState<JourneyViewport>(REFERENCE_VIEWPORT);

  useEffect(() => {
    const medir = () =>
      setVp((prev) =>
        prev.width === window.innerWidth && prev.height === window.innerHeight
          ? prev
          : {
              width: window.innerWidth,
              height: window.innerHeight,
              mobile: window.innerWidth < MOBILE_BREAKPOINT,
            }
      );
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  return vp;
}

/** Celda de lectura: rótulo arriba en el DOM, número mandando en pantalla. */
function Celda({ titulo, valor, className = "" }: { titulo: string; valor: string; className?: string }) {
  return (
    <div className={`${s.celda} ${className}`}>
      <dt className={`${s.celdaTitulo} ${MONO} text-micro`}>{titulo}</dt>
      <dd className={`${s.celdaValor} font-mono text-tiny font-bold`}>{valor}</dd>
    </div>
  );
}

function Flecha({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-[17px] flex-none ${className}`}>
      <polyline
        points="5,8 12,16 19,8"
        fill="none"
        stroke="#F76C4D"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Cabina() {
  const { t } = useDescenso();
  const vp = useViewport();

  const cam = camaraEn(t, vp);
  const centro = centroDeCamara(t, vp);
  const altitud = altitudEnKm(altitudEnMetros(cam, vp.height));
  const fase = indiceFase(t);

  // Altitud del final de la bajada, impresa al pie de la escala: es a dónde se
  // va. Sale de la misma cámara del journey, no de una cifra bonita.
  const altitudFinal = useMemo(
    () => altitudEnKm(altitudEnMetros(camaraEn(1, vp), vp.height)),
    [vp]
  );

  const ticks = useMemo(() => Array.from({ length: 13 }, (_, i) => i / 12), []);

  // Cuánto llena el mapa la pantalla, medido con el zoom real: a z3,2 el globo
  // todavía flota recortado sobre el crema; pasado z6,2 la cartografía ocupa
  // los cuatro bordes. De aquí salen los biseles y el apagado del titular: el
  // texto se retira cuando de verdad empieza a competir con el mapa, no por
  // haber scrolleado un poco.
  const cobertura = clamp01((cam.zoom - 3.2) / 3);

  // El bloque editorial se apaga sólo con opacidad — nada de reflow a mitad de
  // scroll — y deja la pantalla al instrumental.
  const apagado = clamp01(cobertura / 0.55);

  const descender = () => {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: document.documentElement.scrollHeight - window.innerHeight,
      behavior: suave ? "smooth" : "auto",
    });
  };

  return (
    <div
      className={s.cabina}
      style={
        {
          "--mira-x": `${centro.x.toFixed(1)}px`,
          "--mira-y": `${centro.y.toFixed(1)}px`,
          "--mapa": cobertura.toFixed(3),
        } as CSSProperties
      }
    >
      <div className={s.reticula} aria-hidden="true" />
      <div className={s.biselSup} aria-hidden="true" />
      <div className={s.biselInf} aria-hidden="true" />

      <div className={s.marco} aria-hidden="true">
        <span className={`${s.esquina} ${s.esqTI}`} />
        <span className={`${s.esquina} ${s.esqTD}`} />
        <span className={`${s.esquina} ${s.esqBI}`} />
        <span className={`${s.esquina} ${s.esqBD}`} />
      </div>

      {/* Mira: cae exactamente donde el mapa pinta el centro de cámara y se
          cierra sobre el destino según baja. */}
      <div className={s.mira} data-fijado={t >= 0.9 ? "si" : "no"} aria-hidden="true">
        <span className={`${s.miraEsq} ${s.miraTI}`} />
        <span className={`${s.miraEsq} ${s.miraTD}`} />
        <span className={`${s.miraEsq} ${s.miraBI}`} />
        <span className={`${s.miraEsq} ${s.miraBD}`} />
        <span className={s.miraCruz} />
        <span className={`${s.miraFijado} ${MONO} text-micro`}>Fijado</span>
      </div>

      {/* ── Franja superior: marca + centro de cámara ─────────────────────── */}
      <header className={`${s.railSup} animate-slide-up`}>
        <div className={s.marca}>
          <Image
            src="/assets/logo.png"
            alt="ConoceRD — Descubre Lo Nuestro"
            width={760}
            height={363}
            priority
            sizes="(max-width: 899px) 104px, 138px"
          />
          <span className={s.divisor} aria-hidden="true" />
          <p className={`m-0 ${MONO} text-micro text-muted max-desk:hidden`}>
            Cabina de vuelo
            <br />
            República Dominicana
          </p>
        </div>

        <dl className={`${s.celdas} m-0`}>
          <Celda titulo="Lat" valor={latitud(cam.center[1])} />
          <Celda titulo="Lon" valor={longitud(cam.center[0])} />
          <Celda titulo="Zoom" valor={cam.zoom.toFixed(2)} />
          <Celda titulo="Rumbo" valor={`${rumbo(cam.bearing)}°`} className={s.soloDesk} />
        </dl>
      </header>

      <div className={s.zonaInferior}>
        {/* ── Bloque editorial ───────────────────────────────────────────── */}
        {/* La entrada va en un hijo: `animate-slide-up` escribe `transform` y le
            ganaría al centrado vertical del contenedor. */}
        <div className={s.bloque} style={{ opacity: 1 - apagado }} inert={apagado > 0.9}>
          <div className="animate-slide-up" style={{ animationDelay: ".08s" }}>
            <h1 className={s.titular}>
              De la órbita
              <br />a la <em className="crd-accent">orilla</em>
            </h1>

            <p className={s.copy}>
              La app que te baja del mapa al sitio exacto: playas sin gente, montañas frías y los
              negocios del barrio, en una sola ruta.
            </p>

            <div className={s.placa}>
              <span className={`${s.placaEtiqueta} ${MONO} text-micro`}>Controles</span>
              <Button
                variant="primary"
                size="lg"
                icon="download"
                className="max-desk:h-12 max-desk:px-[14px] max-desk:text-[13.5px]"
              >
                Descargar la app
              </Button>
              <Button
                variant="outline"
                size="lg"
                icon="storefront"
                className="max-desk:h-12 max-desk:px-[14px] max-desk:text-[13.5px]"
              >
                Soy un negocio
              </Button>
            </div>

            <div className={s.cue}>
              <button type="button" onClick={descender} className={`${s.cueBoton} ${MONO} text-micro`}>
                Iniciar descenso
                <Flecha />
              </button>
              <p className={`${s.cueNota} m-0 font-sans text-tiny`}>
                Baja y la cámara aterriza en {OBJETIVO.name}.
              </p>
            </div>
          </div>
        </div>

        {/* ── Escala tumbada (móvil) ─────────────────────────────────────── */}
        <div className={s.tumbada}>
          <div className={s.tumbadaFila}>
            <p className={`m-0 ${MONO} text-micro text-muted`}>
              Altitud · {FASES[fase].etiqueta}
            </p>
            <p className="m-0 font-mono text-tiny font-bold tabular-nums text-ink">{altitud} km</p>
          </div>
          <div className={s.tumbadaPista} aria-hidden="true">
            <span className={s.tumbadaLlena} />
            <span className={s.tumbadaMarca} />
          </div>
          <p className={`${s.pie} ${MONO} text-micro`}>
            {TOTAL_DESTINOS} destinos · {TOTAL_PROVINCIAS} provincias · © OpenStreetMap
          </p>
        </div>

        {/* ── Altímetro (desktop) ────────────────────────────────────────── */}
        <div className={s.escala}>
          <p className={`${s.escalaTitulo} ${MONO} text-micro`}>Altitud · km</p>
          <p className={`${s.escalaExtremo} ${MONO} text-micro`}>{FASES[0].corto}</p>
          <div className={s.escalaCuerpo}>
            <span className={s.escalaPista} aria-hidden="true">
              <span className={s.escalaLlena} />
            </span>
            {ticks.map((punto, i) => (
              <span
                key={punto}
                aria-hidden="true"
                className={`${s.escalaTick} ${i % 3 === 0 ? s.escalaTickLargo : ""}`}
                style={{ top: `${punto * 100}%` }}
              />
            ))}
            <p className={`${s.escalaMarca} font-mono text-mini font-bold`}>{altitud}</p>
          </div>
          <p className={`${s.escalaExtremo} ${MONO} text-micro`}>
            {FASES[2].corto}
            <span className={s.escalaExtremoValor}>{altitudFinal}</span>
          </p>
        </div>

        {/* ── Franja inferior: inventario y estado (desktop) ──────────────── */}
        <footer className={s.railInf}>
          <div>
            <dl className={s.contadores}>
              <Celda titulo="Destinos" valor={String(TOTAL_DESTINOS)} className={s.contador} />
              <Celda titulo="Provincias" valor={String(TOTAL_PROVINCIAS)} className={s.contador} />
              <Celda titulo="Categorías" valor={String(TOTAL_CATEGORIAS)} className={s.contador} />
            </dl>
            <p className={`m-0 mt-2.5 font-mono text-[9.5px] leading-none text-muted-2`}>
              © OpenStreetMap · CARTO
            </p>
          </div>

          <div className={s.estado}>
            <p className={`m-0 ${MONO} text-micro text-muted`}>
              Estado · Inclinación {Math.round(cam.pitch)}°
            </p>
            <p className="m-0 mt-1 font-mono text-body font-bold uppercase tracking-[.1em] text-ink-2">
              {FASES[fase].etiqueta}
            </p>
            <p className="m-0 mt-1 font-mono text-micro text-muted">
              Objetivo · {OBJETIVO.name}, {OBJETIVO.province}
            </p>
            <div className={s.segmentos} aria-hidden="true">
              {FASES.map((f, i) => (
                <span key={f.clave} className={`${s.segmento} ${i <= fase ? s.segmentoOn : ""}`} />
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
