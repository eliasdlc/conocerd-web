// ─────────────────────────────────────────────────────────────────────────────
//  Genera las fotos de los destinos en el formato que los correos sí pintan.
//
//  El sitio sirve WebP, pero un correo no es un navegador: Outlook de escritorio
//  (motor de Word) y Apple Mail viejo no saben leer WebP y dejan la tarjeta con
//  el texto alternativo donde debía ir la playa. JPEG lo entiende todo desde
//  hace treinta años.
//
//  De paso pesan menos: el correo se abre con datos móviles y una ruta de tres
//  paradas se descarga entera.
//
//  Contrato de nombres — `/assets/destino-x.webp` → `/assets/email/destino-x.jpg`.
//  Lo mismo que hace `photoUrl()` en `lib/itinerary/email.ts`; si cambia uno,
//  cambia el otro.
//
//  Uso:  pnpm email:photos
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const SRC_DIR = path.resolve("public/assets");
const OUT_DIR = path.resolve("public/assets/email");

/** El doble del ancho de la tarjeta (598 px) para que aguante pantallas retina. */
const WIDTH = 1196;
/** Calidad: por encima de 70 el archivo crece sin que la foto mejore a este tamaño. */
const QUALITY = 68;

await mkdir(OUT_DIR, { recursive: true });

const sources = (await readdir(SRC_DIR)).filter(
  (f) => f.startsWith("destino-") && f.endsWith(".webp")
);
if (sources.length === 0) {
  console.error("No encontré ninguna foto `destino-*.webp` en public/assets.");
  process.exit(1);
}

let total = 0;
for (const file of sources.sort()) {
  const out = path.join(OUT_DIR, file.replace(/\.webp$/, ".jpg"));
  const jpeg = await sharp(path.join(SRC_DIR, file))
    // `withoutEnlargement`: las fotos de 960 px se quedan como están antes que
    // inventar píxeles que el cliente de correo va a volver a encoger.
    .resize({ width: WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();
  await writeFile(out, jpeg);
  total += jpeg.length;
  console.log("✓", path.relative(process.cwd(), out).padEnd(46), `${Math.round(jpeg.length / 1024)} kB`);
}

console.log(`\n${sources.length} fotos · ${Math.round(total / 1024)} kB en total`);
