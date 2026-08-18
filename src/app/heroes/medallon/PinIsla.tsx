"use client";

import { MapMarker, MarkerContent } from "@/components/map/Map";
import s from "./estilos.module.css";

/** Mismo punto que el keyframe `hero` de la cámara: el centro del troquel. */
const RD: [number, number] = [-70.1627, 18.7357];

// Va dentro del <Map> (GloboHero lo monta vía `capasDelMapa`) para que maplibre
// lo mantenga clavado en las coordenadas mientras el globo gira. La opacidad la
// gobierna `--descenso` desde el CSS: en cuanto empieza el vuelo, el país deja
// de ser un punto y el pin sobra.
export default function PinIsla() {
  return (
    <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom">
      <MarkerContent>
        <div className={`${s.pin} pointer-events-none`}>
          <svg
            width={30}
            height={41}
            viewBox="0 0 34 46"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="block [filter:drop-shadow(0_3px_5px_rgba(38,70,83,0.4))]"
          >
            <path
              d="M17 1C8.7 1 2 7.7 2 16c0 10.5 13 27 14.1 28.3a1.2 1.2 0 0 0 1.8 0C19 43 32 26.5 32 16 32 7.7 25.3 1 17 1Z"
              fill="#F76C4D"
              stroke="#FFFDF7"
              strokeWidth="2.4"
            />
            <circle cx="17" cy="16" r="5.4" fill="#FFFDF7" />
          </svg>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
