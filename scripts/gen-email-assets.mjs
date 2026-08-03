// ─────────────────────────────────────────────────────────────────────────────
//  Genera los PNG que van dentro de los correos.
//
//  Los clientes de correo no pintan SVG, así que el sello (un componente React
//  lleno de filtros) y el logo tienen que viajar rasterizados. En vez de
//  mantener una copia a mano —que se queda vieja al primer retoque del sello—,
//  este script abre /dev/email-assets con Chromium y fotografía cada
//  `[data-asset]` a 2×. La fuente de verdad sigue siendo el componente.
//
//  Uso (con el servidor de desarrollo ya levantado):
//    pnpm email:assets [url-base]
//
//  Chromium: se busca en CHROMIUM_PATH o en las rutas habituales de Linux.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT_DIR = path.resolve("public/assets/email");

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
].filter(Boolean);

const executablePath = CHROMIUM_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No encontré Chromium. Define CHROMIUM_PATH con la ruta al binario.");
  process.exit(1);
}

/**
 * Repasa el PNG recién capturado en un canvas y arregla dos cosas:
 *
 *  1. El fondo. Chromium no devuelve transparencia perfecta ni con
 *     `omitBackground`: deja una película de alpha 1–3 sobre TODA la caja, y
 *     sobre el crema del correo eso se ve como un rectángulo un punto más
 *     oscuro alrededor del logo. El umbral es bajísimo para no comerse el
 *     borde suave de la sombra del sello.
 *  2. El peso. El degradado del papel del sello no repite dos píxeles iguales
 *     y PNG lo comprime fatal (170 kB por un sello de 296 px). Redondear cada
 *     canal a múltiplos de 8 es invisible en un cuño de tinta plana y deja el
 *     archivo a la mitad — en un correo que se abre con datos móviles eso sí
 *     se nota.
 */
async function scrubAlpha(page, base64, threshold = 6) {
  const cleaned = await page.evaluate(
    (data, min) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = () => reject(new Error("no pude releer la captura"));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const px = ctx.getImageData(0, 0, canvas.width, canvas.height);
          for (let i = 3; i < px.data.length; i += 4) {
            if (px.data[i] < min) {
              px.data[i] = 0;
              px.data[i - 1] = 0;
              px.data[i - 2] = 0;
              px.data[i - 3] = 0;
            } else {
              px.data[i - 3] &= ~7;
              px.data[i - 2] &= ~7;
              px.data[i - 1] &= ~7;
            }
          }
          ctx.putImageData(px, 0, 0);
          resolve(canvas.toDataURL("image/png").split(",")[1]);
        };
        img.src = `data:image/png;base64,${data}`;
      }),
    base64,
    threshold
  );
  return Buffer.from(cleaned, "base64");
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  // 2× para que el PNG aguante pantallas retina a la mitad de su tamaño.
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });

  const res = await page.goto(`${BASE}/dev/email-assets`, {
    waitUntil: "networkidle0",
    timeout: 60_000,
  });
  if (!res?.ok()) {
    throw new Error(
      `/dev/email-assets respondió ${res?.status()}. ¿Está el servidor de desarrollo levantado en ${BASE}?`
    );
  }
  // Las fuentes llegan por next/font: sin esperarlas, el mono del sello sale
  // con la tipografía de reserva y las líneas cambian de ancho.
  await page.evaluate(() => document.fonts.ready);

  const targets = await page.$$eval("[data-asset]", (els) =>
    els.map((el) => el.getAttribute("data-asset"))
  );
  if (targets.length === 0) throw new Error("La página no expuso ningún [data-asset].");

  for (const name of targets) {
    const el = await page.$(`[data-asset="${name}"]`);
    const shot = await el.screenshot({ encoding: "base64", omitBackground: true });
    const png = await scrubAlpha(page, shot);
    const file = path.join(OUT_DIR, `${name}.png`);
    await writeFile(file, png);
    console.log("✓", path.relative(process.cwd(), file));
  }
} finally {
  await browser.close();
}
