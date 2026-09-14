// ─────────────────────────────────────────────────────────────────────────────
//  El relieve del país sobre el basemap de Carto.
//
//  Del paso 2 al 13 el recorrido vive sobre Positron: crema, plano y sin rasgo
//  alguno del terreno. Esto pone el DEM real (lib/basemap · RELIEVE_DEM) como
//  fuente y una capa de sombreado encima de los rellenos de suelo y debajo del
//  agua, las carreteras y los nombres: la Cordillera se lee, y la toponimia
//  sigue encima de todo.
//
//  La capa arranca en z6. Por debajo, la cámara está en el globo del hero o
//  del cierre, donde el relieve no se distingue y las teselas sólo pesarían:
//  MapLibre no pide teselas de una fuente cuya única capa está fuera de su
//  rango de zoom, así que en el hero no sale ni una petición al DEM.
//
//  La luz viene del noroeste y va anclada al mapa, no a la pantalla: el
//  recorrido gira el bearing entre escenas y la sombra tiene que quedarse en la
//  misma ladera.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";
import { RELIEVE_DEM } from "./basemap";

export const RELIEVE_FUENTE = "relieve";
export const RELIEVE_CAPA = "relieve-sombra";
export const RELIEVE_MINZOOM = 6;

/**
 * Debajo de qué capa va la sombra. Positron dibuja en este orden: fondo,
 * rellenos de suelo, ríos, fronteras, agua, carreteras, símbolos. La sombra va
 * justo antes del primer río (`waterway`): sobre la tierra y bajo todo lo que
 * la persona lee. Si el estilo cambia y esa capa no existe, va bajo el primer
 * símbolo, que es el peor sitio aceptable: encima del agua, pero nunca encima
 * de un nombre.
 */
export function capaDeReferencia(map: Pick<maplibregl.Map, "getStyle">): string | undefined {
  const capas = map.getStyle()?.layers ?? [];
  const rio = capas.find((c) => c.id === "waterway");
  if (rio) return rio.id;
  return capas.find((c) => c.type === "symbol")?.id;
}

type MapaConRelieve = Pick<maplibregl.Map, "getStyle" | "getSource" | "addSource" | "addLayer">;

/**
 * Añade la fuente y la capa una sola vez. Devuelve `false` si ya estaban, para
 * que quien lo llame sepa que no hizo nada.
 */
export function ponerRelieve(map: MapaConRelieve): boolean {
  if (map.getSource(RELIEVE_FUENTE)) return false;
  map.addSource(RELIEVE_FUENTE, RELIEVE_DEM);
  map.addLayer(
    {
      id: RELIEVE_CAPA,
      type: "hillshade",
      source: RELIEVE_FUENTE,
      minzoom: RELIEVE_MINZOOM,
      paint: {
        // Relieve en 2D, suave a propósito. El método "igor" sombrea por
        // pendiente sin el contraste duro del estándar, así que a z9 sobre
        // los closeups no se ve el grano de la tesela. La sombra va en la
        // tinta secundaria y no en la de marca, y la luz en blanco: la
        // Cordillera se lee y el llano sigue siendo crema, no gris.
        "hillshade-method": "igor",
        "hillshade-exaggeration": 0.3,
        "hillshade-shadow-color": "#3B5073",
        "hillshade-highlight-color": "#FFFFFF",
        "hillshade-accent-color": "#EBE6D9",
        "hillshade-illumination-direction": 335,
        "hillshade-illumination-anchor": "map",
      },
    },
    capaDeReferencia(map)
  );
  return true;
}

