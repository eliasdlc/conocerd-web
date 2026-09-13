"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { MotionValue } from "motion/react";
import type maplibregl from "maplibre-gl";
import { cameraAtProgress } from "@/lib/journey";
import { currentViewport } from "@/lib/journeyCamera";
import { ponerTerreno, terrenoDeseado } from "@/lib/relieve";

// El terreno en 3D sigue al zoom de la cámara del recorrido, no a la escena:
// la escena cambia a mitad de vuelo, cuando la cámara aún va alta y picada, y
// ahí encender o apagar la malla se vería. Por zoom, con la histéresis de
// lib/relieve, el cambio ocurre a media bajada y no desplaza nada visible.
//
// Escucha el progreso como motion value (sin estado de React: son decenas de
// escrituras por segundo durante un vuelo) y sólo toca el mapa cuando el
// estado deseado cambia.
export function useTerreno(
  mapRef: RefObject<maplibregl.Map | null>,
  progress: MotionValue<number>,
  habilitado: boolean
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!habilitado) {
      if (map) ponerTerreno(map, false);
      return;
    }
    let encendido = false;
    // El mapa sobre el que se escribió por última vez: es el que hay que
    // apagar al desmontar, no el que el ref tenga en ese momento.
    let ultimo: maplibregl.Map | null = null;
    const evaluar = (p: number) => {
      const map = mapRef.current;
      if (!map) return;
      ultimo = map;
      const { zoom } = cameraAtProgress(p, currentViewport());
      const deseado = terrenoDeseado(zoom, encendido);
      if (deseado === encendido) return;
      // Si la fuente aún no existe, no se marca como hecho: el siguiente frame
      // lo vuelve a intentar.
      if (ponerTerreno(map, deseado)) encendido = deseado;
    };
    evaluar(progress.get());
    const parar = progress.on("change", evaluar);
    return () => {
      parar();
      if (ultimo) ponerTerreno(ultimo, false);
    };
  }, [mapRef, progress, habilitado]);
}
