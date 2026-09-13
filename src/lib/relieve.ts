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
        // Sombra en la tinta de marca y luz en crema, ambas a media fuerza:
        // el relieve tiene que leerse como parte del mapa, no como una capa
        // pegada encima. Con 0.35 la Cordillera se ve y el llano sigue crema.
        "hillshade-exaggeration": 0.35,
        "hillshade-shadow-color": "#0F1A2E",
        "hillshade-highlight-color": "#FFFFFF",
        "hillshade-accent-color": "#D9D2C1",
        "hillshade-illumination-direction": 335,
        "hillshade-illumination-anchor": "map",
      },
    },
    capaDeReferencia(map)
  );
  return true;
}

// ─── Terreno en 3D ───────────────────────────────────────────────────────────
//
// El sombreado ya da relieve a cualquier zoom. El terreno de verdad (la malla
// que levanta la montaña y la pone en perspectiva) sólo vale la pena en los
// closeups de los destinos, que van de z9 a z11.5 con la cámara picada. En el
// resto del recorrido (globo, isla entera, Tu ruta a z7.2 y cenital) no se ve
// y sólo cuesta GPU, así que se enciende y se apaga por zoom con histéresis:
// entra a partir de 8.5 y sale por debajo de 8. Entre un umbral y otro la
// cámara está a media bajada y la malla apenas desplaza nada, así que el
// cambio no se nota.

export const TERRENO_EXAGERACION = 1.3;
export const TERRENO_DESDE = 8.5;
export const TERRENO_HASTA = 8;

/**
 * Interruptor del terreno en teléfono. El riesgo escrito en la decisión del
 * 13 sep 2026 es la GPU de un teléfono medio durante el vuelo entre destinos;
 * la medida en dispositivo real decide si esto se queda en `true`. Con `false`
 * el móvil conserva el sombreado y pierde sólo la malla.
 */
export const TERRENO_EN_MOVIL = true;

/** Si el terreno debe estar encendido a este zoom, dado si ya lo estaba. */
export function terrenoDeseado(zoom: number, encendido: boolean): boolean {
  return encendido ? zoom >= TERRENO_HASTA : zoom >= TERRENO_DESDE;
}

type MapaConTerreno = Pick<maplibregl.Map, "getSource" | "getTerrain" | "setTerrain">;

/**
 * Enciende o apaga la malla sobre la fuente del relieve. No hace nada si la
 * fuente aún no existe (el estilo no cargó) o si ya estaba como se pide, y
 * devuelve si escribió algo.
 */
export function ponerTerreno(map: MapaConTerreno, encendido: boolean): boolean {
  if (!map.getSource(RELIEVE_FUENTE)) return false;
  const actual = map.getTerrain() !== null;
  if (actual === encendido) return false;
  map.setTerrain(encendido ? { source: RELIEVE_FUENTE, exaggeration: TERRENO_EXAGERACION } : null);
  return true;
}
