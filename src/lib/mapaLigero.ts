// ─────────────────────────────────────────────────────────────────────────────
//  Tres recortes al basemap de Carto. Todos con la misma justificación: el
//  recorrido no es un mapa de consulta, es una narración sobre República
//  Dominicana, y el estilo Positron trae 93 capas y los topónimos del
//  continente entero pensados para otra cosa.
//
//  La escena de Negocios pedía 246 llamadas de dibujo por frame contra las 26
//  del hero, y en las corridas en dispositivo real era la más lenta de todas
//  cargando cero o una tesela: no era el mapa descargando, era el mapa
//  dibujando. Firefox se quedaba entre 10 y 18 fps en once de trece escenas
//  donde Chrome hacía 60 (auditoría del mapa, 28 ago 2026, secciones 08 y 09).
//
//  Las tres palancas y lo que midió cada una, en escritorio 1536×864, sobre el
//  render de un destino:
//
//    topónimos sólo de RD   88,5 → 59,0 ms   −33 %
//    estilo medio           −39 % de render
//    proyección auto        sin diferencia visible desde z9
//
//  Salen del prototipo `proto/journey-desktop-motores`, donde vivían detrás de
//  banderas de URL. Aquí no hay banderas: son el comportamiento por defecto.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";

// ─── 1. Capas que no aportan al recorrido ────────────────────────────────────

/**
 * Capas que no se ven, o que se ven como duplicado de otra, dentro del rango de
 * zoom del recorrido (2,2 a 11,5).
 *
 * Túneles y puentes son el grueso: a z10-11 dibujan los MISMOS segmentos que la
 * carretera que tienen debajo, sólo que con otro trazo. Quitarlos hace que un
 * puente se lea como carretera normal, que a esa escala es lo que parece de
 * todas formas. Tren, aeropuertos, caminos de servicio y ríos no participan de
 * la narrativa del recorrido.
 *
 * NO entra aquí nada que ubique al visitante: autopistas, troncales, primarias
 * y secundarias se quedan, y los nombres de ciudades y pueblos también.
 */
const RUIDO = [
  /^tunnel_/,
  /^bridge_/,
  /^rail/,
  /^aeroway-/,
  /^road_service_/,
  /^road_minor_/,
  /^road_path$/,
  /^waterway/,
];

/**
 * Apaga esas capas sobre un mapa ya cargado. `visibility: none` basta:
 * MapLibre no tesela ni dibuja una capa oculta, así que el ahorro es el mismo
 * que si no estuviera en el estilo.
 *
 * Devuelve cuántas apagó, para poder verificar desde fuera que hizo algo.
 */
export function aligerarEstilo(map: maplibregl.Map): number {
  let apagadas = 0;
  for (const capa of map.getStyle().layers ?? []) {
    if (!RUIDO.some((r) => r.test(capa.id))) continue;
    try {
      map.setLayoutProperty(capa.id, "visibility", "none");
      apagadas++;
    } catch {
      // Una capa que el estilo ya no expone no es motivo para tumbar el mapa.
    }
  }
  return apagadas;
}

// ─── 2. Proyección ───────────────────────────────────────────────────────────

/**
 * Globo mientras se ve como globo, mercator en cuanto deja de notarse.
 *
 * El globo sólo se aprecia en el hero, donde la cámara está a z1,15 en móvil y
 * z2,5 en escritorio. Desde el primer destino (z9 en adelante) es
 * indistinguible de mercator, y ahí cuesta. MapLibre hace esta transición por
 * su cuenta, pero a partir de z12, y el recorrido termina en z11,5: nunca
 * llega. La expresión la adelanta a z7.
 */
export const PROYECCION_DEL_RECORRIDO = {
  type: ["interpolate", ["linear"], ["zoom"], 4, "vertical-perspective", 7, "mercator"],
} as unknown as maplibregl.ProjectionSpecification;

// ─── 3. Topónimos ────────────────────────────────────────────────────────────

/**
 * República Dominicana, con la frontera de verdad por el oeste y holgura sobre
 * el mar por los otros tres lados.
 *
 * Una caja rectangular no sirve: la isla es compartida y el rectángulo que
 * contiene RD contiene también Ouanaminthe, Fort-Liberté y Hinche. Los seis
 * vértices del oeste siguen el trazado real de la frontera, y están puestos
 * contra las coordenadas que el propio mapa devuelve para cada topónimo, no de
 * memoria. Los pares que obligan a cada vértice:
 *
 *   Fort-Liberté −71,837 fuera  ·  Dajabón     −71,704 dentro   (lat 19,6)
 *   Hinche       −72,009 fuera  ·  Restauración −71,69 dentro   (lat 19,1)
 *   (frontera)                  ·  Comendador  −71,705 dentro   (lat 18,9)
 *   (frontera)                  ·  Jimaní      −71,851 dentro   (lat 18,5)
 *   (frontera)                  ·  Pedernales  −71,744 dentro   (lat 18,0)
 *
 * Por el este el borde cae en −68,20: deja dentro Punta Cana (−68,369) y fuera
 * Mayagüez (−67,139), que es Puerto Rico. Por el norte, 20,10 deja fuera Turks
 * & Caicos y Matthew Town.
 */
const CONTORNO_RD = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-71.78, 20.1],
      [-68.2, 20.1],
      [-68.2, 17.35],
      [-71.9, 17.35],
      [-71.86, 18.0],
      [-71.98, 18.5],
      [-71.8, 18.9],
      [-71.87, 19.15],
      [-71.78, 19.5],
      [-71.78, 20.1],
    ],
  ],
};

/**
 * Traduce un filtro en la sintaxis vieja de Mapbox a una expresión moderna.
 *
 * Hace falta porque las capas de Carto llegan con filtros del tipo
 * `["all", ["==", "class", "town"]]`, y MapLibre valida cada filtro entero en
 * una sintaxis o en la otra: meter un `within` dentro de un filtro viejo lo
 * rechaza con "expected one of [==, !=, ...], within found" y el mapa no
 * arranca. Convertido, las dos partes conviven.
 */
function aExpresión(f: unknown): unknown {
  if (!Array.isArray(f) || f.length === 0) return f;
  const [op, ...resto] = f as [string, ...unknown[]];
  const campo = (k: unknown) => (k === "$type" ? ["geometry-type"] : ["get", k]);

  switch (op) {
    case "all":
    case "any":
      return [op, ...resto.map(aExpresión)];
    case "none":
      return ["!", ["any", ...resto.map(aExpresión)]];
    case "has":
      return ["has", resto[0]];
    case "!has":
      return ["!", ["has", resto[0]]];
    case "in":
      return ["in", campo(resto[0]), ["literal", resto.slice(1)]];
    case "!in":
      return ["!", ["in", campo(resto[0]), ["literal", resto.slice(1)]]];
    case "==":
    case "!=":
    case ">":
    case ">=":
    case "<":
    case "<=":
      return [op, campo(resto[0]), resto[1]];
    default:
      // Ya era una expresión moderna.
      return f;
  }
}

/**
 * Deja en el mapa únicamente los topónimos de República Dominicana.
 *
 * En el globo del hero se leían CANADA, MEXICO, BRAZIL y otros veinte nombres
 * de países que no son de lo que va este sitio, y durante el vuelo aparecían
 * Puerto Príncipe, Cap-Haïtien, Hinche y Fort-Liberté. El filtro `within` los
 * descarta por geometría, así que no hay que enumerar países ni depender de que
 * cada capa traiga `iso_a2`.
 *
 * Los nombres de mares y océanos no entran en este filtro porque viven en otra
 * capa de origen (`water_name`) y no son países. Eso NO significa que se vean:
 * el globo del hero y el del cierre van sin un solo texto encima, y de eso se
 * encarga el corte por zoom de `applyBrandPaint`, que sube el mínimo de toda
 * capa de símbolo a z5. Aquí se dijo un tiempo que "Caribbean Sea" situaba al
 * visitante; se decidió que no, y el corte por zoom se lo lleva por delante
 * junto con lo demás.
 *
 * Devuelve cuántas capas quedaron acotadas.
 */
export function soloTopónimosDeRD(map: maplibregl.Map): number {
  const capas = (map.getStyle().layers ?? []).filter(
    (capa) => capa.type === "symbol" && "source-layer" in capa && capa["source-layer"] === "place"
  );

  let acotadas = 0;
  for (const capa of capas) {
    try {
      const previo = map.getFilter(capa.id);
      const dentro = ["within", CONTORNO_RD];
      const combinado = previo ? ["all", aExpresión(previo), dentro] : dentro;
      map.setFilter(capa.id, combinado as maplibregl.FilterSpecification);
      acotadas++;
    } catch (err) {
      // Una capa que el estilo ya no expone no es motivo para tumbar el mapa,
      // pero sí conviene enterarse de que el filtro no se aplicó.
      console.warn(`[mapa] no se pudo acotar ${capa.id}:`, err);
    }
  }
  return acotadas;
}
