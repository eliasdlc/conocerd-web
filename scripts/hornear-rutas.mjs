// Hornea la red de carreteras entre los destinos: la matriz de distancias y la
// geometría de cada tramo, contra OSRM.
//
//   node scripts/hornear-rutas.mjs [--solo-matriz]
//
// Escribe dos cosas distintas, y la diferencia importa:
//
//   src/data/routes/pairs.json        la matriz km/min de N x N. Va en el
//                                     bundle: es lo que suma los totales de una
//                                     ruta sin bajar un solo tramo, y con 38
//                                     ids pesa unos pocos KB.
//   public/data/route-legs/<id>.json  los tramos que SALEN de ese destino. Uno
//                                     por origen, y el navegador baja solo el
//                                     del destino que tocas.
//
// Antes los tramos vivían en un único `public/data/route-legs.json` de 547 KB
// con los 153 pares de 18 destinos. Con 38 destinos son 703 pares: bajarlos
// todos para dibujar tres es la razón de partirlo.
//
// Cada par se guarda en el fichero de SUS DOS extremos, con la geometría
// orientada desde ese origen. Duplica bytes en disco, que es gratis, y ahorra
// la petición del otro extremo, que no lo es.
//
// OSRM público pide uso razonable: la matriz entera es UNA petición, y la
// geometría va a una por segundo. Con 38 destinos son 703 tramos, o sea unos
// 13 minutos.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { DESTINATIONS } from "../src/data/destinations.ts";

const OSRM = "https://router.project-osrm.org";
const SOLO_MATRIZ = process.argv.includes("--solo-matriz");
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const ids = DESTINATIONS.map((d) => d.id);
const coords = DESTINATIONS.map((d) => d.coords);
const puntos = coords.map(([lon, lat]) => `${lon},${lat}`).join(";");

/** Douglas-Peucker sobre lon/lat. El mismo eps que usó el horneado anterior. */
function simplificar(linea, eps = 0.001) {
  if (linea.length < 3) return linea;
  let maxD = 0;
  let idx = 0;
  const [ax, ay] = linea[0];
  const [bx, by] = linea[linea.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const norma = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < linea.length - 1; i++) {
    const [px, py] = linea[i];
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / norma;
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [linea[0], linea[linea.length - 1]];
  return [
    ...simplificar(linea.slice(0, idx + 1), eps).slice(0, -1),
    ...simplificar(linea.slice(idx), eps),
  ];
}

async function pedir(url, intentos = 3) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "ConoceRD/1.0 (horneado de rutas)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const js = await r.json();
      if (js.code !== "Ok") throw new Error(`OSRM ${js.code}`);
      return js;
    } catch (e) {
      if (i === intentos) throw e;
      await dormir(2000 * i);
    }
  }
}

// ── La matriz, de una sola petición ──────────────────────────────────────────
console.log(`matriz de ${ids.length} x ${ids.length}, una peticion`);
const tabla = await pedir(`${OSRM}/table/v1/driving/${puntos}?annotations=duration,distance`);
const km = tabla.distances.map((fila) => fila.map((m) => Math.round(m / 100) / 10));
const min = tabla.durations.map((fila) => fila.map((s) => Math.round(s / 60)));

const huecos = [];
for (let i = 0; i < ids.length; i++)
  for (let j = 0; j < ids.length; j++)
    if (i !== j && (km[i][j] == null || !Number.isFinite(km[i][j]))) huecos.push(`${ids[i]}|${ids[j]}`);
if (huecos.length) {
  console.error(`la matriz tiene ${huecos.length} huecos, p.ej. ${huecos.slice(0, 3).join(", ")}`);
  process.exit(1);
}

await writeFile(
  "src/data/routes/pairs.json",
  JSON.stringify({
    source: `OSRM driving (router.project-osrm.org) ${new Date().toISOString().slice(0, 10)} · matriz de /table · geometria en public/data/route-legs/<id>.json`,
    ids,
    km,
    min,
  })
);
console.log(`pairs.json: ${ids.length} ids`);
if (SOLO_MATRIZ) process.exit(0);

// ── La geometría, un tramo por segundo ───────────────────────────────────────
const total = (ids.length * (ids.length - 1)) / 2;
console.log(`geometria: ${total} tramos, a uno por segundo (~${Math.ceil((total * 1.1) / 60)} min)`);

const porOrigen = Object.fromEntries(ids.map((id) => [id, {}]));
let n = 0;
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = `${coords[i][0]},${coords[i][1]}`;
    const b = `${coords[j][0]},${coords[j][1]}`;
    const js = await pedir(`${OSRM}/route/v1/driving/${a};${b}?overview=full&geometries=geojson`);
    const linea = simplificar(js.routes[0].geometry.coordinates.map(([x, y]) => [
      Math.round(x * 1e4) / 1e4,
      Math.round(y * 1e4) / 1e4,
    ]));
    porOrigen[ids[i]][`${ids[i]}|${ids[j]}`] = linea;
    porOrigen[ids[j]][`${ids[j]}|${ids[i]}`] = [...linea].reverse();
    n++;
    if (n % 50 === 0 || n === total) console.log(`  ${n} de ${total}`);
    await dormir(1100);
  }
}

await rm("public/data/route-legs", { recursive: true, force: true });
await mkdir("public/data/route-legs", { recursive: true });
const fuente = `OSRM driving (router.project-osrm.org) ${new Date().toISOString().slice(0, 10)}, DP eps 0.001deg`;
let bytes = 0;
for (const id of ids) {
  const cuerpo = JSON.stringify({ source: fuente, legs: porOrigen[id] });
  bytes += cuerpo.length;
  await writeFile(`public/data/route-legs/${id}.json`, cuerpo);
}
await rm("public/data/route-legs.json", { force: true });
console.log(
  `${ids.length} ficheros, ${Math.round(bytes / 1024)} KB en total, ${Math.round(bytes / ids.length / 1024)} KB por destino`
);
