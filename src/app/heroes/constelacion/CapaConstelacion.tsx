"use client";

import { useCallback, useEffect, useRef } from "react";
import { MapMarker, MarkerContent, useMap } from "@/components/map/Map";
import { CATEGORY_META } from "@/data/destinations";
import { CENTRO_HERO, DESTINO_ATERRIZAJE, NODOS } from "./datos";
import { useConstelacion } from "./estado";
import s from "./estilos.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Capa del mapa: los pines (MapMarker, pegados a sus coordenadas reales) y el
//  SVG con los hilos.
//
//  Todo el enganche hilo↔pin se resuelve aquí y en un solo sitio, porque aquí
//  es donde se puede proyectar: `useMap()` solo existe dentro de <Map>. En cada
//  frame que el mapa pinta se recalcula:
//
//    A   = map.project(coordenada real del destino)
//    S   = centro del globo + polar(ángulo, radio)   ← slot de la constelación
//    pin = lerp(A, S, (1 - descenso)^1.4)
//
//  El pin se coloca desplazando el marcador (que MapLibre ya dejó en A), así que
//  sigue anclado a su coordenada: cuando el descenso termina, el desplazamiento
//  es cero y el pin está literalmente sobre el destino.
//
//  El hilo va del nodo de la ficha —medido del DOM, así no hay que duplicar la
//  maquetación en JS— hasta el pin, y el "pelo" punteado sigue del pin a su
//  coordenada exacta. Los dos se cortan a 11 px del pin para no cruzarlo.
// ─────────────────────────────────────────────────────────────────────────────

const RECORTE_PIN = 11;

export default function CapaConstelacion() {
  const map = useMap();
  const { activo, setActivo, esc, movil, medido } = useConstelacion();

  const svgRef = useRef<SVGSVGElement>(null);
  const pines = useRef<Record<string, HTMLDivElement | null>>({});
  const hilos = useRef<Record<string, SVGPathElement | null>>({});
  const pelos = useRef<Record<string, SVGPathElement | null>>({});
  const anclas = useRef<Record<string, SVGCircleElement | null>>({});

  const dibujar = useCallback(() => {
    const svg = svgRef.current;
    if (!map || !svg) return;

    const caja = svg.getBoundingClientRect();
    if (caja.width === 0) return;

    // `--descenso` lo publica el contenedor sticky de GloboHero y se hereda
    // hasta aquí: evita duplicar el cálculo del scroll.
    const t = Number.parseFloat(getComputedStyle(svg).getPropertyValue("--descenso")) || 0;
    const w = Math.pow(Math.max(0, 1 - t), 1.4);
    const escala = esc;
    const enMovil = movil;

    let centro: { x: number; y: number };
    try {
      centro = map.project(CENTRO_HERO);
    } catch {
      return;
    }

    for (const n of NODOS) {
      const a = map.project(n.destino.coords);
      const ang = ((enMovil ? n.anguloMovil : n.angulo) * Math.PI) / 180;
      const radio = enMovil ? n.radioMovil : n.radio * escala;
      const sx = centro.x + Math.cos(ang) * radio;
      const sy = centro.y + Math.sin(ang) * radio;
      const px = a.x + (sx - a.x) * w;
      const py = a.y + (sy - a.y) * w;

      const pin = pines.current[n.id];
      if (pin) pin.style.transform = `translate(${(px - a.x).toFixed(1)}px, ${(py - a.y).toFixed(1)}px)`;

      // Pelo punteado pin → coordenada real. Bajo 26 px ya están encima uno del
      // otro y el punteado solo ensucia.
      const dAncla = Math.hypot(a.x - px, a.y - py);
      const pelo = pelos.current[n.id];
      const ancla = anclas.current[n.id];
      if (pelo && ancla) {
        if (dAncla > 26) {
          const ux = (a.x - px) / dAncla;
          const uy = (a.y - py) / dAncla;
          pelo.setAttribute(
            "d",
            `M${(px + ux * RECORTE_PIN).toFixed(1)},${(py + uy * RECORTE_PIN).toFixed(1)} L${a.x.toFixed(1)},${a.y.toFixed(1)}`
          );
          ancla.setAttribute("cx", a.x.toFixed(1));
          ancla.setAttribute("cy", a.y.toFixed(1));
          ancla.setAttribute("r", "2.2");
        } else {
          pelo.setAttribute("d", "M0,0");
          ancla.setAttribute("r", "0");
        }
      }

      const hilo = hilos.current[n.id];
      if (!hilo) continue;
      const nodoEl = n.ficha
        ? document.querySelector<HTMLElement>(`[data-nodo="${n.id}"]`)
        : null;
      // `getClientRects().length === 0` ⇒ la ficha está oculta en este ancho.
      if (!nodoEl || nodoEl.getClientRects().length === 0) {
        hilo.setAttribute("d", "M0,0");
        continue;
      }
      const r = nodoEl.getBoundingClientRect();
      const nx = r.left - caja.left + r.width / 2;
      const ny = r.top - caja.top + r.height / 2;
      const dx = px - nx;
      const dy = py - ny;
      const largo = Math.hypot(dx, dy) || 1;
      const ux = dx / largo;
      const uy = dy / largo;
      const ex = px - ux * RECORTE_PIN;
      const ey = py - uy * RECORTE_PIN;
      // Curvatura perpendicular: un hilo recto se lee como cable de UI; con una
      // comba corta se lee como hilo tendido.
      const comba = Math.min(24, largo * 0.1);
      const cx = (nx + ex) / 2 - uy * comba;
      const cy = (ny + ey) / 2 + ux * comba;
      hilo.setAttribute(
        "d",
        `M${nx.toFixed(1)},${ny.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`
      );
    }
  }, [map, esc, movil]);

  useEffect(() => {
    if (!map) return;
    // `render` cubre el frame inicial, el descenso (cada jumpTo pinta) y la
    // rotación en reposo del globo, sin montar un rAF propio.
    map.on("render", dibujar);
    window.addEventListener("resize", dibujar);
    dibujar();
    return () => {
      map.off("render", dibujar);
      window.removeEventListener("resize", dibujar);
    };
  }, [map, dibujar]);

  // Destacar una ficha la levanta 2 px y la escala la reubica: los hilos tienen
  // que volver a medirla aunque el mapa no esté pintando. El segundo pase cae
  // al terminar la transición de la tarjeta.
  useEffect(() => {
    const id = window.setTimeout(dibujar, 240);
    dibujar();
    return () => window.clearTimeout(id);
  }, [dibujar, activo, medido]);

  return (
    <>
      <svg
        ref={svgRef}
        className={s.capa}
        aria-hidden="true"
        data-activo={activo ?? undefined}
      >
        {NODOS.map((n) => (
          <g key={n.id}>
            <path
              ref={(el) => {
                pelos.current[n.id] = el;
              }}
              className={s.pelo}
              d="M0,0"
            />
            <circle
              ref={(el) => {
                anclas.current[n.id] = el;
              }}
              className={s.ancla}
              r="0"
            />
            <path
              ref={(el) => {
                hilos.current[n.id] = el;
              }}
              className={s.hilo}
              data-on={activo === n.id ? "1" : undefined}
              d="M0,0"
            />
          </g>
        ))}
      </svg>

      {/* Ancla de la constelación. A zoom 2.5 la isla mide ~22 px: sin este
          anillo, seis pines repartidos por el Caribe no dicen que TODOS están
          en el mismo sitio. Se apaga al empezar a bajar, cuando el país ya
          ocupa pantalla y el anillo sobra. */}
      <MapMarker longitude={CENTRO_HERO[0]} latitude={CENTRO_HERO[1]} zIndex={0}>
        <MarkerContent>
          <div className={s.anillo} aria-hidden="true">
            <span className={s.anilloEtiqueta}>República Dominicana</span>
          </div>
        </MarkerContent>
      </MapMarker>

      {NODOS.map((n) => {
        const meta = CATEGORY_META[n.destino.category];
        const conFicha = Boolean(n.ficha);
        const final = n.id === DESTINO_ATERRIZAJE;
        return (
          <MapMarker
            key={n.id}
            longitude={n.destino.coords[0]}
            latitude={n.destino.coords[1]}
            // El pin destacado y su etiqueta tienen que pasar por encima de
            // los vecinos: MapLibre le pone `transform` a cada marcador, así
            // que un z-index interno no puede salir de su propio marcador.
            zIndex={activo === n.id ? 6 : final ? 3 : conFicha ? 2 : 1}
          >
            <MarkerContent>
              <div
                ref={(el) => {
                  pines.current[n.id] = el;
                }}
              >
                {/* `data-hay-activo` viaja en el propio marcador: los pines
                    se portalan al contenedor de MapLibre, fuera del SVG, así
                    que no hay ancestro común desde el que atenuarlos. */}
                <div
                  className={s.pinDescenso}
                  data-final={final ? "1" : undefined}
                  data-hay-activo={activo ? "1" : undefined}
                >
                  <span
                    className={s.pinDestaque}
                    data-on={activo === n.id ? "1" : undefined}
                    onMouseEnter={conFicha ? () => setActivo(n.id) : undefined}
                    onMouseLeave={conFicha ? () => setActivo(null) : undefined}
                  >
                    <span
                      className={s.punto}
                      data-menor={conFicha ? undefined : "1"}
                      style={{ ["--tono" as string]: meta.color }}
                    />
                    {conFicha && (
                      <span className={s.etiqueta} data-final={final ? "1" : undefined}>
                        {n.destino.name}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}
