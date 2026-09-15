// ─────────────────────────────────────────────────────────────────────────────
//  El mundo del hero: dos imágenes nuestras, no 187 teselas de la NASA.
//
//  Las capas del amanecer (luces de ciudad de noche, Tierra de día) venían de
//  GIBS como fuentes raster teseladas hasta el nivel 8. Medido el 14 sep 2026
//  en el recorrido completo: 189 peticiones en móvil y 176 en escritorio, con
//  mediana de 124 ms cada una (272 ms en perfil 4G), para dos capas que dejan
//  de dibujar antes del primer destino.
//
//  El coste no estaba en los bytes sino en los viajes: 176 idas y vueltas a un
//  servidor de la NASA justo mientras el navegador baja el JS del arranque, y
//  un tercero del que depende que el cielo del hero aparezca.
//
//  Ahora las dos capas se hornean una vez (scripts/hornear-mundo.mjs) y viajan
//  como una imagen cada una desde nuestro dominio, con la misma técnica que ya
//  usaban las nubes.
//
//  EL MUNDO ENTERO, y no sólo el hemisferio que se ve. La tentación es obvia
//  —la cámara del hero está fija sobre RD, así que Asia no se ve nunca— pero el
//  casquete visible de un globo no es un rango de longitudes: a 60° de latitud
//  ya se sale de un recorte de −170 a +30, y por encima de 80° se ven TODAS las
//  longitudes. Un recorte dejaría un hueco en el limbo norte, que es justo donde
//  el Ártico blanco se apoya sobre el borde del planeta.
// ─────────────────────────────────────────────────────────────────────────────

/** Carpeta de las imágenes horneadas. Un rehorneado sube de versión: se sirven
 *  inmutables y cacheadas para siempre (next.config.ts). */
export const MUNDO_VERSION = "v1";

export const MUNDO_NOCHE = `/mundo/${MUNDO_VERSION}/noche.webp`;
export const MUNDO_DIA = `/mundo/${MUNDO_VERSION}/dia.webp`;

/**
 * Las cuatro esquinas, en el orden que pide MapLibre (NO, NE, SE, SO).
 *
 * Es el mundo entero en Mercator, que es el cuadrado que va de −85,0511 a
 * +85,0511 de latitud. Las mismas que ya usan las nubes: las tres capas del
 * cielo comparten encuadre y por eso casan píxel con píxel.
 */
export const MUNDO_ESQUINAS: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [-180, 85.0511],
  [180, 85.0511],
  [180, -85.0511],
  [-180, -85.0511],
];

/**
 * Lado de la imagen horneada, en píxeles, y por qué ese número.
 *
 * MapLibre sube una fuente de imagen entera a la GPU, así que el lado no es
 * sólo peso de descarga: 3072² en RGBA son 37 MB de textura y 2048² son 17.
 * Con dos capas más las nubes, eso es la diferencia entre 79 MB y 38.
 *
 * El mundo en Mercator mide `512 · 2^zoom` px, así que una imagen de lado L es
 * exacta hasta `log2(L/512)`:
 *
 *   2048 → exacta hasta z2,00   ·  3072 → z2,58  ·  4096 → z3,00
 *
 * Y lo que pide cada capa, cruzando la curva de la cámara con las opacidades
 * del amanecer (lib/journey · easeInOutCubic, sin arco en ese tramo):
 *
 *   hero en reposo          z1,95 escritorio · z1,15 móvil
 *   la noche se apaga en    z2,56
 *   el día a plena opacidad z2,34 a z2,75
 *   el día se apaga en      z4,55 escritorio · z3,44 móvil
 *
 * De ahí el reparto: la noche a 2048 es exacta en reposo, que es donde se mira
 * de verdad, y se ablanda sólo mientras se desvanece. El día sube a 3072 porque
 * su momento de plena opacidad cae en z2,75, donde 2048 se quedaría en el 59 %.
 */
export const MUNDO_LADO = { noche: 2048, dia: 3072 } as const;

/** Créditos. Las imágenes son de la NASA aunque las sirvamos nosotros. */
export const MUNDO_CREDITO =
  "Cielo del hero: NASA GIBS (Black Marble VIIRS 2012, Blue Marble Next Generation)";
