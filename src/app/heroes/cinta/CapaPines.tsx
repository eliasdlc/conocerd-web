"use client";

import BrandPin from "@/components/BrandPin";
import { MapMarker, MarkerContent } from "@/components/map/context";
import { CATEGORY_META, FEATURED_DESTINATIONS } from "@/data/destinations";
import { useCinta } from "./estado";
import s from "./estilos.module.css";

// Centro de RD, el mismo punto del keyframe `hero` de la cámara.
const RD: [number, number] = [-70.1627, 18.7357];

/** El primer destino del recorrido: su pin es el que queda en pie al aterrizar. */
const ATERRIZAJE = FEATURED_DESTINATIONS[0].id;

// Capa del mapa. A zoom 2.5 la isla mide ~22 px, así que seis pines a la vez
// serían un borrón: aquí se enciende SÓLO el pin de la polaroid señalada,
// sobre su coordenada real, y el resto del tiempo el país lo marca un único
// pin de marca. Todos son MapMarker: viajan pegados al mapa mientras el globo
// gira y mientras la cámara baja.
export default function CapaPines() {
  const { activo } = useCinta();

  return (
    <>
      <MapMarker longitude={RD[0]} latitude={RD[1]} anchor="bottom" zIndex={1}>
        <MarkerContent>
          <div
            className={`${s.pinPais} pointer-events-none [filter:drop-shadow(0_4px_6px_rgba(15,26,46,0.35))]`}
            data-apagado={activo ? "1" : undefined}
          >
            <BrandPin size={34} color="var(--color-mango)" fondoVentana="#FFFFFF" />
          </div>
        </MarkerContent>
      </MapMarker>

      {FEATURED_DESTINATIONS.map((d) => {
        const meta = CATEGORY_META[d.category];
        const encendido = activo === d.id;
        const final = d.id === ATERRIZAJE;
        return (
          <MapMarker key={d.id} longitude={d.coords[0]} latitude={d.coords[1]} anchor="bottom" zIndex={encendido ? 6 : 2}>
            <MarkerContent>
              <div
                className={`${s.pinDestino} pointer-events-none`}
                data-on={encendido ? "1" : undefined}
                data-final={final ? "1" : undefined}
              >
                <span className={s.pinEtiqueta}>{d.name}</span>
                <span className="block [filter:drop-shadow(0_4px_6px_rgba(15,26,46,0.35))]">
                  <BrandPin size={30} color={meta.deep} fondoVentana="#FFFFFF" />
                </span>
              </div>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}
