"use client";

import BrandPin from "@/components/BrandPin";
import { MapMarker, MarkerContent } from "@/components/map/context";
import s from "./estilos.module.css";

// Centro de RD, el mismo punto del keyframe `hero` de la cámara.
const RD: [number, number] = [-70.1627, 18.7357];

// El pin de marca sobre el país, dentro del mapa: maplibre lo mantiene pegado
// a sus coordenadas mientras el globo gira, así que señala el sitio de verdad
// y no un punto de la pantalla. Se apaga al empezar el descenso (CSS, con
// `--descenso`): a partir de ahí el sujeto es el país entrando en cuadro.
export default function PinRD() {
  return (
    <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom">
      <MarkerContent>
        <div className={s.pin}>
          <span className={s.pinEtiqueta}>República Dominicana</span>
          <span className="block [filter:drop-shadow(0_5px_8px_rgba(6,20,26,0.45))]">
            <BrandPin size={34} color="var(--color-mango)" fondoVentana="#FFFFFF" />
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
