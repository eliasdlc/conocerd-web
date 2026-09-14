// ─────────────────────────────────────────────────────────────────────────────
//  El mapa base de Carto, en un solo sitio.
//
//  Lo consumen dos piezas que viven en grafos distintos y no pueden verse: el
//  motor (`components/map/engine`, dentro del chunk de MapLibre) y las pistas
//  de red del hero (`components/PistasMapa`, en el grafo inicial). Si cada una
//  escribiera su URL, un cambio en una dejaría la otra precargando un recurso
//  que ya nadie pide.
//
//  Este módulo no puede importar maplibre ni nada que lo arrastre: entra en el
//  bundle inicial de la home.
// ─────────────────────────────────────────────────────────────────────────────

import type { RasterDEMSourceSpecification } from "maplibre-gl";

export const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

/**
 * El TileJSON del source `carto`, que es el segundo salto en serie del arranque:
 * MapLibre no conoce esta URL hasta que baja y parsea `style.json`.
 *
 * Está aquí duplicada a propósito, para poder pedirla antes de tiempo. Es una
 * copia de un dato que vive dentro del estilo de Carto: si Carto la mueve, la
 * precarga se convierte en una petición desperdiciada de 11 KB y el mapa sigue
 * funcionando igual, porque MapLibre la resuelve por su cuenta desde el estilo.
 */
export const CARTO_TILEJSON =
  "https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json";

/**
 * Los hosts que el mapa toca antes de poder pintar. `basemaps` sirve el estilo,
 * `tiles` el TileJSON, el sprite y los glyphs, y `tiles-a..d` reparten las
 * teselas. Los seis comparten certificado wildcard y los cinco primeros
 * resuelven a la misma IP, así que el navegador coalesce buena parte de las
 * conexiones; aun así cada handshake nuevo mide del orden de 100 ms.
 */
export const CARTO_HOSTS = [
  "https://basemaps.cartocdn.com",
  "https://tiles.basemaps.cartocdn.com",
] as const;

// ─── Relieve ─────────────────────────────────────────────────────────────────
//
// El DEM de AWS Terrain Tiles (Mapzen, hoy en el registro de datos abiertos de
// AWS), en formato terrarium: gratis, sin clave, con CORS abierto. Cada tesela
// pesa entre 70 y 115 KB sobre la isla (medido el 13 sep 2026 a z9), así que:
//
//   · `maxzoom: 11`. A z9 los closeups (z10 a z11.5) salían borrosos: la
//     tesela se sobreescalaba hasta seis veces. A z11 un encuadre de teléfono
//     pide unas seis teselas (medido abajo, en el PR) y el relieve se lee
//     nítido; por encima de z11 MapLibre sobreescala como mucho 1,4 veces.
//   · `bounds` con la isla y una franja ancha de mar: el DEM trae también la
//     profundidad, y con ella el mar se colorea de la costa hacia fuera. La
//     franja cubre cualquier encuadre del recorrido para que nunca se vea el
//     borde donde el color se acaba.
//
// Sólo la spec, sin maplibre: este módulo entra en el bundle inicial. El tipo
// es un `import type`, que el compilador borra.
export const RELIEVE_DEM = {
  type: "raster-dem",
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  encoding: "terrarium",
  tileSize: 256,
  minzoom: 4,
  maxzoom: 11,
  bounds: [-73.6, 16.6, -67.0, 21.0],
  attribution:
    'Relieve: <a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a> (Mapzen, NASA SRTM, USGS, GEBCO)',
} satisfies RasterDEMSourceSpecification;

/** La misma atribución en texto plano, para el pie del sitio. */
export const RELIEVE_CREDITO = "Relieve: Terrain Tiles (Mapzen, NASA SRTM, USGS, GEBCO)";
export const MAPA_CREDITO = "Mapa: © CARTO, © OpenStreetMap contributors";
