// ─────────────────────────────────────────────────────────────────────────────
//  ¿Las imágenes del correo existen de verdad donde el correo las pide?
//
//  Un correo se manda desde el código de hoy, pero sus fotos se descargan del
//  sitio publicado. Entre las dos cosas cabe una ventana —una foto nueva, un
//  deploy que no ha salido, un archivo renombrado— y dentro de esa ventana el
//  mensaje llega con el nombre del lugar donde debía ir la playa. Nadie se
//  entera hasta que lo abre alguien.
//
//  Esto lo mira antes de enviar, en dos pasos:
//
//   1. Local: cada foto del sitio tiene su copia JPEG para correo. Si falta
//      alguna, es que hay que correr `pnpm email:photos`.
//   2. Publicado: esas copias responden 200 en el sitio de verdad. Si no, es
//      que el deploy que las lleva todavía no ha salido.
//
//  El logo y el sello no se comprueban contra la red a propósito: desde que
//  viajan adjuntos dentro del mensaje (`lib/email/assets.ts`) no dependen de
//  que estén publicados. Sólo se mira que estén en disco, que es de donde los
//  lee el servidor.
//
//  Uso:  pnpm email:check [https://otro-host]
// ─────────────────────────────────────────────────────────────────────────────

import { access, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SITE = (process.argv[2] ?? "https://www.conocerd.app").replace(/\/$/, "");
const ASSETS = path.resolve("public/assets");
const EMAIL_ASSETS = path.join(ASSETS, "email");
const BRAND = ["logo.png", "sello-ruta.png", "sello-viajero.png", "sello-negocio.png"];

const exists = (file) =>
  access(file).then(
    () => true,
    () => false
  );

let problems = 0;

// ─── 1. La marca, que se lee del disco en cada envío ─────────────────────────
for (const file of BRAND) {
  if (await exists(path.join(EMAIL_ASSETS, "marca", file))) continue;
  console.error(`✗ falta public/assets/email/marca/${file} — corre 'pnpm email:assets'`);
  problems++;
}

// ─── 2. Las fotos, que se descargan del sitio publicado ──────────────────────
const photos = (await readdir(ASSETS)).filter(
  (f) => f.startsWith("destino-") && f.endsWith(".webp")
);

const pending = [];
for (const photo of photos) {
  const jpg = photo.replace(/\.webp$/, ".jpg");
  if (await exists(path.join(EMAIL_ASSETS, jpg))) {
    pending.push(jpg);
    continue;
  }
  console.error(`✗ falta public/assets/email/${jpg} — corre 'pnpm email:photos'`);
  problems++;
}

const results = await Promise.all(
  pending.map(async (jpg) => {
    const url = `${SITE}/assets/email/${jpg}`;
    try {
      // `redirect: manual`: un 3xx también es un problema — el proxy de
      // imágenes de un cliente de correo no tiene por qué seguirlo.
      const res = await fetch(url, { method: "HEAD", redirect: "manual" });
      return { jpg, status: res.status };
    } catch (err) {
      return { jpg, status: err instanceof Error ? err.message : "sin respuesta" };
    }
  })
);

const missing = results.filter((r) => r.status !== 200);
for (const { jpg, status } of missing) {
  console.error(`✗ ${SITE}/assets/email/${jpg} → ${status}`);
}
problems += missing.length;

if (problems === 0) {
  console.log(`✓ ${BRAND.length} imágenes de marca en disco`);
  console.log(`✓ ${pending.length} fotos publicadas en ${SITE}`);
} else {
  console.error(
    `\n${problems} imagen(es) que el correo pide y no puede conseguir.` +
      (missing.length ? " Las que fallan por red se arreglan publicando el deploy." : "")
  );
  process.exit(1);
}
