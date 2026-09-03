"use client";

import { createContext, useContext } from "react";

// Estado compartido entre el overlay (las fichas, que se sirven fuera del mapa)
// y la capa del mapa (los pines y los hilos, que necesitan `useMap`). El
// proveedor vive por encima de <GloboHero>, así que ambos árboles lo ven aunque
// GloboHero los monte en sitios distintos.

export type EstadoConstelacion = {
  /** Destino destacado por hover, foco o toque. `null` = ninguno. */
  activo: string | null;
  setActivo: (id: string | null) => void;
  /** Escala de la constelación según el ancho (1 = referencia 1440). */
  esc: number;
  movil: boolean;
  /** `false` hasta que se mide el viewport: la geometría no dibuja antes. */
  medido: boolean;
};

export const ConstelacionContext = createContext<EstadoConstelacion>({
  activo: null,
  setActivo: () => {},
  esc: 1,
  movil: false,
  medido: false,
});

export function useConstelacion(): EstadoConstelacion {
  return useContext(ConstelacionContext);
}
