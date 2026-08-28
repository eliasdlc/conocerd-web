// ─────────────────────────────────────────────────────────────────────────────
//  Genera los fotogramas del recorrido con el MISMO MapLibre y el MISMO estilo
//  que se usan en vivo.
//
//  Por eso no son una versión "parecida" del mapa: son el mapa, capturado. Lo
//  que cambia es cuándo se rasteriza. Hoy el navegador lo redibuja ~20 veces por
//  segundo mientras bajas; con esto se rasteriza una vez, aquí.
//
//  No basta con un fotograma por escena. Entre el hero (z2,5) y el primer
//  destino (z11,5) hay NUEVE niveles de zoom: a mitad de camino la imagen del
//  hero habría que ampliarla 22 veces y la del destino reducirla a 1/22, así que
//  ninguna de las dos sirve y el mapa desaparece. Los tramos con mucho salto
//  reciben fotogramas intermedios, calculados con la misma cámara del recorrido
//  (`window.__crdCamara`) para que la trayectoria sea exactamente la de hoy.
//
//  Uso:  pnpm start -p 3100    (en otra terminal)
//        node scripts/gen-mapa-escenas.mjs
// ─────────────────────────────────────────────────────────────────────────────

import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";

const CHROME = process.env.CHROME_PATH ?? "/usr/bin/chromium";
const ORIGEN = process.env.ORIGEN ?? "http://localhost:3100";
const SALIDA = path.resolve("public/mapa");

// Ancho de captura. Es también el ancho al que el navegador pinta la imagen,
// así que define cuánto mundo representa: cambiarlo cambia la escala del mapa.
//
// 2560 y no 1920 por el padding de cámara: en escritorio el recorrido reserva
// el 44 % izquierdo para el texto, lo que empuja el mapa 0,22 x ancho de
// ventana hacia la derecha. En una ventana de 1536 eso son 338 px, y con una
// captura de 1920 sólo quedan 192 px de margen a cada lado: se veía el borde
// de la imagen. Con 2560 el margen es de 512 px y cubre ventanas de hasta
// ~2300 px.
const ANCHO = 2560;
const ALTO = 1440;

/**
 * A partir de cuántos niveles de zoom un tramo necesita fotogramas intermedios.
 * Con 2,5 la ampliación máxima de un fotograma es 2^1,25 ≈ 2,4x, que aguanta
 * sin verse blanda.
 */
const SALTO_MAX = 2.5;

async function main() {
  mkdirSync(SALIDA, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: ANCHO, height: ALTO, deviceScaleFactor: 1 });
  await page.goto(`${ORIGEN}/?motor=vuelos&globo=off`, { waitUntil: "load", timeout: 90000 });
  await page.waitForFunction(
    () => window.__crdMap && window.__crdMap.isStyleLoaded() && window.__crdCamara,
    { timeout: 60000 }
  );
  await new Promise((r) => setTimeout(r, 3000));

  // Los keyframes del recorrido, con su punto de progreso, tal y como los define
  // lib/journey.ts. Se leen de la página para no duplicar la tabla aquí.
  const bandas = await page.evaluate(() => window.__crdBandas);

  // Se parte cada tramo hasta que ningún salto pase de SALTO_MAX niveles.
  const puntos = [];
  for (let i = 0; i < bandas.length; i++) {
    puntos.push({ id: bandas[i].name, p: bandas[i].center });
    if (i === bandas.length - 1) break;
    const a = bandas[i].center;
    const b = bandas[i + 1].center;
    const za = (await page.evaluate((x) => window.__crdCamara(x), a)).zoom;
    const zb = (await page.evaluate((x) => window.__crdCamara(x), b)).zoom;
    const trozos = Math.ceil(Math.abs(zb - za) / SALTO_MAX);
    for (let k = 1; k < trozos; k++) {
      puntos.push({ id: `t-${bandas[i].name}-${k}`, p: a + ((b - a) * k) / trozos });
    }
  }

  // Sólo el canvas. Se sube desde él hasta <body> ocultando en cada nivel a los
  // hermanos: queda exactamente la cadena que lleva al mapa y nada más.
  //
  // Poner `visibility: hidden` en `body > *` y luego `visible` en la cadena del
  // canvas NO sirve: visibility se hereda, así que devolver la cadena a visible
  // resucita a todos sus descendientes y el hero acaba cocido en la imagen.
  await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    for (let n = canvas; n && n !== document.body; n = n.parentElement) {
      for (const hermano of n.parentElement.children) {
        if (hermano !== n) hermano.style.display = "none";
      }
    }
    for (const hijo of document.body.children) {
      if (!hijo.contains(canvas) && hijo.tagName !== "SCRIPT") hijo.style.display = "none";
    }
    document
      .querySelectorAll(".maplibregl-marker, .maplibregl-control-container")
      .forEach((el) => (el.style.display = "none"));
  });

  const colados = await page.evaluate(
    () =>
      [...document.querySelectorAll("h1, h2, .crd-ol-panel, .crd-nav-pill")].filter(
        (el) => el.getBoundingClientRect().width > 0
      ).length
  );
  if (colados > 0) {
    throw new Error(`${colados} elementos del recorrido siguen visibles: la captura saldría con overlays cocidos`);
  }

  const manifiesto = [];
  for (const punto of puntos) {
    const cam = await page.evaluate((x) => window.__crdCamara(x), punto.p);
    const jump = { ...cam, padding: { top: 0, right: 0, bottom: 0, left: 0 } };

    await page.evaluate((c) => window.__crdMap.jumpTo(c), jump);
    // Dos pasadas: la primera dispara la descarga de los tiles del encuadre, la
    // segunda captura con todo ya teselado.
    await new Promise((r) => setTimeout(r, 7000));
    await page.evaluate((c) => window.__crdMap.jumpTo(c), jump);
    await new Promise((r) => setTimeout(r, 3000));

    const tmp = path.join(SALIDA, `${punto.id}.tmp.png`);
    await page.screenshot({ path: tmp });
    const png = await readFile(tmp);
    const info = await sharp(png).webp({ quality: 82 }).toFile(path.join(SALIDA, `${punto.id}.webp`));
    await unlink(tmp);

    manifiesto.push({ id: punto.id, p: punto.p, center: cam.center, zoom: cam.zoom });
    console.log(
      `${punto.id.padEnd(22)} p=${punto.p.toFixed(4)} z${cam.zoom.toFixed(2)}  ${(info.size / 1024).toFixed(0)} KB`
    );
  }

  // El componente lee esto para saber qué fotograma hay, dónde manda cada uno y
  // con qué cámara se capturó.
  writeFileSync(
    path.resolve("src/data/mapa-escenas.json"),
    JSON.stringify({ ancho: ANCHO, alto: ALTO, fotogramas: manifiesto }, null, 2) + "\n"
  );
  console.log(`\n${manifiesto.length} fotogramas · manifiesto en src/data/mapa-escenas.json`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
