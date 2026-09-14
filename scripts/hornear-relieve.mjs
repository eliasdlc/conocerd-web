// ─────────────────────────────────────────────────────────────────────────────
//  Hornea el relieve del país: de DEM crudo a teselas WebP con la tinta y la
//  sombra ya calculadas.
//
//    pnpm relieve            hornea lo que falte
//    pnpm relieve --rehacer  vuelve a hornear todo
//
//  Por qué existe. La primera versión montaba el DEM de AWS en el navegador y
//  lo coloreaba con `color-relief` + `hillshade` de MapLibre. Medido el 14 sep
//  2026: 23,2 MB y 259 teselas por recorrido, de 1 a 17 fps en los vuelos, y un
//  shader que no compila sin GPU (el mapa salía en blanco). Aquí ese trabajo se
//  hace una vez, en esta máquina, y lo que viaja es una imagen.
//
//  Qué produce. `public/relieve/v1/{z}/{x}/{y}.webp`, 512 px, con alfa. La
//  tierra es opaca; el mar es transparente y lo pinta el polígono de agua del
//  basemap, plano. Cada tesela de salida se hornea desde las 2 × 2 teselas
//  terrarium del nivel de ABAJO: 1 píxel de salida = 1 píxel de DEM, sin
//  remuestreo, el doble de resolución que servir el DEM a su propio nivel.
//
//  La paleta no vive aquí: sale de `src/lib/relieve.ts`, la misma que usa el
//  runtime. Si se cambia allí, hay que rehornear y subir de versión.
//
//  Las teselas de origen quedan cacheadas en `.cache/terrarium` (fuera de git),
//  así que un segundo horneado no vuelve a bajar el DEM.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  PALETA,
  RELIEVE_BOUNDS,
  RELIEVE_MAXZOOM,
  RELIEVE_MINZOOM,
  RELIEVE_VERSION,
} from "../src/lib/relieve.ts";

const REHACER = process.argv.includes("--rehacer");
await fs.mkdir(path.resolve(".cache/terrarium"), { recursive: true });
const SALIDA = path.resolve("public/relieve", RELIEVE_VERSION);
// Junto al repo y fuera de git (.gitignore): el temporal del sistema se vacía
// al reiniciar, y el día que el 3D por destino pida recortes del DEM, estas
// mismas teselas ya están aquí.
const CACHE = path.resolve(".cache/terrarium");
const ORIGEN = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium";

/** Exageración vertical por zoom. De lejos hay que forzarla o la Cordillera no
 *  se distingue; de cerca, la misma cifra convierte cada loma en un acantilado. */
const EXAGERACION = { 5: 3.3, 6: 2.9, 7: 2.5, 8: 2.1, 9: 1.8, 10: 1.6, 11: 1.4 };

/** Por debajo de este zoom la cota se suaviza con una media de 3 × 3 antes de
 *  calcular la pendiente: sin eso el grano del DEM se ve como ruido sobre el
 *  Cibao. */
const SUAVIZAR_HASTA = 9;

// Sombreado multidireccional (Mark, 1992): cuatro luces en vez de una. Con una
// sola, las laderas paralelas a la luz quedan planas y el relieve se lee como
// una chapa repujada. El peso de cada luz depende de la orientación de la
// ladera, así que ninguna dirección domina.
const ACIMUTES = [225, 270, 315, 360];
const ALTITUD = 45;

const rad = (g) => (g * Math.PI) / 180;
const COS_CENIT = Math.cos(rad(90 - ALTITUD));
const SIN_CENIT = Math.sin(rad(90 - ALTITUD));

// ─── Geometría de teselas ────────────────────────────────────────────────────

const lon2x = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2y = (lat, z) =>
  Math.floor(
    ((1 - Math.log(Math.tan(rad(lat)) + 1 / Math.cos(rad(lat))) / Math.PI) / 2) * 2 ** z
  );
const y2lat = (y, z) => {
  const t = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(t) - Math.exp(-t)));
};

function teselasDe(z, [oeste, sur, este, norte]) {
  const out = [];
  for (let x = lon2x(oeste, z); x <= lon2x(este, z); x++) {
    for (let y = lat2y(norte, z); y <= lat2y(sur, z); y++) out.push({ z, x, y });
  }
  return out;
}

// ─── El DEM de origen ────────────────────────────────────────────────────────

/** Cotas en metros de una tesela terrarium, 256 × 256. `null` si no existe. */
const decodificadas = new Map();
const enVuelo = new Map();
const MAX_EN_MEMORIA = 400;

/** Una sola descarga por tesela aunque la pidan a la vez las cuatro teselas de
 *  salida que la comparten como vecina. */
function cotas(z, x, y) {
  const clave = `${z}/${x}/${y}`;
  const guardada = decodificadas.get(clave);
  if (guardada !== undefined) return Promise.resolve(guardada);
  const pendiente = enVuelo.get(clave);
  if (pendiente) return pendiente;
  const promesa = bajarYDecodificar(z, x, y, clave).finally(() => enVuelo.delete(clave));
  enVuelo.set(clave, promesa);
  return promesa;
}

async function bajarYDecodificar(z, x, y, clave) {

  const archivo = path.join(CACHE, `${z}-${x}-${y}.png`);
  let png = null;
  try {
    png = await fs.readFile(archivo);
  } catch {
    const res = await fetch(`${ORIGEN}/${z}/${x}/${y}.png`);
    if (res.ok) {
      png = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(archivo, png);
    }
  }

  let malla = null;
  if (png) {
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    const canales = info.channels;
    malla = new Int16Array(256 * 256);
    for (let i = 0, p = 0; i < malla.length; i++, p += canales) {
      // terrarium: la cota en metros vive repartida en los tres canales.
      malla[i] = Math.round(data[p] * 256 + data[p + 1] + data[p + 2] / 256 - 32768);
    }
  }

  if (decodificadas.size > MAX_EN_MEMORIA) decodificadas.clear();
  decodificadas.set(clave, malla);
  return malla;
}

/**
 * Las cotas del bloque de 4 × 4 teselas del nivel Z+1 alrededor de la tesela de
 * salida: 1024 × 1024 px, con la salida en el centro.
 *
 * El borde de una tesela vecina no es un lujo: la pendiente se calcula con un
 * filtro de 3 × 3, y sin vecinos reales cada borde de tesela produce una línea
 * de sombra falsa. Eso es una rejilla visible sobre todo el mapa.
 */
async function bloque(z, x, y) {
  const malla = new Int16Array(1024 * 1024);
  const zf = z + 1;
  const n = 2 ** zf;

  // Las 16 a la vez: en serie, bajar el DEM de una sola tesela de salida son
  // cuatro segundos de ida y vuelta a S3, y hay varios cientos de teselas.
  const piezas = [];
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const sy = 2 * y - 1 + ty;
      if (sy < 0 || sy >= n) continue;
      const sx = ((((2 * x - 1 + tx) % n) + n) % n);
      piezas.push({ tx, ty, cotas: cotas(zf, sx, sy) });
    }
  }

  for (const { tx, ty, cotas: pendiente } of piezas) {
    const fuente = await pendiente;
    if (!fuente) continue;
    const ox = tx * 256;
    const oy = ty * 256;
    for (let j = 0; j < 256; j++) {
      malla.set(fuente.subarray(j * 256, j * 256 + 256), (oy + j) * 1024 + ox);
    }
  }
  return malla;
}

// ─── La paleta, como tabla ───────────────────────────────────────────────────

const hexARgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** La rampa resuelta metro a metro, de 0 a 3100: interpolar por píxel sería el
 *  mismo cálculo 89 millones de veces. */
const TABLA = (() => {
  const paradas = PALETA.suelo.map(([m, hex]) => [m, hexARgb(hex)]);
  const techo = paradas[paradas.length - 1][0];
  const tabla = new Uint8Array((techo + 1) * 3);
  for (let m = 0; m <= techo; m++) {
    let i = 0;
    while (i < paradas.length - 2 && m > paradas[i + 1][0]) i++;
    const [m0, c0] = paradas[i];
    const [m1, c1] = paradas[i + 1];
    const t = m1 === m0 ? 0 : (m - m0) / (m1 - m0);
    for (let c = 0; c < 3; c++) tabla[m * 3 + c] = Math.round(c0[c] + (c1[c] - c0[c]) * t);
  }
  return { tabla, techo };
})();

const COSTA = hexARgb(PALETA.suelo[0][1]);

// ─── El horneado de una tesela ───────────────────────────────────────────────

async function hornear(z, x, y) {
  let malla = await bloque(z, x, y);

  if (z <= SUAVIZAR_HASTA) {
    const suave = new Int16Array(malla.length);
    for (let j = 1; j < 1023; j++) {
      for (let i = 1; i < 1023; i++) {
        const p = j * 1024 + i;
        suave[p] = Math.round(
          (malla[p - 1025] + malla[p - 1024] + malla[p - 1023] +
            malla[p - 1] + malla[p] + malla[p + 1] +
            malla[p + 1023] + malla[p + 1024] + malla[p + 1025]) / 9
        );
      }
    }
    malla = suave;
  }

  // Metros por píxel del nivel de origen, en el paralelo de esta tesela.
  const lat = y2lat(y + 0.5, z);
  const res = (40075016.686 * Math.cos(rad(lat))) / (256 * 2 ** (z + 1));
  const factor = EXAGERACION[z] ?? 1.5;

  const rgba = Buffer.alloc(512 * 512 * 4);
  let conTierra = false;

  for (let oj = 0; oj < 512; oj++) {
    const j = oj + 256;
    for (let oi = 0; oi < 512; oi++) {
      const i = oi + 256;
      const p = j * 1024 + i;
      const cota = malla[p];
      const destino = (oj * 512 + oi) * 4;

      // El mar no lleva relieve: su color lo pone el polígono de agua del
      // basemap. Los píxeles transparentes llevan igualmente el color de la
      // costa, para que el filtrado bilineal de la orilla mezcle hacia tierra
      // y no hacia negro.
      if (cota < 1) {
        rgba[destino] = COSTA[0];
        rgba[destino + 1] = COSTA[1];
        rgba[destino + 2] = COSTA[2];
        rgba[destino + 3] = 0;
        continue;
      }
      conTierra = true;

      const a = malla[p - 1025], b = malla[p - 1024], c = malla[p - 1023];
      const d = malla[p - 1], f = malla[p + 1];
      const g = malla[p + 1023], h = malla[p + 1024], k = malla[p + 1025];
      const dzdx = ((a + 2 * d + g) - (c + 2 * f + k)) / (8 * res);
      const dzdy = ((g + 2 * h + k) - (a + 2 * b + c)) / (8 * res);

      const pendiente = Math.atan(factor * Math.hypot(dzdx, dzdy));
      const orientacion = Math.atan2(dzdy, -dzdx);
      const cosPendiente = Math.cos(pendiente);
      const sinPendiente = Math.sin(pendiente);

      let suma = 0;
      let pesos = 0;
      for (const az of ACIMUTES) {
        const diferencia = rad(az) - orientacion;
        const peso = Math.sin(diferencia) ** 2 + 0.05;
        const luz = COS_CENIT * cosPendiente + SIN_CENIT * sinPendiente * Math.cos(diferencia);
        suma += peso * Math.max(0, luz);
        pesos += peso;
      }
      const sombra = suma / pesos;

      const m = Math.min(cota, TABLA.techo) * 3;
      // Por debajo de 1 el color se oscurece; por encima se aclara hacia el
      // blanco, y a un cuarto, porque una ladera al sol que se va a blanco
      // quema el color de la altura, que es lo que tiene que mandar.
      const mult = 0.6 + 0.55 * sombra;
      for (let ch = 0; ch < 3; ch++) {
        const base = TABLA.tabla[m + ch];
        rgba[destino + ch] =
          mult <= 1
            ? Math.round(base * mult)
            : Math.round(base + (255 - base) * Math.min(1, (mult - 1) * 1.5) * 0.25);
      }
      rgba[destino + 3] = 255;
    }
  }

  return { rgba, conTierra };
}

// ─── El recorrido de las teselas ─────────────────────────────────────────────

// Una tesela sin un metro de tierra se escribe igual, transparente y de unos
// pocos cientos de bytes: no escribirla dejaría un 404 por cada encuadre con
// mar, y MapLibre emite un evento de error por cada uno.
const VACIA = await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .webp({ quality: 60, alphaQuality: 100 })
  .toBuffer();

const todas = [];
for (let z = RELIEVE_MINZOOM; z <= RELIEVE_MAXZOOM; z++) {
  todas.push(...teselasDe(z, RELIEVE_BOUNDS));
}

console.log(`${todas.length} teselas de z${RELIEVE_MINZOOM} a z${RELIEVE_MAXZOOM}`);

let hechas = 0;
let vacias = 0;
let bytes = 0;
const arranque = Date.now();

for (const { z, x, y } of todas) {
  const destino = path.join(SALIDA, String(z), String(x), `${y}.webp`);
  if (!REHACER) {
    try {
      bytes += (await fs.stat(destino)).size;
      hechas++;
      continue;
    } catch {}
  }
  await fs.mkdir(path.dirname(destino), { recursive: true });

  const { rgba, conTierra } = await hornear(z, x, y);
  if (conTierra) {
    await sharp(rgba, { raw: { width: 512, height: 512, channels: 4 } })
      .webp({ quality: 80, alphaQuality: 100, effort: 5 })
      .toFile(destino);
  } else {
    await fs.writeFile(destino, VACIA);
    vacias++;
  }
  bytes += (await fs.stat(destino)).size;
  hechas++;
  if (hechas % 25 === 0) {
    process.stdout.write(`\r  ${hechas}/${todas.length}  ${Math.round(bytes / 1024)} KB`);
  }
}

console.log(
  `\n${hechas} teselas (${vacias} sólo mar), ${(bytes / 1024 / 1024).toFixed(1)} MB en ` +
    `${path.relative(process.cwd(), SALIDA)}, en ${Math.round((Date.now() - arranque) / 1000)} s`
);
