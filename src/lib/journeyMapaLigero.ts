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
