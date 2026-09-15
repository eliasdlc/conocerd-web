// ─────────────────────────────────────────────────────────────────────────────
//  Hornea el cielo del hero: de 512 teselas de la NASA a dos imágenes nuestras.
//
//    pnpm mundo              hornea lo que falte
//    pnpm mundo --rehacer    vuelve a hornear aunque ya exista
//    pnpm mundo --calidad 62 prueba otra calidad de WebP
//    pnpm mundo --lado 3072  fuerza el mismo lado para las dos capas
//
//  Qué hace. Baja el mosaico Mercator completo de GIBS al nivel 4 (16 × 16
//  teselas de 256 px = 4096 × 4096, el mundo entero), lo escala al lado que
//  pide cada capa y lo guarda como WebP en `public/mundo/<versión>/`.
//
//  Por qué existe, con su medida. Las dos capas se servían teseladas desde
//  gibs.earthdata.nasa.gov hasta el nivel 8: 189 peticiones en móvil y 176 en
//  escritorio por recorrido, mediana de 124 ms cada una y 272 ms en perfil 4G,
//  para un cielo que se apaga antes del primer destino. Horneadas son dos.
//
//  El lado de cada capa y su porqué viven en `src/lib/mundo.ts`, junto a las
//  esquinas, para que el horneado y el runtime no puedan separarse.
//
//  Las teselas de origen quedan cacheadas en `.cache/gibs` (fuera de git), así
//  que un segundo horneado no vuelve a bajar los 2,7 MB de la NASA.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MUNDO_LADO, MUNDO_VERSION } from "../src/lib/mundo.ts";

const args = process.argv.slice(2);
const flag = (nombre, porDefecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : porDefecto;
};
const REHACER = args.includes("--rehacer");
const CALIDAD = flag("calidad", 72);
const LADO_FORZADO = flag("lado", 0);

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
/** Nivel del mosaico de origen: 16 × 16 teselas de 256 px = el mundo a 4096. */
const Z = 4;
const N = 2 ** Z;
const TESELA = 256;

/** Las dos capas de GIBS, con el nombre que usan las nuestras. */
const CAPAS = {
  noche: "VIIRS_CityLights_2012",
  dia: "BlueMarble_NextGeneration",
};

const SALIDA = path.resolve("public/mundo", MUNDO_VERSION);
const CACHE = path.resolve(".cache/gibs");

// ─── Descarga ────────────────────────────────────────────────────────────────

/** Una tesela, de la caché o de GIBS. El orden de la URL es z/y/x, no z/x/y. */
async function tesela(capa, y, x) {
  const destino = path.join(CACHE, capa, String(Z), String(y), `${x}.jpg`);
  try {
    return await fs.readFile(destino);
  } catch {}

  const url = `${GIBS}/${capa}/default/500m/GoogleMapsCompatible_Level8/${Z}/${y}/${x}.jpg`;
  // Tres intentos: GIBS devuelve 502 de vez en cuando y una tesela que falta
  // deja un cuadro negro en mitad del planeta.
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await fs.mkdir(path.dirname(destino), { recursive: true });
        await fs.writeFile(destino, buf);
        return buf;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500 * (intento + 1)));
  }
  throw new Error(`no se pudo bajar ${capa} ${Z}/${y}/${x}`);
}

// ─── Horneado ────────────────────────────────────────────────────────────────

async function hornear(nombre, capa) {
  const destino = path.join(SALIDA, `${nombre}.webp`);
  if (!REHACER) {
    try {
      await fs.access(destino);
      console.log(`${nombre}: ya existe, se salta (--rehacer para forzar)`);
      return;
    } catch {}
  }

  const piezas = [];
  let crudos = 0;
  // De 12 en 12: con más, GIBS empieza a devolver 502.
  const trabajos = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) trabajos.push([y, x]);
  for (let i = 0; i < trabajos.length; i += 12) {
    const lote = await Promise.all(
      trabajos.slice(i, i + 12).map(async ([y, x]) => ({
        input: await tesela(capa, y, x),
        top: y * TESELA,
        left: x * TESELA,
      }))
    );
    for (const p of lote) {
      crudos += p.input.length;
      piezas.push(p);
    }
    process.stdout.write(`\r${nombre}: ${piezas.length}/${trabajos.length} teselas`);
  }

  const lado = LADO_FORZADO || MUNDO_LADO[nombre];
  const mosaico = await sharp({
    create: { width: N * TESELA, height: N * TESELA, channels: 3, background: "#000" },
  })
    .composite(piezas)
    .png()
    .toBuffer();

  const salida = await sharp(mosaico)
    .resize(lado, lado, { kernel: "lanczos3" })
    .webp({ quality: CALIDAD, effort: 6 })
    .toBuffer();

  await fs.mkdir(SALIDA, { recursive: true });
  await fs.writeFile(destino, salida);
  console.log(
    `\r${nombre}: ${lado}×${lado}, calidad ${CALIDAD} → ${(salida.length / 1024).toFixed(0)} KB` +
      ` (${(crudos / 1024).toFixed(0)} KB crudos de GIBS en ${piezas.length} teselas)`
  );
}

await fs.mkdir(CACHE, { recursive: true });
for (const [nombre, capa] of Object.entries(CAPAS)) await hornear(nombre, capa);
