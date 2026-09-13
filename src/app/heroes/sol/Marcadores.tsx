"use client";

import BrandPin from "@/components/BrandPin";
import { MapMarker, MarkerContent } from "@/components/map/context";
import { FEATURED_DESTINATIONS } from "@/data/destinations";
import s from "./estilos.module.css";

// Mismo punto que el keyframe `hero`: el centro del globo.
const RD: [number, number] = [-70.1627, 18.7357];

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
            <span className="block [filter:drop-shadow(0_4px_6px_rgba(15,26,46,0.35))]">
              <BrandPin size={34} color="var(--color-mango)" fondoVentana="#FFFFFF" />
            </span>
            <span className={`${s.etiquetaRd} whitespace-nowrap rounded-full border border-line bg-cream/94 px-2.5 py-1 font-label text-micro font-extrabold uppercase tracking-[.14em] text-coral-ink shadow-e1 backdrop-blur-[10px]`}>
              República Dominicana
            </span>
          </div>
        </MarkerContent>
      </MapMarker>

      {destino && (
        <MapMarker longitude={destino.coords[0]} latitude={destino.coords[1]} anchor="bottom">
          <MarkerContent>
            <div
              className={`${s.pinDestino} pointer-events-none -translate-y-1.5 rounded-full border border-line bg-cream/94 px-3 py-1.5 text-center shadow-e1 backdrop-blur-[10px]`}
            >
              <span className="block font-label text-micro font-extrabold uppercase tracking-[.14em] text-coral-ink">
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
