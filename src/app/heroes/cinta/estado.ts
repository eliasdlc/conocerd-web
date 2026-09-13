"use client";

import { createContext, useContext } from "react";

// Estado compartido entre la cinta (que se sirve fuera del mapa) y la capa de
// pines (que necesita `useMap`). El proveedor vive por encima de <GloboHero>,
// así que ambos árboles lo ven aunque GloboHero los monte en sitios distintos.

export type EstadoCinta = {
  /** Destino señalado por hover, foco o toque. `null` = ninguno. */
  activo: string | null;
  setActivo: (id: string | null) => void;
};

export const CintaContext = createContext<EstadoCinta>({
  activo: null,
  setActivo: () => {},
});

export function useCinta(): EstadoCinta {
  return useContext(CintaContext);
}
