// ─────────────────────────────────────────────────────────────────────────────
//  Cuánto pesaría reponer, con datos nuestros, lo que hoy pinta Carto.
//
//    pnpm medir:osm
//
//  La otra mitad de la medida de la fase 4. `probe-carto.mjs` mide el PREMIO
//  (lo que se ahorra si Carto desaparece). Esto mide el PRECIO: los bytes y las
//  peticiones que habría que volver a pagar, desde nuestro dominio, para que el
//  recorrido siga contando lo mismo.
//
//  Baja de Overpass lo que corresponde a cada una de las siete cosas que Carto
//  sostiene, las simplifica con la misma receta que las provincias (Douglas
//  Peucker en grados, coordenadas a 4 decimales) y pesa el gzip, que es lo que
//  viaja por el cable. Nada de esto se escribe en `public/`: es una medida.
//
//  No cubre los glifos (se miden pidiéndolos a Carto, que es lo que el sitio
//  hace hoy) ni la imagen de mundo de los globos (es una pieza raster, del
//  mismo tipo que `public/mundo/v1`, y su peso se lee de ahí).
// ─────────────────────────────────────────────────────────────────────────────

import dns from "node:dns";
import { gzipSync } from "node:zlib";

// agentbox resuelve los espejos de Overpass por IPv6 y la conexión se queda
// colgada después de mandar la petición. Por IPv4 responden.
dns.setDefaultResultOrder("ipv4first");

const OVERPASS = "https://overpass-api.de/api/interpreter";

/**
 * El recorte de República Dominicana, y es EL MISMO polígono que el sitio ya
 * usa para acotar los topónimos (`CONTORNO_RD`, src/lib/mapaLigero.ts). Sus
 * seis vértices del oeste siguen la frontera de verdad, así que lo que salga de
 * aquí es exactamente lo que el mapa dejaría entrar.
 *
 * Va como filtro `poly` y no como `area["ISO3166-1"="DO"]` porque la búsqueda
 * por área obliga al servidor a resolver la relación del país entero y devuelve
 * "too busy" en cuanto hay cola; el polígono se evalúa contra el índice
 * espacial y pasa a la primera.
 */
const CONTORNO_RD = [
  [-71.78, 20.1], [-68.2, 20.1], [-68.2, 17.35], [-71.9, 17.35], [-71.86, 18.0],
  [-71.98, 18.5], [-71.8, 18.9], [-71.87, 19.15], [-71.78, 19.5],
];
/** Overpass pide el polígono como "lat lon lat lon …". */
const POLY = `(poly:"${CONTORNO_RD.map(([lon, lat]) => `${lat} ${lon}`).join(" ")}")`;

/**
 * Las consultas, una por cosa que Carto sostiene hoy. El nombre es el de la
 * lista de la fase; la capa de Carto que reemplaza va al lado.
 */
const PIEZAS = [
  {
    nombre: "carreteras (mot/trunk/pri)",
    capaDeCarto: "road_mot_fill_noramp · road_trunk_fill_noramp · road_pri_fill_noramp",
    consulta: `way["highway"~"^(motorway|trunk|primary)$"]${POLY};out geom;`,
    geometria: "linea",
  },
  {
    nombre: "lagos y embalses",
    capaDeCarto: "water (LAGOS_CAPA, encima de z4)",
    // Sólo lo que tiene nombre: el DEM ya pinta el mar, y lo que falta son los
    // cuerpos de agua interiores que sí se leen a estos zooms (Enriquillo,
    // Rincón, las presas). Un estanque sin nombre no se ve a z6.
    consulta: `(way["natural"="water"]["name"]${POLY};way["landuse"="reservoir"]["name"]${POLY};);out geom;`,
    geometria: "poligono",
  },
  {
    nombre: "mancha urbana",
    capaDeCarto: "landuse_residential",
    consulta: `way["landuse"="residential"]${POLY};out geom;`,
    geometria: "poligono",
  },
  {
    nombre: "ciudades y pueblos",
    capaDeCarto: "place_city_r5 · place_city_r6 · place_town",
    consulta: `node["place"~"^(city|town)$"]["name"]${POLY};out;`,
    geometria: "punto",
  },
];

/**
 * La frontera con Haití va aparte: no está dentro del área de RD, ES el área.
 * Se pide como la relación de la frontera nacional y se queda el trazado.
 */
const FRONTERA = {
  nombre: "frontera con Haití",
  capaDeCarto: "boundary_country_inner",
  consulta: `way["boundary"="administrative"]["admin_level"="2"]${POLY};out geom;`,
  geometria: "linea",
};

// ─── Simplificación, la misma receta que `scripts/hornear-provincias.mjs` ────

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

const redondear = (pts, dec = 4) =>
  pts.map(([x, y]) => [Number(x.toFixed(dec)), Number(y.toFixed(dec))]);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function overpass(consulta, intentos = 4) {
  for (let i = 1; ; i++) {
    try {
      return await unaVez(consulta);
    } catch (e) {
      if (i >= intentos) throw e;
      process.stdout.write(`   reintento ${i} (${e.message.slice(0, 60)})\n`);
      await new Promise((r) => setTimeout(r, 8000 * i));
    }
  }
}

async function unaVez(consulta) {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // Sin User-Agent, overpass-api.de responde 406 a un cliente de node.
      "user-agent": "conocerd-web/medida-fase-4 (https://github.com/eliasdlc/conocerd-web)",
    },
    body: `data=${encodeURIComponent(`[out:json][timeout:180];${consulta}`)}`,
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  // Un "too busy" llega con 200 y cuerpo HTML, no JSON.
  if (!texto.trimStart().startsWith("{")) {
    throw new Error(texto.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 120));
  }
  return JSON.parse(texto).elements ?? [];
}

// ─── La medida ───────────────────────────────────────────────────────────────

const TOLERANCIAS = [0, 0.0006, 0.0012, 0.0025];

async function pesar(pieza) {
  process.stdout.write(`\n── ${pieza.nombre}\n   (hoy: ${pieza.capaDeCarto})\n`);
  let elementos;
  try {
    elementos = await overpass(pieza.consulta);
  } catch (e) {
    console.log(`   ERROR ${e.message}`);
    return null;
  }

  if (pieza.geometria === "punto") {
    const rasgos = elementos.map((n) => ({
      type: "Feature",
      properties: { nombre: n.tags.name, clase: n.tags.place },
      geometry: { type: "Point", coordinates: [Number(n.lon.toFixed(4)), Number(n.lat.toFixed(4))] },
    }));
    const json = JSON.stringify({ type: "FeatureCollection", features: rasgos });
    console.log(`   ${rasgos.length} puntos · crudo ${kb(json.length)} · gzip ${kb(gzipSync(json).length)}`);
    return { nombre: pieza.nombre, n: rasgos.length, gzip: gzipSync(json).length };
  }

  const lineas = elementos
    .filter((e) => Array.isArray(e.geometry))
    .map((e) => e.geometry.filter(Boolean).map((p) => [p.lon, p.lat]))
    .filter((pts) => pts.length > 1);
  const vertices = lineas.reduce((a, l) => a + l.length, 0);
  console.log(`   ${lineas.length} trazos · ${vertices.toLocaleString("es")} vértices en bruto`);

  let mejor = null;
  for (const tol of TOLERANCIAS) {
    const simples = lineas
      .map((l) => redondear(tol ? simplificar(l, tol) : l))
      .filter((l) => l.length > 1);
    const v = simples.reduce((a, l) => a + l.length, 0);
    const json = JSON.stringify({
      type: "FeatureCollection",
      features: simples.map((coords) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      })),
    });
    const g = gzipSync(json).length;
    console.log(
      `   tol ${String(tol).padEnd(7)} ${String(v).padStart(7)} vértices · crudo ${kb(json.length).padStart(9)} · gzip ${kb(g).padStart(9)}`
    );
    if (tol === 0.0012) mejor = { nombre: pieza.nombre, n: simples.length, gzip: g };
  }
  return mejor;
}

const resumen = [];
for (const pieza of [...PIEZAS, FRONTERA]) resumen.push(await pesar(pieza));

console.log("\n\n════ El precio, a la tolerancia de las provincias (0,0012°) ════");
const vivos = resumen.filter(Boolean);
console.table(vivos.map((r) => ({ pieza: r.nombre, rasgos: r.n, "KB en el cable": +(r.gzip / 1024).toFixed(1) })));
console.log(
  `total: ${vivos.length} piezas · ${(vivos.reduce((a, r) => a + r.gzip, 0) / 1024).toFixed(1)} KB` +
    ` si viajan por separado, menos si se juntan en un archivo como las provincias.`
);
