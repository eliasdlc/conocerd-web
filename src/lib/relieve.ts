// ─────────────────────────────────────────────────────────────────────────────
//  El relieve del país: teselas raster nuestras, con la tinta y la sombra ya
//  horneadas.
//
//  La primera versión montaba el DEM de AWS crudo y lo coloreaba en el
//  navegador con `color-relief` + `hillshade`. Lo que se midió el 14 sep 2026:
//  23,2 MB y 259 teselas por recorrido, entre 1 y 17 fps durante los vuelos, y
//  un shader que ni siquiera compila sin GPU (el mapa salía en blanco). Además
//  se veía mal, y no por la paleta: una tesela DEM de 256 px a z11 se estira
//  2,8 veces en un closeup a z11,5, que es exactamente el "borroso" que se
//  reportó, y los huecos donde el DEM no había llegado se veían como parches
//  planos.
//
//  Ahora el color por altura y el sombreado multidireccional se calculan una
//  vez, en `scripts/hornear-relieve.mjs`, y viajan como WebP de 512 px desde
//  nuestro propio dominio. En el navegador es una capa `raster` y nada más: una
//  textura por tesela, cero shader por píxel, el mismo dibujo con GPU o sin
//  ella, y el doble de resolución que antes porque cada tesela se hornea desde
//  el nivel de abajo.
//
//  Lo que NO mejora son los bytes: un recorrido completo sigue pidiendo del
//  orden de 2 MB de relieve. La diferencia es el dibujo y el aspecto.
//
//  El mar no lleva relieve. La batimetría del DEM venía de una malla de medio
//  kilómetro y se veía a bloques: era el mar "horrible", con sus parches
//  rectangulares y sus motas en mar abierto. La tierra es opaca, el mar es
//  transparente, y encima el polígono de agua de Positron pone un azul plano.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";

/** Carpeta de las teselas horneadas. Un rehorneado sube de versión: las
 *  teselas se sirven inmutables y cacheadas para siempre (next.config.ts). */
export const RELIEVE_VERSION = "v2";
export const RELIEVE_TESELAS = `/relieve/${RELIEVE_VERSION}/{z}/{x}/{y}.webp`;

export const RELIEVE_FUENTE = "relieve";
export const RELIEVE_CAPA = "relieve-color";

/**
 * z4 y no z6.
 *
 * MapLibre no sirve una fuente por debajo de su `minzoom`: no la reescala, la
 * omite entera (`coveringTiles` devuelve la lista vacía). Y el encuadre de Tu
 * ruta en un teléfono corto (375×553) es z4,96, o sea nivel de tesela 4. Con la
 * fuente arrancando en z6 el relieve desaparecía justo en la escena donde se ve
 * el país completo.
 *
 * Por debajo de z4 sigue sin haber relieve, que es lo que hace falta: el globo
 * del hero está en z1,15 y el del cierre en z2,2, y ahí la isla no se distingue.
 */
export const RELIEVE_MINZOOM = 4;
export const RELIEVE_MAXZOOM = 11;

/**
 * La Española entera, a todos los niveles.
 *
 * Se probó a hornear sólo República Dominicana en z10 y z11, por peso: sale
 * mal por dos lados. Un encuadre de closeup se sale del país por arriba y por
 * el oeste, y cada tesela que falta es un 404 (y un hueco); y en Bahía de las
 * Águilas o en el lago Enriquillo, Haití entra en cuadro, así que la mitad
 * oeste de la imagen quedaría plana al lado de la sombreada. El coste real de
 * incluirlo fue pequeño: las teselas de sólo mar pesan lo mismo que nada.
 */
export const RELIEVE_BOUNDS: [number, number, number, number] = [-74.5, 17.4, -68.2, 20.1];

// ─── La paleta ───────────────────────────────────────────────────────────────
//
// Cálida y desaturada (S ≤ 40 %) a propósito: el crema del cromo, el coral de
// las acciones y los chips de clima se apoyan encima sin pelear con el mapa,
// que era el "nada combina con nada". La rampa va del llano a la cumbre; el
// Pico Duarte tiene 3.087 m.
//
// El horneado importa esta misma constante, así que la paleta del PNG y la del
// runtime no pueden separarse.

export type Paleta = {
  /** Metros a color, de la costa a la cumbre. */
  suelo: [number, string][];
  /** El agua: mar abierto, lagos y ríos, todo el mismo azul y siempre opaco. */
  agua: string;
  /** El fondo del mapa. Es EXACTAMENTE el color de la cota cero: una tesela de
   *  relieve que aún no llegó se lee como tierra sin sombra, nunca como un
   *  hueco blanco. */
  fondo: string;
};

export const PALETA: Paleta = {
  // Del 0 a los 200 m la claridad baja tres puntos, no ocho. Con la cota cero
  // en el tono más claro de la isla (más claro que el mar y que el llano), la
  // costa entera se dibujaba con un reborde pálido de anchura constante: un
  // rim light, no una playa. Ahora la costa la definen el cambio de verde a
  // azul y la línea del polígono de agua, que es nítida a todo zoom.
  suelo: [
    [0, "#CFDDB4"],
    [200, "#C3D5A6"],
    [600, "#A3BF88"],
    [1100, "#91A66E"],
    [1700, "#B0A878"],
    [2400, "#B89D7A"],
    [3100, "#F0E8DB"],
  ],
  // Azul, no turquesa: el mint de la marca (#25CCB8) es un acento y el mar no
  // puede competir con él ni con los chips de clima.
  agua: "#A4D0E0",
  fondo: "#CFDDB4",
};

/**
 * Debajo de qué capa va el relieve: `landcover`, que es la primera de Positron
 * después del fondo. Así el relieve es el suelo y TODO lo vectorial (agua,
 * manchas urbanas, carreteras, nombres) dibuja encima.
 *
 * Si el estilo cambiara y esa capa no existiera, vale la primera que no sea el
 * fondo, que es la misma posición dicha de otra forma.
 */
export function capaDeReferencia(map: Pick<maplibregl.Map, "getStyle">): string | undefined {
  const capas = map.getStyle()?.layers ?? [];
  return (capas.find((c) => c.id === "landcover") ?? capas.find((c) => c.type !== "background"))?.id;
}

type MapaConRelieve = Pick<
  maplibregl.Map,
  "getStyle" | "getSource" | "addSource" | "addLayer" | "getLayer" | "setPaintProperty"
>;

/**
 * Añade la fuente y la capa del relieve, y deja el fondo y el agua del basemap
 * en los colores que la acompañan. Devuelve `false` si ya estaban.
 */
export function ponerRelieve(map: MapaConRelieve, paleta: Paleta = PALETA): boolean {
  if (map.getSource(RELIEVE_FUENTE)) return false;

  map.addSource(RELIEVE_FUENTE, {
    type: "raster",
    tiles: [RELIEVE_TESELAS],
    tileSize: 512,
    minzoom: RELIEVE_MINZOOM,
    maxzoom: RELIEVE_MAXZOOM,
    bounds: RELIEVE_BOUNDS,
    attribution:
      'Relieve: <a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a> (Mapzen, NASA SRTM, USGS, GEBCO)',
  });

  map.addLayer(
    {
      id: RELIEVE_CAPA,
      type: "raster",
      source: RELIEVE_FUENTE,
      minzoom: RELIEVE_MINZOOM,
      paint: {
        // `linear` porque por encima de z11 la tesela se sobreescala hasta 1,4
        // veces y el vecino más cercano deja escalones en las laderas.
        "raster-resampling": "linear",
        // Un fundido corto: una tesela que entra de golpe sobre el fondo del
        // mismo color se nota como un parpadeo de sombra.
        "raster-fade-duration": 300,
      },
    },
    capaDeReferencia(map)
  );

  if (map.getLayer("background")) {
    map.setPaintProperty("background", "background-color", paleta.fondo);
  }
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", paleta.agua);
    map.setPaintProperty("water", "fill-opacity", 1);
  }
  return true;
}
