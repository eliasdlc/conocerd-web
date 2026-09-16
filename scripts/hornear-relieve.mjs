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
//  Qué produce. `public/relieve/<version>/{z}/{x}/{y}.webp`, 512 px, opacas y
//  sin alfa: la tierra Y el mar. Cada tesela de salida se hornea desde las
//  2 × 2 teselas terrarium del nivel de ABAJO: 1 píxel de salida = 1 píxel de
//  DEM, sin remuestreo, el doble de resolución que servir el DEM a su propio
//  nivel.
//
//  El mar se colorea por PROFUNDIDAD real, desde la batimetría de GEBCO que el
//  mismo DEM trae bajo el nivel del mar: somero claro, abismo oscuro, como el
//  agua. Ahí están el Banco de la Plata, la plataforma de Samaná y la fosa de
//  Puerto Rico, que son los "parches de color distinto" que pedía el dueño, y
//  son dato, no textura.
//
//  Tres intentos anteriores murieron, y los tres por cómo se dibujaba, no por
//  qué se dibujaba:
//
//    1. Tres líneas sobre el polígono de agua: dibujaban también el borde de
//       recorte de cada tesela, o sea rayas en mar abierto.
//    2. `color-relief` sobre la batimetría cruda, muestreada a la resolución de
//       la tesela: a bloques en las bahías.
//    3. Degradado por distancia a la costa: sin artefactos, pero al revés que
//       el agua de verdad. La bahía de Samaná, de 10 a 30 m, salía como el agua
//       más oscura del encuadre por estar rodeada de tierra, y el mar abierto
//       del sur, a 4.000 m, como la más clara. Un halo oscuro pegado al
//       contorno no se lee como agua: se lee como la sombra de un recorte.
//
//  Las dos condiciones que hacen que la 4 no repita a la 1 ni a la 2 viven en
//  `campoDelMar`. Primera: el campo se calcula UNA vez sobre un raster global y
//  se muestrea para cada tesela de cada nivel; calculado por tesela, cada borde
//  de tesela sería un borde de dato y volverían las rayas. Segunda: el campo se
//  suaviza con una media móvil de 4 km, que está POR ENCIMA de la malla real de
//  GEBCO (15 segundos de arco, unos 450 m). Por debajo de esos 450 m no hay
//  dato, hay interpolación, y eso era exactamente lo que se veía a bloques.
//  Suavizado a 4 km no queda nada que pueda salir a bloques, y las estructuras
//  que importan miden decenas de kilómetros y sobreviven enteras.
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
const EXAGERACION = { 4: 3.6, 5: 3.3, 6: 2.9, 7: 2.5, 8: 2.1, 9: 1.8, 10: 1.6, 11: 1.4 };

/** El radio de la media móvil que se le pasa a la batimetría, en metros.
 *
 *  Está POR ENCIMA de la malla real de GEBCO (15 segundos de arco, unos 450 m)
 *  a propósito: por debajo de esa cifra el dato no existe, se interpola, y esa
 *  interpolación es lo que se veía a bloques en las bahías. Suavizada a 4 km no
 *  queda nada que pueda salir a bloques, y los bancos, las plataformas y las
 *  fosas miden decenas de kilómetros y sobreviven enteros. */
const SUAVIZADO_MAR = 4000;

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

/** La rampa del mar resuelta cada 10 m de profundidad. Igual que la del suelo,
 *  y por la misma razón: son 300 millones de píxeles de mar. */
const TABLA_MAR = (() => {
  const paradas = PALETA.mar.map(([m, hex]) => [m, hexARgb(hex)]);
  const techo = paradas[paradas.length - 1][0];
  const paso = 10;
  const entradas = Math.floor(techo / paso) + 1;
  const tabla = new Uint8Array(entradas * 3);
  for (let e = 0; e < entradas; e++) {
    const m = e * paso;
    let i = 0;
    while (i < paradas.length - 2 && m > paradas[i + 1][0]) i++;
    const [m0, c0] = paradas[i];
    const [m1, c1] = paradas[i + 1];
    const u = m1 === m0 ? 0 : (m - m0) / (m1 - m0);
    for (let c = 0; c < 3; c++) tabla[e * 3 + c] = Math.round(c0[c] + (c1[c] - c0[c]) * u);
  }
  return { tabla, techo, paso };
})();

// ─── El campo del mar ────────────────────────────────────────────────────────
//
// Dos cosas por píxel, las dos calculadas UNA vez sobre un raster global y
// muestreadas después. Nunca por tesela: una tesela no sabe qué hay fuera de
// ella, así que cualquier cosa que dependa del vecindario mediría hasta el
// borde del recorte, y el borde del recorte se dibuja.
//
//   · `profundidad`, suavizada a 4 km, que es la que colorea el agua.
//   · `alOceano`, los metros al mar alcanzable desde el borde del raster, que
//     es la que separa el mar del agua interior.
//
// Dos campos, no uno, y los dos globales:
//
//   · fino, a resolución z9 (≈ 290 m/px) sobre la caja del relieve. Es el que
//     usan los niveles de salida 8 a 11, donde lo que se ve cabe en la caja.
//   · amplio, a resolución z7 (≈ 1.160 m/px) sobre la extensión de la tesela de
//     z4, que es el Caribe entero. Lo usan los niveles 4 a 7, cuyas teselas se
//     salen muchísimo de la caja: sin él, Cuba, Jamaica y Puerto Rico saldrían
//     con su relieve pero sin plataforma, flotando sobre un azul plano.
//
// Que sean dos no reintroduce el problema: los dos aproximan las MISMAS
// funciones, así que allí donde se solapan dan el mismo número y no hay salto
// al cambiar de nivel.

/** Transformada de distancia exacta en 1D (Felzenszwalb y Huttenlocher, 2012),
 *  sobre distancias AL CUADRADO. `v` y `z` son buffers de trabajo. */
function distancia1d(f, d, v, z, n) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/**
 * Transformada 2D sobre un campo de semillas (0) y no-semillas (un número
 * enorme), devuelta en metros de suelo. Separable y exacta: primero por
 * columnas, después por filas.
 *
 * El paso a metros va fila a fila porque el píxel de Mercator mide distinto
 * según la latitud. Entre 17,1° y 20,3° el coseno se mueve un 2 %, poco para
 * verse pero gratis de hacer bien.
 */
function enMetros(campo, ancho, alto, px0, py0, zDem) {
  const n = Math.max(ancho, alto);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);

  for (let i = 0; i < ancho; i++) {
    for (let j = 0; j < alto; j++) f[j] = campo[j * ancho + i];
    distancia1d(f, d, v, z, alto);
    for (let j = 0; j < alto; j++) campo[j * ancho + i] = d[j];
  }
  for (let j = 0; j < alto; j++) {
    const fila = j * ancho;
    for (let i = 0; i < ancho; i++) f[i] = campo[fila + i];
    distancia1d(f, d, v, z, ancho);
    for (let i = 0; i < ancho; i++) campo[fila + i] = d[i];
  }

  const metros = new Float32Array(ancho * alto);
  for (let j = 0; j < alto; j++) {
    const lat = y2lat((py0 + j + 0.5) / 256, zDem);
    const porPixel = (40075016.686 * Math.cos(rad(lat))) / (256 * 2 ** zDem);
    const fila = j * ancho;
    for (let i = 0; i < ancho; i++) metros[fila + i] = Math.sqrt(campo[fila + i]) * porPixel;
  }
  return metros;
}

/**
 * Media móvil separable, en dos pasadas de suma corrida: el coste no depende
 * del radio, así que suavizar a 4 km sale igual de barato que a 400 m.
 */
function suavizar(src, ancho, alto, radio) {
  const n = 2 * radio + 1;
  const fila = new Float32Array(ancho * alto);
  for (let j = 0; j < alto; j++) {
    const base = j * ancho;
    let suma = 0;
    for (let i = -radio; i <= radio; i++) suma += src[base + Math.min(ancho - 1, Math.max(0, i))];
    for (let i = 0; i < ancho; i++) {
      fila[base + i] = suma / n;
      suma += src[base + Math.min(ancho - 1, i + radio + 1)] - src[base + Math.max(0, i - radio)];
    }
  }
  const out = new Float32Array(ancho * alto);
  for (let i = 0; i < ancho; i++) {
    let suma = 0;
    for (let j = -radio; j <= radio; j++) suma += fila[Math.min(alto - 1, Math.max(0, j)) * ancho + i];
    for (let j = 0; j < alto; j++) {
      out[j * ancho + i] = suma / n;
      suma += fila[Math.min(alto - 1, j + radio + 1) * ancho + i] - fila[Math.max(0, j - radio) * ancho + i];
    }
  }
  return out;
}

/**
 * El campo de un rectángulo de teselas DEM. `rect` va en teselas del nivel
 * `zDem`, ambos extremos incluidos.
 */
async function campoDelMar(zDem, rect) {
  const ancho = (rect.x1 - rect.x0 + 1) * 256;
  const alto = (rect.y1 - rect.y0 + 1) * 256;
  const px0 = rect.x0 * 256;
  const py0 = rect.y0 * 256;

  // Tierra = 0, mar = lejísimos. `1e12` y no `Infinity`: la transformada resta
  // dos valores del campo, y con dos infinitos eso es NaN, que envenena la fila
  // entera y deja el mar de un solo color. Un billón sigue siendo inalcanzable
  // al lado de la mayor distancia real (unos 1e7 px²) y resta bien.
  //
  // Una tesela que el DEM no tiene se trata como mar: es lo que es en esta
  // parte del mundo.
  const LEJOS = 1e12;
  const campo = new Float64Array(ancho * alto).fill(LEJOS);
  const tierra = new Uint8Array(ancho * alto);
  const cruda = new Float32Array(ancho * alto);
  for (let ty = rect.y0; ty <= rect.y1; ty++) {
    const fila = [];
    for (let tx = rect.x0; tx <= rect.x1; tx++) fila.push({ tx, cotas: cotas(zDem, tx, ty) });
    for (const { tx, cotas: pendiente } of fila) {
      const malla = await pendiente;
      if (!malla) continue;
      const ox = (tx - rect.x0) * 256;
      const oy = (ty - rect.y0) * 256;
      for (let j = 0; j < 256; j++) {
        const destino = (oy + j) * ancho + ox;
        for (let i = 0; i < 256; i++) {
          const cota = malla[j * 256 + i];
          cruda[destino + i] = cota;
          if (cota >= 1) {
            campo[destino + i] = 0;
            tierra[destino + i] = 1;
          }
        }
      }
    }
  }

  // Qué agua es el mar y qué agua no lo es.
  //
  // "Bajo el nivel del mar" no significa mar: la hoya de Enriquillo está a
  // 40 m bajo cero y es tierra seca, con el lago dentro. Sin esta distinción el
  // horneado la pintaba de azul, y en la franja donde la cota oscila alrededor
  // de cero lo hacía píxel sí, píxel no: una sal y pimienta que además es lo
  // más caro que se le puede dar a un codificador con pérdida (la tesela del
  // lago pasaba de 6,8 a 18,1 KB).
  //
  // Mar es el agua que se puede alcanzar desde el borde del raster sin cruzar
  // tierra. El lago Enriquillo, la laguna de Oviedo y los embalses quedan
  // fuera, y los dibuja encima la capa de lagos del basemap, que sí sabe cuál
  // es cuál.
  const oceano = new Uint8Array(ancho * alto);
  {
    const cola = new Int32Array(ancho * alto);
    let cabeza = 0;
    let cola_ = 0;
    const empujar = (p) => {
      if (tierra[p] || oceano[p]) return;
      oceano[p] = 1;
      cola[cola_++] = p;
    };
    for (let i = 0; i < ancho; i++) {
      empujar(i);
      empujar((alto - 1) * ancho + i);
    }
    for (let j = 0; j < alto; j++) {
      empujar(j * ancho);
      empujar(j * ancho + ancho - 1);
    }
    while (cabeza < cola_) {
      const p = cola[cabeza++];
      const i = p % ancho;
      if (i > 0) empujar(p - 1);
      if (i < ancho - 1) empujar(p + 1);
      if (p >= ancho) empujar(p - ancho);
      if (p < ancho * (alto - 1)) empujar(p + ancho);
    }
  }

  const alOceano = enMetros(
    Float64Array.from(oceano, (o) => (o ? 0 : LEJOS)),
    ancho,
    alto,
    px0,
    py0,
    zDem
  );

  const mpp = (40075016.686 * Math.cos(rad(y2lat((py0 + alto / 2) / 256, zDem)))) / (256 * 2 ** zDem);
  const profundidad = suavizar(cruda, ancho, alto, Math.max(1, Math.round(SUAVIZADO_MAR / mpp)));

  return { zDem, px0, py0, ancho, alto, profundidad, alOceano };
}

/**
 * ¿Hay océano a menos de `CERCA_DEL_MAR` de ese punto? `null` si cae fuera del
 * campo.
 *
 * La pregunta es de proximidad y no "¿esta celda es océano?" a propósito. El
 * campo tiene 290 m de resolución y el horneado decide tierra o agua con el DEM
 * del nivel de abajo, que en un closeup son 18: preguntar por la celda exacta
 * hacía que cada banco de arena mal clasificado a 290 m convirtiera en tierra
 * un rectángulo de mar, y que toda la costa saliera escalonada a esa reja. La
 * silueta de la isla la dibuja el DEM fino, como siempre; esto sólo separa el
 * mar del agua interior.
 *
 * 1,2 km es más que cualquier error de la reja gruesa y mucho menos que lo que
 * separa del mar a la hoya de Enriquillo (20 km) o a la laguna de Oviedo (2).
 */
const CERCA_DEL_MAR = 1200;

function esOceano(campo, fx, fy) {
  if (fx < 0 || fy < 0 || fx > campo.ancho - 1 || fy > campo.alto - 1) return null;
  return campo.alOceano[Math.round(fy) * campo.ancho + Math.round(fx)] < CERCA_DEL_MAR;
}

/** Metros de profundidad en un punto del campo, o `null` si cae fuera.
 *  Bilineal: el campo ya viene suavizado a 4 km, así que subirlo de 290 m/px a
 *  los 36 de un closeup no deja ni escalones ni bloques. */
function muestrear(campo, fx, fy) {
  if (fx < 0 || fy < 0 || fx > campo.ancho - 1 || fy > campo.alto - 1) return null;
  const i = fx | 0;
  const j = fy | 0;
  const tx = fx - i;
  const ty = fy - j;
  const i1 = i + 1 < campo.ancho ? i + 1 : i;
  const j1 = j + 1 < campo.alto ? j + 1 : j;
  const m = campo.profundidad;
  const arriba = m[j * campo.ancho + i] + (m[j * campo.ancho + i1] - m[j * campo.ancho + i]) * tx;
  const abajo = m[j1 * campo.ancho + i] + (m[j1 * campo.ancho + i1] - m[j1 * campo.ancho + i]) * tx;
  return arriba + (abajo - arriba) * ty;
}

/** El rectángulo de teselas de nivel `zDem` que cubre por completo las teselas
 *  `tiles`, todas del mismo nivel `z`. */
function rectanguloDem(tiles, z, zDem) {
  const escala = 2 ** (zDem - z);
  const xs = tiles.map((t) => t.x);
  const ys = tiles.map((t) => t.y);
  return {
    x0: Math.min(...xs) * escala,
    x1: (Math.max(...xs) + 1) * escala - 1,
    y0: Math.min(...ys) * escala,
    y1: (Math.max(...ys) + 1) * escala - 1,
  };
}


// ─── El horneado de una tesela ───────────────────────────────────────────────

async function hornear(z, x, y, campo, campoAmplio) {
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

  // De píxel de salida a píxel de cada campo: la relación es lineal, así que
  // basta el origen y el paso. `2^(zDem - z) / 2` porque la tesela de salida
  // tiene 512 px donde una del DEM tiene 256.
  const proyeccion = (c) => {
    const escala = 2 ** (c.zDem - z) / 2;
    return { x0: x * 512 * escala - c.px0, y0: y * 512 * escala - c.py0, paso: escala };
  };
  const fino = proyeccion(campo);
  const amplio = proyeccion(campoAmplio);

  const rgb = Buffer.alloc(512 * 512 * 3);
  let conTierra = false;
  let conEstructura = false;

  for (let oj = 0; oj < 512; oj++) {
    const j = oj + 256;
    for (let oi = 0; oi < 512; oi++) {
      const i = oi + 256;
      const p = j * 1024 + i;
      const cota = malla[p];
      const destino = (oj * 512 + oi) * 3;

      const mar =
        cota < 1 &&
        (esOceano(campo, fino.x0 + oi * fino.paso, fino.y0 + oj * fino.paso) ??
          esOceano(campoAmplio, amplio.x0 + oi * amplio.paso, amplio.y0 + oj * amplio.paso) ??
          true);

      if (mar) {
        // El fino manda donde llega: tiene cuatro veces la resolución del
        // amplio y la plataforma se juega ahí. El amplio sólo entra cuando el
        // fino se queda fuera, que es el mar de Cuba, Jamaica y Puerto Rico en
        // los niveles de arriba.
        const hondo =
          muestrear(campo, fino.x0 + oi * fino.paso, fino.y0 + oj * fino.paso) ??
          muestrear(campoAmplio, amplio.x0 + oi * amplio.paso, amplio.y0 + oj * amplio.paso);
        const prof = hondo === null ? TABLA_MAR.techo : Math.max(0, Math.min(-hondo, TABLA_MAR.techo));
        if (prof < TABLA_MAR.techo) conEstructura = true;
        const e = (prof / TABLA_MAR.paso) | 0;
        rgb[destino] = TABLA_MAR.tabla[e * 3];
        rgb[destino + 1] = TABLA_MAR.tabla[e * 3 + 1];
        rgb[destino + 2] = TABLA_MAR.tabla[e * 3 + 2];
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

      const m = Math.max(0, Math.min(cota, TABLA.techo)) * 3;
      // Por debajo de 1 el color se oscurece; por encima se aclara hacia el
      // blanco, y a un cuarto, porque una ladera al sol que se va a blanco
      // quema el color de la altura, que es lo que tiene que mandar.
      const mult = 0.6 + 0.55 * sombra;
      for (let ch = 0; ch < 3; ch++) {
        const base = TABLA.tabla[m + ch];
        rgb[destino + ch] =
          mult <= 1
            ? Math.round(base * mult)
            : Math.round(base + (255 - base) * Math.min(1, (mult - 1) * 1.5) * 0.25);
      }
    }
  }

  // `uniforme` = ni un metro de tierra ni un píxel por encima del techo de la
  // rampa, o sea abismo de lado a lado y un solo color en toda la tesela.
  return { rgb, uniforme: !conTierra && !conEstructura };
}

// ─── El recorrido de las teselas ─────────────────────────────────────────────

// Una tesela de puro abismo es un solo color de lado a lado: se escribe una vez
// y se copia. No escribirla dejaría un 404 por cada encuadre con mar, y
// MapLibre emite un evento de error por cada uno.
const [marR, marG, marB] = hexARgb(PALETA.mar[PALETA.mar.length - 1][1]);
const MAR_ABIERTO = await sharp({
  create: { width: 512, height: 512, channels: 3, background: { r: marR, g: marG, b: marB } },
})
  .webp({ quality: 80, effort: 6 })
  .toBuffer();

const todas = [];
for (let z = RELIEVE_MINZOOM; z <= RELIEVE_MAXZOOM; z++) {
  todas.push(...teselasDe(z, RELIEVE_BOUNDS));
}

console.log(`${todas.length} teselas de z${RELIEVE_MINZOOM} a z${RELIEVE_MAXZOOM}`);

// Los dos campos, antes de la primera tesela. El fino cubre la caja del relieve
// a resolución z9; el amplio, la extensión de las teselas del nivel más bajo
// (el Caribe entero) a z7.
const campoArranque = Date.now();
const campoFino = await campoDelMar(9, rectanguloDem(teselasDe(9, RELIEVE_BOUNDS), 9, 9));
const campoAmplio = await campoDelMar(
  7,
  rectanguloDem(teselasDe(RELIEVE_MINZOOM, RELIEVE_BOUNDS), RELIEVE_MINZOOM, 7)
);
console.log(
  `campo del mar: ${campoFino.ancho}×${campoFino.alto} a z9 y ` +
    `${campoAmplio.ancho}×${campoAmplio.alto} a z7, batimetría suavizada a ` +
    `${SUAVIZADO_MAR / 1000} km, en ${Math.round((Date.now() - campoArranque) / 1000)} s`
);

let hechas = 0;
let uniformes = 0;
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

  const { rgb, uniforme } = await hornear(z, x, y, campoFino, campoAmplio);
  if (uniforme) {
    await fs.writeFile(destino, MAR_ABIERTO);
    uniformes++;
  } else {
    // `effort: 6` y no 5: son 20 s más de horneado y un 4 % menos de bytes,
    // medido sobre las teselas costeras que el recorrido pide de verdad. Los
    // `preset` de libwebp (photo, picture, drawing) y `smartSubsample` se
    // probaron en el mismo banco y no dan ni eso.
    await sharp(rgb, { raw: { width: 512, height: 512, channels: 3 } })
      .webp({ quality: 80, effort: 6 })
      .toFile(destino);
  }
  bytes += (await fs.stat(destino)).size;
  hechas++;
  if (hechas % 25 === 0) {
    process.stdout.write(`\r  ${hechas}/${todas.length}  ${Math.round(bytes / 1024)} KB`);
  }
}

console.log(
  `\n${hechas} teselas (${uniformes} de mar abierto), ${(bytes / 1024 / 1024).toFixed(1)} MB en ` +
    `${path.relative(process.cwd(), SALIDA)}, en ${Math.round((Date.now() - arranque) / 1000)} s`
);
