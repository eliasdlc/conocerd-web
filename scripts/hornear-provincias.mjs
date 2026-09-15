// ─────────────────────────────────────────────────────────────────────────────
//  Hornea los 32 puntos de etiqueta de las provincias: de los polígonos de la
//  ONE a una constante del bundle.
//
//    pnpm provincias
//
//  Por qué sólo los puntos. El plan daba por hecho que había que publicar
//  también las aristas internas (35 polilíneas, unos 20 KB). No hace falta: el
//  estilo de Carto ya trae `boundary_state` (admin_level 4, maritime 0) y a
//  este zoom eso ES la provincia dominicana. Estaba apagado por nosotros, no
//  ausente. Comprobado en teselas reales el 15 sep 2026 sobre la caja de RD:
//
//    z4    3 tramos ·     47 vértices  (5 dentro de RD: no hay geometría)
//    z5   44 tramos ·  1.235 vértices  (1.127 dentro)
//    z6   52 tramos ·  2.374 vértices  (2.176 dentro)
//    z7   89 tramos ·  4.995 vértices  (4.660 dentro)
//    z8  101 tramos ·  7.821 vértices  (7.388 dentro)
//    z9  129 tramos · 12.165 vértices  (11.877 dentro)
//
//  Así que la división sale de una fuente que el mapa ya estaba pidiendo, y lo
//  único nuestro es el nombre. Lo que Carto NO tiene es eso: `place` con
//  `class=state` devuelve CERO rasgos dentro de RD en todos los zooms de 4 a
//  10. No es el filtro `rank<=4` del estilo: los rasgos no existen en la
//  tesela. La misma sonda sobre Texas y Colombia devuelve decenas, así que la
//  sonda no miente.
//
//  Qué produce. `src/data/provincias.ts`, 32 entradas con nombre y punto. Va
//  al bundle (~1 KB) y no a `public/`: 32 puntos no justifican una petición, y
//  el gate de la fase es que el peso añadido sea cero.
//
//  El punto NO es el centroide. Es el polo de inaccesibilidad: el centro del
//  mayor círculo que cabe dentro del polígono. El centroide de Samaná cae en
//  la bahía y el de Barahona en el mar; éste no.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import polylabel from "polylabel";

const RAIZ = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(RAIZ, ".cache/provincias");
const ORIGEN =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbHumanitarian/DOM/ADM2/geoBoundaries-DOM-ADM2.geojson";
const SALIDA = path.join(RAIZ, "src/data/provincias.ts");

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

/** El polígono de mayor área de un rasgo, que es el que lleva el nombre: Samaná
 *  y La Altagracia traen cayos sueltos que no deben quedarse la etiqueta. */
function mayorPolígono(geom) {
  const polígonos = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  return polígonos.reduce((mejor, p) => (área(p[0]) > área(mejor[0]) ? p : mejor));
}

const gj = await fuente();
if (gj.features.length !== 32) throw new Error(`esperaba 32 unidades, llegaron ${gj.features.length}`);

const provincias = gj.features
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
  // De mayor a menor. El índice es la prioridad de colisión: cuando dos nombres
  // se pisan, MapLibre dibuja el de `symbol-sort-key` más bajo.
  .sort((a, b) => b.km2 - a.km2);

const cuerpo = provincias
  .map((p) => `  { nombre: "${p.nombre}", punto: [${p.punto[0]}, ${p.punto[1]}] },`)
  .join("\n");

await writeFile(
  SALIDA,
  `// ─────────────────────────────────────────────────────────────────────────────
//  Las 32 unidades de primer nivel de República Dominicana: 31 provincias y el
//  Distrito Nacional, con el punto donde va su nombre.
//
//  GENERADO POR \`pnpm provincias\` (scripts/hornear-provincias.mjs). No editar
//  a mano: el punto es el polo de inaccesibilidad del polígono real, no una
//  coordenada puesta a ojo.
//
//  Fuente: Oficina Nacional de Estadística, vía geoBoundaries (gbHumanitarian
//  DOM ADM2, datos de 2017), licencia CC BY 3.0 IGO. La atribución es
//  obligatoria y vive en el pie del sitio.
//
//  Aquí no hay geometría de límites: ésa la dibuja \`boundary_state\` del propio
//  estilo de Carto, que a este zoom ya son las provincias dominicanas
//  (lib/mapaLigero · pintarProvincias).
//
//  Orden: de mayor a menor superficie. El índice es la prioridad cuando dos
//  nombres se pisan, que es lo que descongestiona el Cibao sin una escalera de
//  zoom escrita a mano.
// ─────────────────────────────────────────────────────────────────────────────

export interface Provincia {
  readonly nombre: string;
  readonly punto: readonly [number, number];
}

export const PROVINCIAS: readonly Provincia[] = [
${cuerpo}
];
`,
  "utf8"
);

for (const [i, p] of provincias.entries()) {
  process.stdout.write(`${String(i).padStart(2)} ${p.nombre.padEnd(26)} ${p.punto[0]}, ${p.punto[1]}  ${p.km2} km²\n`);
}
process.stdout.write(`\n${provincias.length} provincias → ${path.relative(RAIZ, SALIDA)}\n`);
