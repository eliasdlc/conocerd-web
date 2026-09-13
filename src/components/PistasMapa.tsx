"use client";

import ReactDOM from "react-dom";
import { CARTO_HOSTS, CARTO_TILEJSON, MAP_STYLES } from "@/lib/basemap";

// ─────────────────────────────────────────────────────────────────────────────
//  Pistas de red para que el mapa no arranque desde cero.
//
//  El arranque del mapa es una cadena en la que cada eslabón espera al anterior:
//  hidratar → bajar el chunk de MapLibre → construir el mapa → pedir style.json
//  → pedir tiles.json → recién ahí la primera tesela. Medido en escritorio, el
//  constructor corre a los 623 ms y la primera tesela no se pide hasta los
//  929 ms: 306 ms en los que la red sólo está resolviendo qué pedir.
//
//  Las dos URL fijas de esa cadena se conocen desde el HTML, así que se piden
//  desde el principio y para cuando el mapa las necesita ya están en caché.
//  El `preconnect` cubre el handshake de los hosts cuyas URL sí dependen del
//  estilo (sprite, glyphs y teselas), que no se pueden precargar.
//
//  React sólo admite estos métodos desde un componente cliente, y los coloca en
//  el <head> del HTML servido.
//
//  Aquí NO se precargan teselas, y se probó: traerlas mientras la página
//  hidrata empeora el primer píxel del mapa de 2572 a 2995 ms con perfil de
//  teléfono, porque en 4G la conexión es el recurso escaso y esas descargas
//  retrasan los 269 KB del chunk de MapLibre. `priority: low` tampoco lo salva,
//  porque las teselas salen de otros hosts y la prioridad HTTP/2 sólo ordena
//  dentro de una misma conexión. Las teselas se calientan en
//  `lib/calentarRecorrido`, y sólo cuando el mapa ya terminó de pintar.
// ─────────────────────────────────────────────────────────────────────────────

export default function PistasMapa() {
  for (const host of CARTO_HOSTS) ReactDOM.preconnect(host, { crossOrigin: "anonymous" });
  // `as: "fetch"` y anónimo porque así los pide MapLibre: `fetch` sin
  // credenciales sobre otro origen. Si no coincidieran, el navegador guardaría
  // dos entradas y la precarga no serviría de nada.
  ReactDOM.preload(MAP_STYLES.light, { as: "fetch", crossOrigin: "anonymous" });
  ReactDOM.preload(CARTO_TILEJSON, { as: "fetch", crossOrigin: "anonymous" });
  return null;
}
