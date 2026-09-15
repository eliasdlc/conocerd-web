// ─────────────────────────────────────────────────────────────────────────────
//  Hornea las provincias: de los polígonos de la ONE a un GeoJSON que el mapa
//  pueda montar tal cual.
//
//    pnpm provincias
//
//  Qué produce. `public/data/provincias/<version>.json`, una FeatureCollection con
//  las dos cosas que el mapa necesita, separadas por la propiedad `tipo`:
//
//    tipo: "linea"   las aristas INTERNAS, las que separan dos provincias
//    tipo: "nombre"  los 32 puntos donde va el rótulo
//
//  Una fuente y una petición para dos capas. La costa no entra: ya la dibuja
//  el mar horneado del relieve, y redibujarla encima es la raya que los dos
//  intentos anteriores de mar dejaron en el borde de cada tesela.
//
//  Por qué esto y no la capa de Carto. Se sondeó primero, porque habría salido
//  gratis. `boundary_state` del estilo SÍ trae las provincias dominicanas, con
//  geometría de sobra (1.127 vértices dentro de RD a z5, 11.877 a z9). Lo que
//  no trae es forma de quedarse sólo con ellas: a los zooms del recorrido
//  OpenMapTiles suelda las líneas en un puñado de MultiLineString que cruzan la
//  isla entera (a z7,3 el viewport son seis rasgos, uno con 2.284 puntos y 535
//  en Haití), `within` acepta o rechaza el rasgo completo, y los campos que
//  separarían los países (`adm0_l`, `adm0_r`) vienen sin valor en toda La
//  Española. Y `place` con `class=state` devuelve CERO rasgos dentro de RD en
//  todos los niveles de 4 a 10: no es el `rank<=4` del estilo, es que el rasgo
//  no existe (la misma sonda sobre Texas y Colombia devuelve decenas).
//
//  El punto del rótulo NO es el centroide. Es el polo de inaccesibilidad: el
//  centro del mayor círculo que cabe dentro del polígono. El centroide de
//  Samaná cae en la bahía; éste no.
// ─────────────────────────────────────────────────────────────────────────────

import { gzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import polylabel from "polylabel";
import { PROVINCIAS_VERSION } from "../src/lib/mapaLigero.ts";

const RAIZ = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(RAIZ, ".cache/provincias");
const ORIGEN =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbHumanitarian/DOM/ADM2/geoBoundaries-DOM-ADM2.geojson";
const SALIDA = path.join(RAIZ, "public/data/provincias", `${PROVINCIAS_VERSION}.json`);

/**
 * Rejilla de redondeo para decidir si dos vértices de provincias vecinas son el
 * MISMO vértice. 6 decimales son 11 cm: el dato de la ONE es topológico y los
 * bordes compartidos vienen con las mismas coordenadas, así que no hace falta
 * tolerancia, sólo quitar el ruido del float.
 */
const REJILLA = 1e6;
const nodo = ([x, y]) => `${Math.round(x * REJILLA)},${Math.round(y * REJILLA)}`;
const deNodo = (k) => k.split(",").map((n) => Number(n) / REJILLA);

/**
 * Tolerancia de simplificación, en grados, y precisión de salida a 4 decimales
 * (11 m), que es la que le corresponde.
 *
 * 0,0012° son unos 132 m. La división se apaga a z9,7 igual que el nombre, y a
 * ese zoom un píxel de pantalla mide 110 m: la desviación máxima queda en algo
 * más de un píxel justo donde la línea ya se está yendo, y muy por debajo de un
 * píxel en las tres escenas de mapa, que viven entre z4,96 y z7,6 (de 580 a
 * 190 m por píxel).
 *
 * Lo que fija el número por arriba es el gate de la fase: una petición por
 * debajo de 25 KB comprimidos. La curva medida, a 4 decimales:
 *
 *   0,0008°   28,6 KB     0,0012°   21,3 KB
 *   0,0010°   24,6 KB     0,0015°   18,1 KB
 */
const TOLERANCIA = 0.0012;

/** Baja el GeoJSON una vez y lo deja en `.cache`: son 7,6 MB que no entran al repo. */
async function fuente() {
  const local = path.join(CACHE, "geoBoundaries-DOM-ADM2.geojson");
  if (!existsSync(local)) {
    await mkdir(CACHE, { recursive: true });
    process.stdout.write(`bajando ${ORIGEN}\n`);
    const r = await fetch(ORIGEN);
    if (!r.ok) throw new Error(`geoBoundaries respondió ${r.status}`);
    await writeFile(local, Buffer.from(await r.arrayBuffer()));
  }
  return JSON.parse(await readFile(local, "utf8"));
}

/**
 * Área en km², proyectando a metros con la escala local de la latitud. Para
 * ORDENAR 32 provincias de un país de 400 km esa aproximación sobra; no se
 * publica como dato, sólo decide quién gana una colisión de etiquetas.
 */
function área(anillo) {
  const latMedia = (anillo.reduce((s, [, y]) => s + y, 0) / anillo.length) * (Math.PI / 180);
  const kx = 111.32 * Math.cos(latMedia);
  const ky = 110.57;
  let a = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    a += anillo[j][0] * kx * (anillo[i][1] * ky) - anillo[i][0] * kx * (anillo[j][1] * ky);
  }
  return Math.abs(a / 2);
}

const polígonosDe = (geom) => (geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates]);

/** El polígono de mayor área de un rasgo, que es el que lleva el nombre: Samaná
 *  y La Altagracia traen cayos sueltos que no deben quedarse la etiqueta. */
const mayorPolígono = (geom) =>
  polígonosDe(geom).reduce((mejor, p) => (área(p[0]) > área(mejor[0]) ? p : mejor));

/** Douglas-Peucker. */
function simplificar(pts, tol) {
  if (pts.length < 3) return pts;
  const dist2 = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) [x, y] = b;
      else if (t > 0) [x, y] = [x + dx * t, y + dy * t];
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const tol2 = tol * tol;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [ini, fin] = pila.pop();
    let peor = 0;
    let idx = -1;
    for (let i = ini + 1; i < fin; i++) {
      const d = dist2(pts[i], pts[ini], pts[fin]);
      if (d > peor) {
        peor = d;
        idx = i;
      }
    }
    if (idx > 0 && peor > tol2) {
      keep[idx] = 1;
      pila.push([ini, idx], [idx, fin]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const gj = await fuente();
if (gj.features.length !== 32) throw new Error(`esperaba 32 unidades, llegaron ${gj.features.length}`);

// ── 1. Aristas internas: el segmento que dos provincias comparten ────────────
//
// Cada arista del dataset se recorre dos veces si separa dos provincias y una
// sola si da al mar o a Haití. Contar es todo el algoritmo.
const veces = new Map();
for (const f of gj.features) {
  for (const poly of polígonosDe(f.geometry)) {
    for (const anillo of poly) {
      for (let i = 1; i < anillo.length; i++) {
        const a = nodo(anillo[i - 1]);
        const b = nodo(anillo[i]);
        if (a === b) continue;
        const k = a < b ? `${a}|${b}` : `${b}|${a}`;
        veces.set(k, (veces.get(k) ?? 0) + 1);
      }
    }
  }
}
const compartidas = [...veces].filter(([, n]) => n >= 2).map(([k]) => k.split("|"));
if (compartidas.length === 0) {
  throw new Error("cero aristas compartidas: los vértices de provincias vecinas no coinciden");
}

// ── 2. Encadenar los segmentos sueltos en polilíneas ─────────────────────────
const vecinos = new Map();
for (const [a, b] of compartidas) {
  if (!vecinos.has(a)) vecinos.set(a, []);
  if (!vecinos.has(b)) vecinos.set(b, []);
  vecinos.get(a).push(b);
  vecinos.get(b).push(a);
}
const usada = new Set();
const arista = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function caminar(inicio) {
  const cadena = [inicio];
  let actual = inicio;
  for (;;) {
    const siguiente = (vecinos.get(actual) ?? []).find((v) => !usada.has(arista(actual, v)));
    if (!siguiente) return cadena;
    usada.add(arista(actual, siguiente));
    cadena.push(siguiente);
    actual = siguiente;
  }
}

const cadenas = [];
// Primero desde las cruces y los extremos (grado distinto de 2): así cada tramo
// entre dos nudos sale entero en vez de partido por donde se empezó a andar.
for (const [n, vs] of vecinos) {
  if (vs.length === 2) continue;
  for (;;) {
    const c = caminar(n);
    if (c.length < 2) break;
    cadenas.push(c);
  }
}
// Lo que quede son anillos cerrados: una provincia rodeada entera por otra.
for (const n of vecinos.keys()) {
  const c = caminar(n);
  if (c.length >= 2) cadenas.push(c);
}

const líneas = cadenas
  .map((c) => simplificar(c.map(deNodo), TOLERANCIA))
  .filter((pts) => pts.length >= 2)
  .map((pts) => pts.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]));

// ── 3. Los 32 puntos de rótulo ───────────────────────────────────────────────
const nombres = gj.features
  .map((f) => {
    const poly = mayorPolígono(f.geometry);
    const [lon, lat] = polylabel(poly, 0.0005);
    return {
      // "Provincia Duarte" → "Duarte". El Distrito Nacional no lleva prefijo y
      // se queda con su nombre entero, que es como se le llama.
      nombre: f.properties.shapeName.replace(/^Provincia\s+/, ""),
      punto: [Number(lon.toFixed(4)), Number(lat.toFixed(4))],
      km2: Math.round(área(poly[0])),
    };
  })
  .sort((a, b) => b.km2 - a.km2);

const fc = {
  type: "FeatureCollection",
  // La licencia obliga a citar la fuente, y el sitio la pone en el pie
  // (lib/basemap · PROVINCIAS_CREDITO). Va también aquí para que el archivo se
  // explique solo si alguien lo abre suelto.
  atribución:
    "Oficina Nacional de Estadística (ONE) vía geoBoundaries (gbHumanitarian DOM ADM2, 2017), CC BY 3.0 IGO",
  features: [
    ...líneas.map((coordinates) => ({
      type: "Feature",
      properties: { tipo: "linea" },
      geometry: { type: "LineString", coordinates },
    })),
    // `orden` es el índice por superficie, de mayor a menor, y se convierte en
    // la prioridad de colisión de la capa de símbolos.
    ...nombres.map((n, orden) => ({
      type: "Feature",
      properties: { tipo: "nombre", nombre: n.nombre, orden },
      geometry: { type: "Point", coordinates: n.punto },
    })),
  ],
};

await mkdir(path.dirname(SALIDA), { recursive: true });
const json = JSON.stringify(fc);
await writeFile(SALIDA, json, "utf8");

const vértices = líneas.reduce((s, l) => s + l.length, 0);
const crudos = cadenas.reduce((s, c) => s + c.length, 0);
process.stdout.write(
  `\n${compartidas.length} segmentos compartidos → ${líneas.length} polilíneas\n` +
    `${crudos} vértices → ${vértices} tras simplificar a ${TOLERANCIA}° (~132 m)\n` +
    `${nombres.length} puntos de rótulo\n\n` +
    `${path.relative(RAIZ, SALIDA)}  ${(json.length / 1024).toFixed(1)} KB crudos  ` +
    `${(gzipSync(json).length / 1024).toFixed(1)} KB comprimidos\n`
);
