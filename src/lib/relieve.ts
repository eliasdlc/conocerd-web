// ─────────────────────────────────────────────────────────────────────────────
//  El relieve del país: teselas raster nuestras, con la tinta, la sombra y el
//  mar ya horneados.
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
//  Ahora el color por altura, el sombreado multidireccional y el color del mar
//  se calculan una vez, en `scripts/hornear-relieve.mjs`, y viajan como WebP de
//  512 px desde nuestro propio dominio. En el navegador es una capa `raster` y
//  nada más: una textura por tesela, cero shader por píxel, el mismo dibujo con
//  GPU o sin ella, y el doble de resolución que antes porque cada tesela se
//  hornea desde el nivel de abajo.
//
//  Lo que NO mejora son los bytes: un recorrido completo sigue pidiendo del
//  orden de 2 MB de relieve. La diferencia es el dibujo y el aspecto.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";

/** Carpeta de las teselas horneadas. Un rehorneado sube de versión: las
 *  teselas se sirven inmutables y cacheadas para siempre (next.config.ts). */
export const RELIEVE_VERSION = "v3";
export const RELIEVE_TESELAS = `/relieve/${RELIEVE_VERSION}/{z}/{x}/{y}.webp`;

export const RELIEVE_FUENTE = "relieve";
export const RELIEVE_CAPA = "relieve-color";
export const LAGOS_CAPA = "relieve-lagos";

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
 * La Española entera, más 45 km de mar por los cuatro lados.
 *
 * Los 45 km son la condición que hace invisible el borde de la caja. Dentro de
 * ella el mar lo pinta la tesela, con su degradado por distancia a la costa;
 * fuera no hay tesela y lo que se ve es el polígono de agua de Positron, plano.
 * Para que ese salto no exista, la rampa del mar tiene que haber terminado
 * ANTES del borde: termina a 30 km, y la caja da 45 de margen contra la costa
 * más cercana (Isla Beata por el sur, Punta Cana por el este, Cabo Isabela por
 * el norte, la punta oeste de Haití). La única excepción es la Tortuga, a 25 km
 * del borde norte: ahí la rampa llega al 97 %, un paso de color.
 *
 * La isla va entera a todos los niveles. Se probó a hornear sólo República
 * Dominicana en z10 y z11, por peso: sale mal por dos lados. Un encuadre de
 * closeup se sale del país por arriba y por el oeste, y cada tesela que falta
 * es un 404 (y un hueco); y en Bahía de las Águilas o en el lago Enriquillo,
 * Haití entra en cuadro, así que la mitad oeste de la imagen quedaría plana al
 * lado de la sombreada.
 */
export const RELIEVE_BOUNDS: [number, number, number, number] = [-74.95, 17.15, -67.85, 20.3];

// ─── La paleta ───────────────────────────────────────────────────────────────
//
// Cálida y desaturada (S ≤ 40 %) a propósito: el crema del cromo, el coral de
// las acciones y los chips de clima se apoyan encima sin pelear con el mapa,
// que era el "nada combina con nada".
//
// El horneado importa esta misma constante, así que la paleta del WebP y la del
// runtime no pueden separarse.

export type Paleta = {
  /** Metros de altura a color, de la costa a la cumbre. */
  suelo: [number, string][];
  /** Kilómetros a la costa más cercana a color, de la orilla al mar abierto.
   *  La última parada es también el color del mar fuera de la caja. */
  mar: [number, string][];
  /** Lagos y ríos: el DEM no distingue un embalse de una ladera, así que los
   *  sigue pintando el polígono de agua del basemap, plano y en el azul de la
   *  orilla. */
  lagos: string;
  /** La tierra sin tesela. Es EXACTAMENTE el color de la cota cero: una tesela
   *  de relieve que aún no llegó se lee como tierra sin sombra, nunca como un
   *  hueco. */
  fondo: string;
};

export const PALETA: Paleta = {
  // Del 0 a los 200 m la claridad baja tres puntos, no ocho. Con la cota cero
  // en el tono más claro de la isla (más claro que el mar y que el llano), la
  // costa entera se dibujaba con un reborde pálido de anchura constante: un
  // rim light, no una playa.
  suelo: [
    [0, "#CFDDB4"],
    [200, "#C3D5A6"],
    [600, "#A3BF88"],
    [1100, "#91A66E"],
    [1700, "#B0A878"],
    [2400, "#B89D7A"],
    [3100, "#F0E8DB"],
  ],
  // El mar aclara con la distancia a la costa, no con la profundidad. Un solo
  // tono (H 201°) y saturación quieta entre 31 y 32 %: lo que se mueve es la
  // claridad, de 44 % en la orilla a 77 % en mar abierto. Azul y no turquesa,
  // porque el mint de la marca (#25CCB8) es un acento y el mar no puede
  // competir con él ni con los chips de clima.
  //
  // Las cuatro paradas se reparten el cambio a partes casi iguales, pero cada
  // tramo es más ancho que el anterior: el color corre más rápido pegado a la
  // costa, que es como se comporta una plataforma de verdad, sin llegar a ser
  // un trazo. La primera versión metía dos tercios del cambio en 6 km y a la
  // vista de la isla entera eso no era una plataforma, era un contorno.
  //
  // Los 30 km del final no son una cifra de gusto: es el ancho real de la
  // plataforma insular alrededor de la isla, que es lo que la batimetría habría
  // dibujado si su malla no fuera de medio kilómetro.
  mar: [
    [0, "#5B87A0"],
    [3, "#6B94AB"],
    [8, "#84A6B9"],
    [16, "#9DBACB"],
    [30, "#B3CBD8"],
  ],
  lagos: "#6B94AB",
  fondo: "#CFDDB4",
};

/** El océano y la tierra sin luces de la imagen de noche (`lib/mundo`). Por
 *  debajo de z5 el mapa se pinta con ellos, así que la esfera del hero nace de
 *  noche y la imagen aterriza encima sin que se note. */
const NOCHE_MAR = "#00011C";
const NOCHE_TIERRA = "#0B1222";

/** Zoom donde los colores de noche ya cedieron del todo a los del sitio. Las
 *  dos únicas escenas por debajo de z5 son los dos globos. */
const DIA_DESDE = 5.5;

/**
 * Debajo de qué capa va el relieve: la primera que Positron dibuja DESPUÉS del
 * agua.
 *
 * El relieve va encima del polígono de agua y debajo de todo lo demás. Encima,
 * porque la tesela ya trae el mar horneado y el polígono lo taparía con un azul
 * plano; debajo del resto, porque el relieve es el suelo y las carreteras, la
 * mancha urbana, la frontera y los nombres tienen que dibujar sobre él.
 *
 * Que el polígono de agua siga ahí, tapado, no es un descuido: es lo único que
 * pinta el mar fuera de la caja del relieve y en los dos globos, donde no hay
 * tesela ninguna.
 */
export function capaDeReferencia(map: Pick<maplibregl.Map, "getStyle">): string | undefined {
  const capas = map.getStyle()?.layers ?? [];
  let ultimaDeAgua = -1;
  for (let i = 0; i < capas.length; i++) {
    const capa = capas[i];
    if (capa.type === "fill" && "source-layer" in capa && capa["source-layer"] === "water") {
      ultimaDeAgua = i;
    }
  }
  if (ultimaDeAgua >= 0) return capas[ultimaDeAgua + 1]?.id;
  // Sin agua en el estilo, la posición equivalente es justo encima del fondo.
  return capas.find((c) => c.type !== "background")?.id;
}

type MapaConRelieve = Pick<
  maplibregl.Map,
  "getStyle" | "getSource" | "addSource" | "addLayer" | "getLayer" | "setPaintProperty"
>;

/**
 * Añade la fuente y la capa del relieve, devuelve los lagos a la superficie y
 * deja el fondo y el agua del basemap en los colores que la acompañan.
 * Devuelve `false` si ya estaban.
 */
export function ponerRelieve(map: MapaConRelieve, paleta: Paleta = PALETA): boolean {
  if (map.getSource(RELIEVE_FUENTE)) return false;

  const marAbierto = paleta.mar[paleta.mar.length - 1][1];

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

  const referencia = capaDeReferencia(map);

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
    referencia
  );

  // Los lagos, por encima del relieve.
  //
  // El mar lo trae la tesela, pero el DEM sólo sabe de cotas: el lago Enriquillo
  // está bajo el nivel del mar y sale horneado como agua, mientras que la presa
  // de Tavera, a 300 m, sale como ladera. Así que el agua interior la siguen
  // dibujando los polígonos del basemap, que sí saben cuál es cuál, en el azul
  // de la orilla — que es el que le toca a un agua rodeada de tierra.
  //
  // Sólo desde `RELIEVE_MINZOOM`: por debajo no hay relieve que tapar, y ahí el
  // polígono de agua entero es el océano de los dos globos.
  const capaDeAgua = (map.getStyle()?.layers ?? []).find((c) => c.id === "water");
  if (capaDeAgua && "source" in capaDeAgua && capaDeAgua.source) {
    map.addLayer(
      {
        id: LAGOS_CAPA,
        type: "fill",
        source: capaDeAgua.source,
        "source-layer": "water",
        minzoom: RELIEVE_MINZOOM,
        filter: ["!=", ["get", "class"], "ocean"],
        paint: { "fill-color": paleta.lagos, "fill-antialias": true },
      },
      referencia
    );
  }

  // El planeta nace de noche, no pálido.
  //
  // Entre que el mapa arranca y que la imagen del cielo llega hay un hueco, y
  // en ese hueco se veía el globo con los colores de Positron: océano mint
  // claro y tierra casi blanca. El arreglo no es cargar antes (que también), es
  // que el color de partida sea el correcto.
  if (map.getLayer("background")) {
    map.setPaintProperty("background", "background-color", [
      "interpolate",
      ["linear"],
      ["zoom"],
      RELIEVE_MINZOOM,
      NOCHE_TIERRA,
      DIA_DESDE,
      paleta.fondo,
    ]);
  }
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", [
      "interpolate",
      ["linear"],
      ["zoom"],
      RELIEVE_MINZOOM,
      NOCHE_MAR,
      DIA_DESDE,
      marAbierto,
    ]);
    map.setPaintProperty("water", "fill-opacity", 1);
  }
  return true;
}
