"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import BrandPin from "@/components/BrandPin";
import { MapMarker, MarkerContent, useMap } from "@/components/map/context";
import { useScene } from "@/context/SceneContext";
import { scrollToSection } from "@/lib/journeyNav";
import { SCENE_BANDS } from "@/lib/journey";
import { montarCapasNasa, type CapasNasa } from "@/sections/espacio/capasNasa";
import e from "@/sections/espacio/espacio.module.css";
import s from "@/sections/espacio/hero.module.css";

// ─── Hero de la home: el planeta desde el espacio ─────────────────────────────
// Escena 0 del recorrido. El globo es el <Map> compartido, detrás; la cámara
// del hero va centrada (journey.ts) y la escena lo hunde con un transform para
// que sólo asome el casquete (espacio.module.css). Al pasar al primer destino,
// el vuelo de la cámara es también el amanecer: el sticky publica `--descenso`
// y las capas de la NASA lo siguen desde aquí.

// Centro aprox. de RD, mismo punto que el keyframe `hero` de la cámara.
const RD_COORDS: [number, number] = [-70.1627, 18.7357];

const P_HERO = SCENE_BANDS[0].center;
const P_DESTINO = SCENE_BANDS[1].center;

// El amanecer termina en esta fracción del vuelo. La cámara del recorrido
// pica pronto (el zoom sale de la tabla del tramo, no de una recta): a mitad
// de vuelo la isla ya se distingue y las teselas de nivel 8 y las nubes de
// 1024 px se ven en bloques. Comprimido a 0.6 el día cede al mapa de marca
// justo antes de que se note.
const FIN_DEL_AMANECER = 0.6;

/** Descenso 0..1 equivalente a un progreso del recorrido: 0 en el keyframe
 *  del hero, 1 cuando el amanecer ha terminado, antes de aterrizar en el
 *  primer destino. Fuera de ese tramo, 1. */
export function descensoDe(p: number): number {
  const t = (p - P_HERO) / (P_DESTINO - P_HERO) / FIN_DEL_AMANECER;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * El punto de luz: el pin de marca sobre RD, con halo y pulso. Vive dentro de
 * <Map> porque es un MapMarker y maplibre lo mantiene pegado a las
 * coordenadas mientras el globo gira. Se apaga con el descenso desde CSS.
 */
export function HeroPinMarker() {
  return (
    <MapMarker longitude={RD_COORDS[0]} latitude={RD_COORDS[1]} anchor="bottom">
      <MarkerContent>
        <div className={`${e.punto} crd-hero-pin pointer-events-none relative`}>
          <span aria-hidden="true" className={e.halo} />
          <span aria-hidden="true" className={e.pulso} />
          <span className="relative block [filter:drop-shadow(0_4px_6px_rgba(15,26,46,0.35))]">
            <BrandPin size={34} color="var(--color-mango)" fondoVentana="#FFFFFF" />
          </span>
          {/* Cristal de noche, como la píldora del nav y el panel de pasos: la
              pastilla crema con tinta coral era el único objeto opaco del
              cielo, y el coral sobre tinta no llegaba a 2:1. */}
          <span
            data-noche="true"
            className={`${e.etiquetaRd} crd-cristal-liquido-chip whitespace-nowrap rounded-full px-2.5 py-1 font-label text-micro font-extrabold uppercase tracking-[.14em] text-white/92`}
          >
            República Dominicana
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

/**
 * Las capas de la NASA sobre el globo del recorrido, pintadas por frame desde
 * el `progress` del recorrido (sin pasar por React). El mapa llega ya cargado
 * y con la pintura de marca aplicada, que apaga la atmósfera: aquí se
 * enciende de nuevo mientras manda el hero.
 *
 * Existen SÓLO mientras dura el cielo. Antes se montaban al cargar el mapa y
 * se quedaban las trece escenas: dos fuentes raster del mundo entero hasta z8,
 * 241 peticiones a GIBS y sus texturas ocupando GPU durante todo el recorrido,
 * para no dibujar un píxel desde el primer destino. Al terminar el amanecer se
 * desmontan, y si alguien vuelve arriba se montan de nuevo.
 */
export function CapasNasaJourney() {
  const map = useMap();
  const { progress } = useScene();
  const [enElCielo, setEnElCielo] = useState(() => descensoDe(progress.get()) < 1);

  // El progreso cambia una vez por frame; el booleano, dos veces por recorrido.
  // El ref es lo que evita un render por frame.
  const ultimo = useRef(enElCielo);
  useEffect(() => {
    const ver = (p: number) => {
      const cielo = descensoDe(p) < 1;
      if (cielo === ultimo.current) return;
      ultimo.current = cielo;
      setEnElCielo(cielo);
    };
    ver(progress.get());
    return progress.on("change", ver);
  }, [progress]);

  useEffect(() => {
    if (!map || !enElCielo) return;
    const c: CapasNasa = montarCapasNasa(map);
    c.pintar(descensoDe(progress.get()));
    const parar = progress.on("change", (p) => c.pintar(descensoDe(p)));
    return () => {
      parar();
      c.desmontar();
    };
  }, [map, enElCielo, progress]);

  return null;
}

// La frase del hero, partida para poder escalonarla. El logo ya dio el nombre
// y el lema: esta línea es lo único que promete algo, así que entra palabra
// por palabra y termina marcando la que carga la frase. Antes describía el
// producto ("la guía de República Dominicana hecha por gente de aquí") y no
// prometía nada; ahora nombra el país que el visitante no va a encontrar en
// una guía, que es la misma promesa que hace el CTA de la lista.
const FRASE = ["La", "República", "Dominicana", "que", "no", "sale", "en", "las"];
const FRASE_CLAVE = "guías";

/** La primera palabra entra donde antes entraba la línea entera; cada
 *  siguiente, 75 ms después. */
const RETRASO_FRASE = 380;
const PASO_PALABRA = 75;
const retrasoDe = (i: number) => RETRASO_FRASE + i * PASO_PALABRA;

/** El subrayado no llega con la palabra: arranca cuando ya casi se posó, o se
 *  lee como parte del texto en vez de como un trazo encima. */
const RETRASO_RAYA = retrasoDe(FRASE.length) + 260;

/**
 * El contenido del hero se monta como hermano del mapa, no como hijo: <Map>
 * se carga con `ssr: false` y todo lo que cuelgue de él sale del HTML
 * inicial. El logo es el elemento LCP de la home y aquí se sirve renderizado.
 *
 * El logo ya dice el nombre y el lema, así que no hay titular: el h1 es la
 * marca (texto sólo para lectores de pantalla) y debajo va una sola línea que
 * promete lo que trae la app, y las dos acciones.
 */
export default function HeroEspacio() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "hero";

  return (
    <div className={e.capa} aria-hidden={!isVisible} inert={!isVisible}>
      <div className={s.columna}>
        <h1 className="m-0">
          <span className="sr-only">ConoceRD, descubre lo nuestro</span>
          <Image
            id="crd-logo"
            src="/assets/logo-noche.svg"
            alt=""
            width={1296}
            height={595}
            priority
            // Vector: el optimizador de Next rechaza SVG y no hay nada que
            // optimizar. La tinta del wordmark va en crema (logo-noche.svg)
            // porque sobre la noche el logo principal desaparecía.
            unoptimized
            className={`${e.entra} ${s.logo}`}
            style={{ animationDelay: "120ms" }}
          />
        </h1>

        <p className={s.linea}>
          {FRASE.map((palabra, i) => (
            <Fragment key={`${palabra}-${i}`}>
              <span className={s.palabra} style={{ animationDelay: `${retrasoDe(i)}ms` }}>
                {palabra}
              </span>{" "}
            </Fragment>
          ))}
          <span className={s.palabra} style={{ animationDelay: `${retrasoDe(FRASE.length)}ms` }}>
            <em className={s.clave} style={{ "--raya-retraso": `${RETRASO_RAYA}ms` } as React.CSSProperties}>
              {FRASE_CLAVE}
            </em>
            .
          </span>
        </p>

        <div className={`${e.entra} ${s.acciones}`} style={{ animationDelay: "520ms" }}>
          <Button variant="primary" size="lg" icon="download" onClick={() => scrollToSection("trigger-cta")}>
            Descargar la app
          </Button>
          <Button
            variant="glass"
            size="lg"
            noche
            icon="storefront"
            onClick={() => scrollToSection("trigger-negocios")}
          >
            Soy un negocio
          </Button>
        </div>
      </div>
    </div>
  );
}
