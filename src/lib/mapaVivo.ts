// ─────────────────────────────────────────────────────────────────────────────
//  Cuándo el mapa sigue existiendo.
//
//  MapLibre 5, al perder el contexto WebGL, destruye el pintor y pone su estilo
//  a `null` (`_contextLost` en maplibre-gl). A partir de ahí CUALQUIER llamada
//  que pase por el estilo (`getLayer`, `getStyle`, `setPaintProperty`) revienta
//  con "Cannot read properties of null". Y sí ocurre: medido el 14 sep 2026 en
//  el recorrido, el contexto se pierde al pasar de Tu ruta a Viajeros, tanto en
//  esta rama como en producción.
//
//  Lo que eso costaba: las capas de la NASA se repintan una vez por frame desde
//  el progreso, así que el primer frame tras la pérdida lanzaba, el motor de
//  pasos se quedaba a medias y las cuatro últimas escenas del recorrido dejaban
//  de ser alcanzables. El contexto se restaura solo unos frames después
//  (MapLibre rehace el estilo entero con `setStyle`), así que lo único que
//  hacía falta era no lanzar mientras tanto.
//
//  Todo lo que toque el mapa fuera de un evento suyo (por frame, por escena,
//  desde un efecto) pregunta primero aquí.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";

export function mapaVivo(map: maplibregl.Map | null | undefined): map is maplibregl.Map {
  return Boolean(map && map.style);
}
