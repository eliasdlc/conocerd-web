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
export const RELIEVE_COLOR = "relieve-color";
export const RELIEVE_ORILLA = "relieve-orilla";
/** Ancho de cada banda del mar a z9, en píxeles; a z12 es el triple. */
const ANCHO_ORILLAS = [4, 12, 26];
export const RELIEVE_MINZOOM = 6;

// ─── La paleta ───────────────────────────────────────────────────────────────
//
// El color del suelo sale de la altura (capa `color-relief`: el DEM decide qué
// tono lleva cada píxel) y el del agua de dos tonos: el relleno y una orilla
// clara que sigue la costa y los lagos, como el agua baja. Los bosques y
// parques del basemap se tiñen encima, a media opacidad, para que el verde
// caiga donde hay vegetación de verdad y no en toda la llanura.
//
// Tropical, elegida por Elias el 14 sep 2026 entre tres: el verde húmedo del
// Cibao y el turquesa de la costa, con la Cordillera en oliva y las cumbres
// en crema. Lo más parecido a la isla vista desde arriba sin ser una foto.

export type Paleta = {
  /** Metros a color, de la costa a la cumbre (el Pico Duarte tiene 3.087). */
  suelo: [number, string][];
  /** El mar lejos de la costa: el tono más claro. */
  agua: string;
  /** El mar desde la costa hacia fuera: del más oscuro al más claro, cada
   *  banda más ancha y más difusa que la anterior. */
  orillas: [string, string, string];
  bosque: string;
  sombra: string;
};

export const PALETA: Paleta = {
  suelo: [
    [0, "#DDEFC6"],
    [120, "#BFE0A0"],
    [400, "#A3CF86"],
    [900, "#8DB870"],
    [1500, "#9DA86A"],
    [2300, "#B29A73"],
    [3100, "#F0E9DC"],
  ],
  agua: "#B9E8E4",
  orillas: ["#4FA9B0", "#7CC6C8", "#A3DAD8"],
  bosque: "#8FC77A",
  sombra: "#3F5F3A",
};

/**
 * Debajo de qué capa va el relieve. Positron dibuja en este orden: fondo,
 * rellenos de suelo, ríos, fronteras, agua, carreteras, símbolos. El relieve
 * va justo antes del primer río (`waterway`): sobre la tierra y bajo todo lo
 * que la persona lee. Si el estilo cambia y esa capa no existe, va bajo el
 * primer símbolo, que es el peor sitio aceptable: encima del agua, pero nunca
 * encima de un nombre.
 */
export function capaDeReferencia(map: Pick<maplibregl.Map, "getStyle">): string | undefined {
  const capas = map.getStyle()?.layers ?? [];
  const rio = capas.find((c) => c.id === "waterway");
  if (rio) return rio.id;
  return capas.find((c) => c.type === "symbol")?.id;
}

type MapaConRelieve = Pick<
  maplibregl.Map,
  "getStyle" | "getSource" | "addSource" | "addLayer" | "getLayer" | "setPaintProperty"
>;

/** Capa que va justo encima de `id`, o `undefined` si es la última. */
function capaSiguiente(map: Pick<maplibregl.Map, "getStyle">, id: string): string | undefined {
  const capas = map.getStyle()?.layers ?? [];
  const i = capas.findIndex((c) => c.id === id);
  return i >= 0 ? capas[i + 1]?.id : undefined;
}

/**
 * Añade la fuente, el color por altura, la sombra, la orilla y los tintes,
 * una sola vez. Devuelve `false` si ya estaban, para que quien lo llame sepa
 * que no hizo nada.
 */
export function ponerRelieve(map: MapaConRelieve, paleta: Paleta = PALETA): boolean {
  if (map.getSource(RELIEVE_FUENTE)) return false;
  map.addSource(RELIEVE_FUENTE, RELIEVE_DEM);
  const antesDe = capaDeReferencia(map);
  map.addLayer(
    {
      id: RELIEVE_COLOR,
      type: "color-relief",
      source: RELIEVE_FUENTE,
      minzoom: RELIEVE_MINZOOM,
      paint: {
        "color-relief-color": ["interpolate", ["linear"], ["elevation"], ...paleta.suelo.flat()],
      },
    },
    antesDe
  );
  map.addLayer(
    {
      id: RELIEVE_CAPA,
      type: "hillshade",
      source: RELIEVE_FUENTE,
      minzoom: RELIEVE_MINZOOM,
      paint: {
        // Sombra suave a propósito: el método "igor" sombrea por pendiente
        // sin el contraste duro del estándar. La sombra lleva el tono oscuro
        // de la paleta y la luz es blanca, para que el color de altura siga
        // mandando.
        "hillshade-method": "igor",
        "hillshade-exaggeration": 0.3,
        "hillshade-shadow-color": paleta.sombra,
        "hillshade-highlight-color": "#FFFFFF",
        "hillshade-accent-color": "#EBE6D9",
        "hillshade-illumination-direction": 335,
        "hillshade-illumination-anchor": "map",
      },
    },
    antesDe
  );
  // El mar con relieve: el relleno es el tono claro de mar abierto y, desde
  // la costa hacia fuera, tres bandas cada vez más anchas, más difusas y más
  // claras, dibujadas sobre el borde de los polígonos de agua. `line-offset`
  // empuja cada banda hacia dentro del agua para que ninguna pise la tierra.
  // La más ancha va primero y la más oscura, pegada a la costa, encima.
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", paleta.agua);
    const encima = capaSiguiente(map, "water");
    [2, 1, 0].forEach((i) => {
      const ancho = ANCHO_ORILLAS[i];
      map.addLayer(
        {
          id: `${RELIEVE_ORILLA}-${i}`,
          type: "line",
          source: "carto",
          "source-layer": "water",
          filter: ["==", "$type", "Polygon"],
          minzoom: RELIEVE_MINZOOM,
          paint: {
            "line-color": paleta.orillas[i],
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, ancho / 3, 9, ancho, 12, ancho * 3],
            "line-blur": ["interpolate", ["linear"], ["zoom"], 6, ancho / 4, 9, ancho * 0.7, 12, ancho * 2],
            "line-offset": ["interpolate", ["linear"], ["zoom"], 6, ancho / 6, 9, ancho / 2, 12, ancho * 1.5],
            "line-opacity": 0.85,
          },
        },
        encima
      );
    });
  }
  // Bosques y parques del basemap, teñidos a media opacidad sobre el color de
  // altura: el verde cae donde hay vegetación de verdad.
  for (const id of ["landcover", "park_national_park", "park_nature_reserve"]) {
    if (!map.getLayer(id)) continue;
    map.setPaintProperty(id, "fill-color", paleta.bosque);
    map.setPaintProperty(id, "fill-opacity", 0.45);
  }
  return true;
}
