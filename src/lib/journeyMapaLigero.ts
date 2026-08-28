// ─────────────────────────────────────────────────────────────────────────────
//  PROTOTIPO, recorte del estilo del mapa.
//
//  El estilo Positron de Carto trae 93 capas: 56 líneas y 27 símbolos. En el
//  rango de zoom del recorrido (2,2 a 11,5) buena parte no aporta nada y sí
//  cuesta: cada capa se tesela y se dibuja por tile.
//
//  Medido con la cámara recorriendo el tramo entre dos destinos, apagar líneas
//  y símbolos bajó el render un 39 %. Aquí eso se hace con criterio en vez de
//  a bulto, para no perder lo que da carácter al mapa.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";

export type NivelEstilo = "completo" | "medio" | "minimo";

/**
 * Capas que no se ven, o que se ven como duplicado de otra, dentro del rango de
 * zoom del recorrido.
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

/** Lo único que sobrevive en `minimo`: la silueta del país y su contorno. */
const SILUETA = [/^background$/, /^boundary_/, /^admin/];

function esRuido(id: string) {
  return RUIDO.some((r) => r.test(id));
}

function esSilueta(id: string, tipo: string) {
  return tipo === "background" || tipo === "fill" || SILUETA.some((r) => r.test(id));
}

/**
 * Apaga capas sobre un mapa ya cargado. `visibility: none` es suficiente:
 * MapLibre no tesela ni dibuja una capa oculta, así que el ahorro es el mismo
 * que si no estuviera en el estilo.
 *
 * Devuelve cuántas apagó, para poder verificar desde fuera que hizo algo.
 */
export function aligerarEstilo(map: maplibregl.Map, nivel: NivelEstilo): number {
  if (nivel === "completo") return 0;

  const capas = map.getStyle().layers ?? [];
  let apagadas = 0;

  for (const capa of capas) {
    const fuera =
      nivel === "minimo" ? !esSilueta(capa.id, capa.type) : esRuido(capa.id);
    if (!fuera) continue;
    try {
      map.setLayoutProperty(capa.id, "visibility", "none");
      apagadas++;
    } catch {
      // Una capa que el estilo ya no expone no es motivo para tumbar el mapa.
    }
  }
  return apagadas;
}

export type NivelProyeccion = "globe" | "auto" | "mercator";

/**
 * El globo sólo se aprecia en el hero, donde la cámara está a z2,2. Desde el
 * primer destino (z9 en adelante) es indistinguible de mercator, y ahí cuesta:
 * medido, mercator baja el render un 26 % en destinos y un 41 % en el hero.
 *
 * `auto` se queda con las dos cosas: globo mientras se ve como globo, mercator
 * en cuanto deja de notarse. MapLibre hace esa transición por su cuenta, pero a
 * partir de z12, y el recorrido termina en z11,5, es decir que nunca llega. La
 * expresión la adelanta a z7.
 */
export function proyeccionPara(nivel: NivelProyeccion): maplibregl.ProjectionSpecification {
  if (nivel === "mercator") return { type: "mercator" };
  if (nivel === "globe") return { type: "globe" };
  return {
    type: ["interpolate", ["linear"], ["zoom"], 4, "vertical-perspective", 7, "mercator"],
  };
}

// ─── Etiquetas: sólo las de aquí ─────────────────────────────────────────────

/**
 * Caja de República Dominicana, con holgura. Sirve de filtro espacial para las
 * etiquetas: lo que cae fuera no se dibuja.
 */
const CAJA_RD = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-72.2, 17.3],
      [-68.1, 17.3],
      [-68.1, 20.2],
      [-72.2, 20.2],
      [-72.2, 17.3],
    ],
  ],
};

/**
 * Deja en el mapa únicamente los topónimos de República Dominicana.
 *
 * En el globo del hero se leen CANADA, MEXICO, BRAZIL y otros veinte nombres
 * que no son de lo que va este sitio, y en el vuelo aparecen ciudades de Haití
 * y de Cuba. El filtro `within` los descarta por geometría, así que no hace
 * falta enumerar países ni depender de que cada capa traiga `iso_a2`.
 *
 * Los nombres de mares y océanos NO entran aquí: no son países, y "Caribbean
 * Sea" sí sitúa al visitante.
 *
 * Devuelve cuántas capas quedaron acotadas.
 */
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
 * En el globo del hero se leen CANADA, MEXICO, BRAZIL y otros veinte nombres
 * que no tienen que ver con este sitio, y durante el vuelo aparecen pueblos de
 * Haití y de Cuba. El filtro `within` los descarta por geometría, así que no
 * hay que enumerar países ni depender de que cada capa traiga `iso_a2`.
 *
 * Los nombres de mares y océanos NO entran aquí: no son países, y "Caribbean
 * Sea" sí sitúa al visitante.
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
      const dentro = ["within", CAJA_RD];
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
