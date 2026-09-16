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
 * Capas que no se ven, que duplican a otra, o que dejaron de tener sentido
 * desde que el suelo lo pinta el relieve, dentro del rango de zoom del
 * recorrido (2,2 a 11,5).
 *
 * NO entra aquí nada que ubique al visitante: autopistas, troncales y primarias
 * se quedan (repintadas en `pintarCartografia`), y los nombres de ciudades y
 * pueblos también (acotados en `soloTopónimosDeRD`).
 */
const RUIDO = [
  // Túneles, puentes, tren, aeropuertos y caminos de servicio: a este zoom
  // dibujan lo mismo que la carretera de debajo, o no participan del relato.
  /^tunnel_/,
  /^bridge_/,
  /^rail/,
  /^aeroway-/,
  /^road_service_/,
  /^road_minor_/,
  /^road_path$/,
  /^waterway/,
  // Los contornos de carretera. Son la "línea blanca muy gorda": Positron
  // dibuja cada vía como relleno blanco sobre un casing gris de hasta 3 px, y
  // sobre el crema del basemap eso se lee como una carretera. Sobre el verde
  // del relieve se lee como una cicatriz.
  /_case(_ramp|_noramp)?$/,
  /_fill_ramp$/,
  /^road_sec_fill_noramp$/,
  // El suelo lo pone el relieve, no los polígonos de OSM: su cobertura es
  // parcial y el verde caía a manchas donde había datos.
  /^landcover$/,
  /^landuse$/,
  /^park_/,
  /^building/,
  // La banda rosa de 8 px a lo largo de la frontera con Haití.
  /^boundary_country_outline$/,
  // Las divisiones políticas internas del basemap, las dos.
  //
  // `boundary_state` sí trae las provincias dominicanas (admin_level 4), y por
  // eso se sondeó antes de publicar nada: valdría gratis. No sirve, y el
  // motivo no es la geometría. A los zooms del recorrido, OpenMapTiles suelda
  // las líneas en un puñado de MultiLineString larguísimos que cruzan la isla
  // entera: a z7,3 el viewport completo son SEIS rasgos, y uno solo trae 2.284
  // puntos con 535 en Haití. Un filtro `within` acepta o rechaza el rasgo
  // entero, así que se lleva por delante las provincias de RD junto con los
  // diez departamentos haitianos. Los campos que separarían un país del otro
  // (`adm0_l`, `adm0_r`) existen en el esquema y vienen SIN valor en toda La
  // Española. Así que las divisiones se dibujan de nuestro propio GeoJSON, que
  // además es el dato oficial de la ONE y no el admin_level de OSM.
  /^boundary_state$/,
  // Los municipios, que además son 158 y a este zoom convierten la isla en una
  // malla.
  /^boundary_county$/,
  // El mismo polígono de agua dibujado otra vez, desplazado, para simular una
  // sombra de costa: con el agua opaca no aporta un píxel.
  /^water_shadow$/,
  // Nombres que no son de sitios: mares, calles, números y puntos de interés.
  /^watername_/,
  /^roadname_/,
  /^housenumber$/,
  /^poi_/,
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

/** La tinta de la marca (`--color-ink`). Aquí en literal porque MapLibre no
 *  resuelve `var()`: el estilo del mapa no es CSS. */
const TINTA = "#0F1A2E";
/** `--color-ink-3`: el azul de segundo plano del sistema. */
const TEXTO = "#3B5073";
/** `--color-cream`: el halo, opaco, para que el nombre se lea sobre la ladera
 *  más oscura sin encender un rectángulo blanco. */
const HALO = "#FDF8F0";

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


// ─── 3. Carreteras, frontera y mancha urbana ─────────────────────────────────

/**
 * Lo poco que queda de la cartografía de Positron, repintado para que se lea
 * COMO un mapa y no como una capa encima de otro mapa.
 *
 * Las carreteras de Positron son blancas con un contorno gris claro: están
 * pensadas para leerse sobre un fondo casi blanco. Sobre el verde del relieve,
 * ese blanco es lo más brillante de la pantalla y la vía pasa de dato a
 * cicatriz. Aquí pasan a ser trazos de lápiz: tinta a baja opacidad y un píxel
 * de grosor, que es lo que un mapa de papel haría.
 *
 * Por debajo de z10 no queda una sola carretera. La isla entera no las
 * necesita: lo que hay que seguir ahí es la ruta que dibuja el itinerario.
 */
export function pintarCartografia(map: maplibregl.Map): void {
  const trazo = (id: string, opacidad: number, finoEn: number, gruesoEn: number) => {
    if (!map.getLayer(id)) return;
    map.setPaintProperty(id, "line-color", TINTA);
    map.setPaintProperty(id, "line-opacity", opacidad);
    map.setPaintProperty(id, "line-width", [
      "interpolate",
      ["linear"],
      ["zoom"],
      10,
      finoEn,
      11.5,
      gruesoEn,
    ]);
  };

  trazo("road_mot_fill_noramp", 0.3, 0.8, 1.4);
  trazo("road_trunk_fill_noramp", 0.3, 0.8, 1.4);
  trazo("road_pri_fill_noramp", 0.22, 0.5, 1);

  // La frontera con Haití. Discontinua y en tinta: es la única línea política
  // que el recorrido necesita, y a trazos no compite con la costa.
  if (map.getLayer("boundary_country_inner")) {
    map.setPaintProperty("boundary_country_inner", "line-color", TINTA);
    map.setPaintProperty("boundary_country_inner", "line-opacity", 0.35);
    map.setPaintProperty("boundary_country_inner", "line-width", [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      1,
      11,
      1.5,
    ]);
    map.setPaintProperty("boundary_country_inner", "line-dasharray", [3, 2]);
  }

  // Las ciudades, como mancha tenue de tinta sobre el relieve. Es lo único que
  // queda de `landuse`: dice dónde vive la gente sin dibujar una sola manzana.
  if (map.getLayer("landuse_residential")) {
    map.setPaintProperty("landuse_residential", "fill-color", TINTA);
    map.setPaintProperty("landuse_residential", "fill-opacity", [
      "interpolate",
      ["linear"],
      ["zoom"],
      6,
      0.05,
      11,
      0.09,
    ]);
  }
}

// ─── 4. Topónimos ────────────────────────────────────────────────────────────

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
 *
 * Tiene que ser IDEMPOTENTE, y no lo era. `applyBrandPaint` se llama dos veces
 * a propósito (en `onStyle`, para que el planeta nazca del color bueno, y otra
 * vez en `onLoad`), así que la segunda pasada recibía un filtro ya convertido y
 * lo volvía a convertir: el nombre del campo, que ya era `["get","class"]`, se
 * envolvía en otro `get` y quedaba `["get",["get","class"]]`. Eso evalúa a null
 * siempre, así que el filtro no daba verdadero para ningún rasgo y NINGÚN
 * nombre de ciudad ni de pueblo se dibujaba en todo el sitio, a ningún zoom.
 * Medido: a z11, 20 ciudades y 150 pueblos en la fuente, 0 dibujados.
 *
 * La marca que distingue las dos sintaxis es el primer argumento: en la vieja
 * es el NOMBRE del campo (una cadena), en la moderna ya es la expresión que lo
 * lee (un array). Con eso basta para no tocar lo ya convertido.
 */
function aExpresión(f: unknown): unknown {
  if (!Array.isArray(f) || f.length === 0) return f;
  const [op, ...resto] = f as [string, ...unknown[]];
  const campo = (k: unknown) => (k === "$type" ? ["geometry-type"] : ["get", k]);
  /** Ya convertido: el campo dejó de ser una cadena y es la expresión que lo lee. */
  const yaEsExpresión = typeof resto[0] !== "string";

  switch (op) {
    case "all":
    case "any":
      return [op, ...resto.map(aExpresión)];
    case "none":
      return ["!", ["any", ...resto.map(aExpresión)]];
    // `["has", "campo"]` se escribe igual en las dos sintaxis: no hay nada que
    // convertir y por tanto nada que romper al pasar dos veces.
    case "has":
      return ["has", resto[0]];
    case "!has":
      return ["!", ["has", resto[0]]];
    case "in":
      return yaEsExpresión ? f : ["in", campo(resto[0]), ["literal", resto.slice(1)]];
    case "!in":
      return yaEsExpresión ? f : ["!", ["in", campo(resto[0]), ["literal", resto.slice(1)]]];
    case "==":
    case "!=":
    case ">":
    case ">=":
    case "<":
    case "<=":
      return yaEsExpresión ? f : [op, campo(resto[0]), resto[1]];
    default:
      // Ya era una expresión moderna.
      return f;
  }
}

/**
 * Los nombres que sobreviven, con el zoom a partir del cual aparecen y su
 * tamaño. Todo lo demás de la capa `place` se apaga.
 *
 * El criterio: en la isla entera no va un solo nombre. Los pines y las cartas
 * dicen dónde están las cosas, y el logo dice de qué país va esto; encima, lo
 * que Positron ponía ahí era "DOMINICAN REPUBLIC" en inglés, en gris y en
 * versalitas atravesando el país, con los nombres de provincia chocando contra
 * los pines. Los nombres reaparecen en los closeups, que es donde ubican de
 * verdad.
 */
const TOPÓNIMOS: Record<string, { desde: number; tamaño: [number, number] }> = {
  place_city_r5: { desde: 9.5, tamaño: [12, 14] },
  place_city_r6: { desde: 9.5, tamaño: [12, 14] },
  place_town: { desde: 10, tamaño: [11, 12.5] },
};

/**
 * Apaga toda la toponimia salvo ciudades y pueblos, los acota a República
 * Dominicana y los repinta.
 *
 * El repintado no es cosmético. Positron los dibuja en versalitas grises con
 * halo blanco al 50 %, y usa `{name_en}` por debajo de z13: sobre el relieve
 * eso era gris sobre verde, ilegible, gritado y en inglés. Ahora van en el azul
 * de segundo plano del sistema, con halo crema opaco y el nombre en español.
 *
 * El filtro `within` descarta por geometría, así que no hay que enumerar países
 * ni depender de que cada capa traiga `iso_a2`: durante el vuelo aparecían
 * Puerto Príncipe, Cap-Haïtien, Hinche y Fort-Liberté.
 *
 * Devuelve cuántas capas quedaron acotadas.
 */
export function soloTopónimosDeRD(map: maplibregl.Map): number {
  const capas = (map.getStyle().layers ?? []).filter(
    (capa) => capa.type === "symbol" && "source-layer" in capa && capa["source-layer"] === "place"
  );

  let acotadas = 0;
  for (const capa of capas) {
    const vivo = TOPÓNIMOS[capa.id];
    try {
      if (!vivo) {
        map.setLayoutProperty(capa.id, "visibility", "none");
        continue;
      }

      const previo = map.getFilter(capa.id);
      const dentro = ["within", CONTORNO_RD];
      const combinado = previo ? ["all", aExpresión(previo), dentro] : dentro;
      map.setFilter(capa.id, combinado as maplibregl.FilterSpecification);
      map.setLayerZoomRange(capa.id, vivo.desde, capa.maxzoom ?? 24);

      // `name` y no `{name_en}`: el nombre del sitio en su idioma. El coalesce
      // es para el puñado de sitios que sólo traen el inglés.
      map.setLayoutProperty(capa.id, "text-field", [
        "coalesce",
        ["get", "name"],
        ["get", "name_en"],
      ]);
      map.setLayoutProperty(capa.id, "text-transform", "none");
      map.setLayoutProperty(capa.id, "text-letter-spacing", 0);
      map.setLayoutProperty(capa.id, "text-size", [
        "interpolate",
        ["linear"],
        ["zoom"],
        vivo.desde,
        vivo.tamaño[0],
        11.5,
        vivo.tamaño[1],
      ]);
      map.setPaintProperty(capa.id, "text-color", TEXTO);
      map.setPaintProperty(capa.id, "text-halo-color", HALO);
      map.setPaintProperty(capa.id, "text-halo-width", 1.5);
      map.setPaintProperty(capa.id, "text-halo-blur", 0.5);
      acotadas++;
    } catch (err) {
      // Una capa que el estilo ya no expone no es motivo para tumbar el mapa,
      // pero sí conviene enterarse de que no se aplicó.
      console.warn(`[mapa] no se pudo acotar ${capa.id}:`, err);
    }
  }
  return acotadas;
}

// ─── 5. Provincias ───────────────────────────────────────────────────────────

/** Una fuente para las dos capas: la división y el nombre salen del mismo
 *  archivo y se separan por la propiedad `tipo`. */
export const PROVINCIAS_FUENTE = "provincias";
/** Un rehorneado sube de versión, como el relieve y el mundo: el archivo se
 *  sirve inmutable (next.config.ts) y así la petición se paga UNA vez en la
 *  vida del visitante, no una por visita. */
export const PROVINCIAS_VERSION = "v1";
export const PROVINCIAS_DATOS = `/data/provincias/${PROVINCIAS_VERSION}.json`;
export const PROVINCIAS_DIVISION = "provincias-division";
export const PROVINCIAS_NOMBRES = "provincias-nombres";

/**
 * La división provincial y sus nombres, del dato oficial de la ONE.
 *
 * Se sondeó antes el basemap, porque habría salido gratis, y no sirve: el
 * porqué está escrito arriba, en `RUIDO`, junto a `boundary_state`. El resumen
 * es que Carto SÍ trae la geometría de las provincias dominicanas pero soldada
 * a la de Haití en los mismos rasgos, sin campo que las separe, y que no trae
 * los nombres en absoluto.
 *
 * Así que una petición: `public/data/provincias.json`, 21,3 KB comprimidos,
 * cacheada, con las 32 polilíneas internas y los 32 puntos de rótulo. Sólo las
 * aristas que separan DOS provincias; la costa no se redibuja porque ya la
 * dibuja el mar horneado del relieve.
 *
 * El reparto por zoom es el de la decisión 2C: la provincia manda hasta z9 y la
 * ciudad toma el relevo en z9,5 (`TOPÓNIMOS`). Se apagan las dos cosas, línea y
 * nombre, porque las dos son el mismo registro: en un closeup de un destino la
 * frontera provincial no ubica, compite con la ruta.
 */
export function pintarProvincias(map: maplibregl.Map): boolean {
  if (map.getSource(PROVINCIAS_FUENTE)) return false;

  map.addSource(PROVINCIAS_FUENTE, {
    type: "geojson",
    data: PROVINCIAS_DATOS,
    attribution:
      "Provincias: Oficina Nacional de Estadística (ONE) vía geoBoundaries, CC BY 3.0 IGO",
  });

  // ── La división ────────────────────────────────────────────────────────────
  //
  // Continua y en tinta floja, contra la frontera con Haití, que es a trazos y
  // al doble de opacidad (`pintarCartografia`). Las dos líneas políticas del
  // mapa se distinguen por patrón antes que por peso: un país no es una
  // provincia más gorda.
  map.addLayer({
    id: PROVINCIAS_DIVISION,
    type: "line",
    source: PROVINCIAS_FUENTE,
    filter: ["==", ["get", "tipo"], "linea"],
    minzoom: 4.7,
    maxzoom: 9.8,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": TINTA,
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 4.7, 0, 5.4, 0.18, 9, 0.18, 9.7, 0],
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.6, 9.7, 1],
    },
  });

  // ── Los nombres ────────────────────────────────────────────────────────────
  map.addLayer({
    id: PROVINCIAS_NOMBRES,
    type: "symbol",
    source: PROVINCIAS_FUENTE,
    filter: ["==", ["get", "tipo"], "nombre"],
    minzoom: 4.7,
    maxzoom: 9.8,
    layout: {
      "text-field": ["get", "nombre"],
      // El mismo juego de glifos que ya piden las ciudades de Positron. Pedir
      // otro peso costaría una petición más al servidor de glifos de Carto, y
      // el número de esta fase es que el peso añadido sea una sola.
      "text-font": ["Montserrat Medium", "Open Sans Bold", "Noto Sans Regular"],
      // Versalitas espaciadas: es la convención de atlas para una división
      // administrativa, y es lo que distingue la provincia de la ciudad sin
      // gastar un segundo color. Las ciudades van justo al revés desde que
      // `soloTopónimosDeRD` les quitó el `uppercase` que traía Carto.
      "text-transform": "uppercase",
      "text-letter-spacing": 0.09,
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 9.5, 7, 11, 9.5, 12.5],
      "text-max-width": 7,
      "text-padding": 6,
      "text-line-height": 1.15,
      // `orden` es el índice por superficie, de mayor a menor, y aquí es la
      // prioridad de colisión: MapLibre esconde el nombre que se pisa con otro
      // de `symbol-sort-key` más bajo. Eso es lo que descongestiona el Cibao y
      // lo que mantiene el Distrito Nacional escondido detrás de Santo Domingo
      // hasta que hay sitio de verdad, sin una escalera de zoom escrita a mano:
      // una escalera fija no sabe del ancho de la pantalla ni del pitch, y la
      // colisión sí.
      "symbol-sort-key": ["get", "orden"],
    },
    paint: {
      // El tratamiento de `soloTopónimosDeRD`, que es el que aguanta sobre el
      // relieve: azul de segundo plano y halo crema OPACO. El gris con halo
      // blanco al 50 % de Positron sobre el verde no se lee.
      "text-color": TEXTO,
      "text-halo-color": HALO,
      "text-halo-width": 1.4,
      "text-halo-blur": 0.4,
      "text-opacity": ["interpolate", ["linear"], ["zoom"], 4.7, 0, 5.3, 1, 9, 1, 9.7, 0],
    },
  });

  return true;
}
