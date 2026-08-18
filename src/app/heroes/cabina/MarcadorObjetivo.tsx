"use client";

import { MapMarker, MarkerContent } from "@/components/map/Map";
import { OBJETIVO } from "./instrumentos";
import s from "./cabina.module.css";

/**
 * Objetivo del descenso, clavado a sus coordenadas reales: al bajar, la mira
 * (que marca el centro de cámara) y este anillo terminan en el mismo punto.
 *
 * Es un MapMarker, así que vive dentro del <Map> y no puede leer el contexto
 * del descenso; la etiqueta se enciende con `--descenso`, que hereda por CSS.
 */
export default function MarcadorObjetivo() {
  return (
    <MapMarker longitude={OBJETIVO.coords[0]} latitude={OBJETIVO.coords[1]} anchor="center">
      <MarkerContent>
        <div className={s.objetivo} aria-hidden="true">
          <span className={s.objetivoAnillo} />
          <span className={`${s.objetivoEtiqueta} font-mono text-micro font-bold uppercase tracking-[.12em]`}>
            {OBJETIVO.name}
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}
