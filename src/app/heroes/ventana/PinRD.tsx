"use client";

import { MapMarker, MarkerContent } from "@/components/map/Map";
import s from "./estilos.module.css";

// Centro de RD — el mismo punto del keyframe `hero` de la cámara.
const RD: [number, number] = [-70.1627, 18.7357];

// Chincheta sobre el país, dentro del mapa: maplibre la mantiene pegada a sus
// coordenadas mientras el globo gira, así que señala el sitio de verdad y no
// un punto de la pantalla. Se apaga al empezar el descenso (CSS, con
// `--descenso`): a partir de ahí el sujeto es el país entrando en cuadro.
export default function PinRD() {
  return (
    <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom">
      <MarkerContent>
        <div className={s.pin}>
          <span className={s.pinEtiqueta}>República Dominicana</span>
          <svg
            width={30}
            height={40}
            viewBox="0 0 34 46"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="block [filter:drop-shadow(0_5px_8px_rgba(6,20,26,0.45))]"
          >
            <path
              d="M17 1C8.7 1 2 7.7 2 16c0 10.5 13 27 14.1 28.3a1.2 1.2 0 0 0 1.8 0C19 43 32 26.5 32 16 32 7.7 25.3 1 17 1Z"
              fill="#F76C4D"
              stroke="#fff"
              strokeWidth="2"
            />
            <circle cx="17" cy="16" r="5.5" fill="#fff" />
          </svg>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
