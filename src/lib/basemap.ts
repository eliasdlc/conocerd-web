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
