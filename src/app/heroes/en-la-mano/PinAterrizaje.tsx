"use client";

import BrandPin from "@/components/BrandPin";
import { MapMarker, MarkerContent } from "@/components/map/context";
import { FEATURED_DESTINATIONS } from "@/data/destinations";
import s from "./estilos.module.css";

// Centro de RD, el mismo punto del keyframe `hero` de la cámara.
const RD: [number, number] = [-70.1627, 18.7357];

// Dos marcadores pegados al mapa. Heredan `--descenso` del contenedor sticky y
// se encienden solos: el pin del país manda mientras el globo está entero; la
// etiqueta del destino aparece cuando el vuelo ya es evidente.
export default function PinAterrizaje() {
  const destino = FEATURED_DESTINATIONS[0];

  return (
    <>
      <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom">
        <MarkerContent>
          <div className={`${s.pinPais} pointer-events-none [filter:drop-shadow(0_4px_6px_rgba(15,26,46,0.35))]`}>
            <BrandPin size={34} color="var(--color-mango)" fondoVentana="#FFFFFF" />
          </div>
        </MarkerContent>
      </MapMarker>

      <MapMarker longitude={destino.coords[0]} latitude={destino.coords[1]} anchor="bottom">
        <MarkerContent>
          <div className={`${s.pinDestino} pointer-events-none -translate-y-1.5 rounded-full border border-line bg-cream/94 px-3 py-1.5 text-center shadow-e1 backdrop-blur-[10px]`}>
            <span className="block font-label text-micro font-extrabold uppercase tracking-[.14em] text-coral-ink">
              Aterrizaje
            </span>
            <span className="block whitespace-nowrap text-tiny font-bold text-ink">{destino.name}</span>
          </div>
        </MarkerContent>
      </MapMarker>
    </>
  );
}
