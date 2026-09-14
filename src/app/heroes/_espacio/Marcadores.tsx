"use client";

import BrandPin from "@/components/BrandPin";
import { MapMarker, MarkerContent } from "@/components/map/context";
import { FEATURED_DESTINATIONS } from "@/data/destinations";
import s from "@/sections/espacio/espacio.module.css";

// Mismo punto que el keyframe `hero`: el centro del globo.
const RD: [number, number] = [-70.1627, 18.7357];

/**
 * Capas pegadas al mapa. Heredan `--descenso` del contenedor sticky y se
 * encienden solas desde el CSS.
 *
 *  · El punto de luz: el pin de marca con un halo y un pulso que se expande
 *    desde él, lo único que llama la atención sobre el planeta.
 *  · La etiqueta del destino aparece cuando ya se ve dónde aterriza la cámara.
 */
export default function Marcadores() {
  const destino = FEATURED_DESTINATIONS[0];

  return (
    <>
      <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom">
        <MarkerContent>
          <div className={`${s.punto} pointer-events-none relative`}>
            <span aria-hidden="true" className={s.halo} />
            <span aria-hidden="true" className={s.pulso} />
            <span className="relative block">
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
            <div className={`${s.pinDestino} pointer-events-none -translate-y-1.5 rounded-full border border-line bg-cream/94 px-3 py-1.5 text-center shadow-e1 backdrop-blur-[10px]`}>
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
