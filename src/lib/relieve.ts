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
export const RELIEVE_MINZOOM = 6;

// ─── La paleta ───────────────────────────────────────────────────────────────
//
// Tierra y mar se colorean desde el mismo DEM (capa `color-relief`): la altura
// decide el tono del suelo y la profundidad el del agua, píxel a píxel y sin
// costuras de tesela. El mar oscurece pegado a la costa y aclara mar adentro:
// no es el color del fondo real (ahí sería al revés), es la forma de leer la
// isla como un objeto sobre el agua. Encima, el relleno del océano a media
// opacidad unifica el tono; lagos y ríos van opacos, del color de mar abierto.
// Los bosques y parques del basemap se tiñen sobre el suelo, a media opacidad,
// para que el verde caiga donde hay vegetación de verdad.
//
// Tropical, elegida por Elias el 14 sep 2026 entre tres: el verde húmedo del
// Cibao y el turquesa de la costa, con la Cordillera en oliva y las cumbres
// en crema. Lo más parecido a la isla vista desde arriba sin ser una foto.

export type Paleta = {
  /** Metros a color, de la costa a la cumbre (el Pico Duarte tiene 3.087). */
  suelo: [number, string][];
  /** Profundidad a color, de la orilla (0) a mar abierto (-5000). Se ve a
   *  través del relleno del océano, que va a media opacidad. */
  mar: [number, string][];
  /** El relleno del agua: mar abierto y, opaco, lagos y ríos. */
  agua: string;
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
  mar: [
    [-5000, "#BFE9E5"],
    [-2500, "#B4E4E0"],
    [-600, "#93D0D0"],
    [-120, "#66B7BA"],
    [-25, "#3E97A0"],
    [-1, "#2C7F8A"],
  ],
  agua: "#B9E8E4",
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

/**
 * Añade la fuente, el color por altura, la sombra, la orilla y los tintes,
 * una sola vez. Devuelve `false` si ya estaban, para que quien lo llame sepa
 * que no hizo nada.
 */
export function ponerRelieve(map: MapaConRelieve, paleta: Paleta = PALETA): boolean {
  if (map.getSource(RELIEVE_FUENTE)) return false;
  map.addSource(RELIEVE_FUENTE, RELIEVE_DEM);
  const antesDe = capaDeReferencia(map);
  // De mar abierto a la orilla y de la costa a la cumbre, en una sola rampa:
  // el paso por el cero es el borde de la isla.
  const rampa = [...paleta.mar, ...paleta.suelo].flat();
  map.addLayer(
    {
      id: RELIEVE_COLOR,
      type: "color-relief",
      source: RELIEVE_FUENTE,
      minzoom: RELIEVE_MINZOOM,
      paint: { "color-relief-color": ["interpolate", ["linear"], ["elevation"], ...rampa] },
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
  // El relleno del agua va encima del color por profundidad. La profundidad
  // del DEM viene de una malla gruesa (medio kilómetro): de lejos dibuja un
  // degradado limpio alrededor de la isla, de cerca se ve a bloques. Por eso
  // el océano se deja casi transparente en la isla entera y opaco a partir de
  // z9.5: en los closeups el mar es liso, que es lo que se ve limpio. Lagos y ríos van
  // opacos: no tienen profundidad en el DEM que valga la pena enseñar.
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", paleta.agua);
    // El zoom sólo puede ir en la raíz de la expresión; el dato, dentro.
    const oceano = (o: number) => ["case", ["==", ["get", "class"], "ocean"], o, 1];
    map.setPaintProperty("water", "fill-opacity", [
      "interpolate",
      ["linear"],
      ["zoom"],
      7.5,
      oceano(0.3),
      8.5,
      oceano(0.7),
      9.5,
      oceano(1),
    ]);
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
