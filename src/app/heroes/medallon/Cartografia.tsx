"use client";

import { useEffect } from "react";
import { useMap } from "@/components/map/Map";

// Dentro del troquel el mapa no es un mapa: es la lámina grabada de un sello.
// La toponimia por defecto compite con el texto curvo del anillo —en móvil
// "NORTH AMERICA" entra a cuerpo enorme y parte la ilusión—, así que aquí se
// baja de tono. Las costas, el agua y las fronteras se quedan intactas: son las
// que dibujan el planeta.
//
// Sólo toca capas de tipo `symbol` de la instancia propia de esta propuesta;
// no hay estilo compartido que se pueda ensuciar.
const OPACIDAD_TEXTO = 0.34;

export default function Cartografia() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    for (const capa of map.getStyle()?.layers ?? []) {
      if (capa.type !== "symbol") continue;
      try {
        map.setPaintProperty(capa.id, "text-opacity", OPACIDAD_TEXTO);
        map.setPaintProperty(capa.id, "icon-opacity", OPACIDAD_TEXTO);
      } catch {
        // Una capa sin texto ni icono no admite la propiedad: no es un fallo.
      }
    }
  }, [map]);

  return null;
}
