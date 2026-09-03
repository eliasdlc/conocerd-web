"use client";

import { MapMarker, MarkerContent } from "@/components/map/Map";
import { FEATURED_DESTINATIONS } from "@/data/destinations";
import s from "./estilos.module.css";

// Mismo punto que el keyframe `hero`: el centro del globo.
const RD: [number, number] = [-70.1627, 18.7357];

/** Gota coral con contorno claro — el mismo pin del hero en producción. */
function Gota() {
  return (
    <svg
      width={30}
      height={40}
      viewBox="0 0 34 46"
      fill="none"
      aria-hidden="true"
      className="block [filter:drop-shadow(0_4px_6px_rgba(38,70,83,0.35))]"
    >
      <path
        d="M17 1C8.7 1 2 7.7 2 16c0 10.5 13 27 14.1 28.3a1.2 1.2 0 0 0 1.8 0C19 43 32 26.5 32 16 32 7.7 25.3 1 17 1Z"
        fill="#F76C4D"
        stroke="#fff"
        strokeWidth="2"
      />
      <circle cx="17" cy="16" r="5.5" fill="#fff" />
    </svg>
  );
}

/**
 * Capas pegadas al mapa. Van dentro de <Map>, fuera del contexto del descenso,
 * así que su visibilidad la resuelve el CSS: heredan `--descenso` del
 * contenedor sticky y se encienden solas.
 *
 *  · El pin de RD marca el país mientras el planeta está entero.
 *  · La etiqueta del destino aparece a mitad del vuelo, cuando ya se ve dónde
 *    aterriza la cámara: el descenso lleva a un sitio real, no a un zoom.
 */
export default function Marcadores() {
  const destino = FEATURED_DESTINATIONS[0];

  return (
    <>
      <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom">
        <MarkerContent>
          {/* El casquete visible del globo es medio Atlántico: sin nombrar el
              país, la primera pantalla se lee «Norteamérica». El pin marca el
              punto y la etiqueta lo dice. */}
          <div className={`${s.pinRd} pointer-events-none relative`}>
            <Gota />
            <span className={`${s.etiquetaRd} whitespace-nowrap rounded-full border border-line bg-cream/94 px-2.5 py-1 font-mono text-micro font-bold uppercase tracking-[.14em] text-coral-ink shadow-card backdrop-blur-[10px]`}>
              República Dominicana
            </span>
          </div>
        </MarkerContent>
      </MapMarker>

      {destino && (
        <MapMarker longitude={destino.coords[0]} latitude={destino.coords[1]} anchor="bottom">
          <MarkerContent>
            <div
              className={`${s.pinDestino} pointer-events-none -translate-y-1.5 rounded-full border border-line bg-cream/94 px-3 py-1.5 text-center shadow-card backdrop-blur-[10px]`}
            >
              <span className="block font-mono text-micro font-bold uppercase tracking-[.14em] text-coral-ink">
                Aterrizaje
              </span>
              <span className="block whitespace-nowrap text-tiny font-bold text-ink">
                {destino.name}
              </span>
            </div>
          </MarkerContent>
        </MapMarker>
      )}
    </>
  );
}
