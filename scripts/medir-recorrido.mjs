// ─────────────────────────────────────────────────────────────────────────────
//  Recorre las 13 escenas y saca el informe de la sonda (`?medir`).
//
//    node scripts/medir-recorrido.mjs <baseUrl> [movil|escritorio] [--lento]
//
//  `--lento` pone perfil de teléfono: CPU a un cuarto y 4G (1,6 Mbps, 150 ms
//  RTT). Sin él mide la máquina tal cual, que sirve para comparar dos builds
//  entre sí pero no dice lo que ve un visitante.
//
//  Imprime tres tablas (arranque, escenas, red) y deja el informe crudo en
//  `.artifacts/medicion-<perfil>.json` para poder diffear dos corridas.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const [base = "http://localhost:3000", perfil = "movil", ...flags] = process.argv.slice(2);
const lento = flags.includes("--lento");
const movil = perfil === "movil";

const VIEWPORT = movil
  ? { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false };

const PASOS = 12; // 13 escenas, 12 saltos
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Los mismos grupos que la sonda, para poder cruzar las dos tablas.
const GRUPOS = [
  [/\/relieve\/v\d+\//, "relieve"],
  [/\.(pbf|mvt)($|\?)/, "teselas Carto"],
  [/cartocdn\.com.*(sprite|glyph|\.json)/, "estilo y glifos Carto"],
  [/gibs\.earthdata|blue.?marble|nasa/i, "NASA (hero)"],
  [/\.js($|\?)/, "JS de la app"],
  [/\.css($|\?)/, "CSS"],
  [/\.(woff2?|ttf|otf)($|\?)/, "fuentes"],
  [/\.(mp4|webm|mov)($|\?)/, "vídeo"],
  [/\.(webp|png|jpe?g|avif|svg|gif)($|\?)/, "imágenes"],
];
const grupoDe = (url) => GRUPOS.find(([re]) => re.test(url))?.[1] ?? "otros";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: "new",
  // GPU de verdad. Con swiftshader la capa `color-relief` ni siquiera compila
  // su shader ("Could not compile fragment shader") y el mapa sale en blanco:
  // se medirían fps de una escena que no se está dibujando. `CRD_GPU=software`
  // vuelve al render por CPU para comparar contra medidas viejas.
  args:
    process.env.CRD_GPU === "software"
      ? [
          "--no-sandbox",
          "--use-gl=angle",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
          "--in-process-gpu",
        ]
      : ["--no-sandbox", "--use-gl=angle", "--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"],
});

const page = await browser.newPage();
await page.setViewport(VIEWPORT);
if (movil) {
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );
}

if (lento) {
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

// `transferSize` vale 0 en todo lo que viene de otro origen sin
// Timing-Allow-Origin, que es justo lo que hay que pesar: el DEM, Carto y la
// NASA. Los bytes de verdad se cuentan desde el proceso del navegador.
const bytes = new Map();
page.on("response", async (r) => {
  const len = Number(r.headers()["content-length"] ?? 0);
  const g = grupoDe(r.url());
  const prev = bytes.get(g) ?? { n: 0, kb: 0 };
  bytes.set(g, { n: prev.n + 1, kb: prev.kb + len / 1024 });
});

await page.goto(`${base}/?medir=mudo`, { waitUntil: "domcontentloaded", timeout: 120_000 });

// El mapa tiene que existir antes de empezar a pedir pasos: si no, los primeros
// saltos miden una página sin mapa y el informe sale limpio por el motivo malo.
await page.waitForFunction(
  () => window.__crdMedicion && window.__crdMedicion().arranque.mapaLoadMs !== null,
  { timeout: 120_000, polling: 500 }
);
await espera(lento ? 6000 : 2500);

for (let i = 0; i < PASOS; i++) {
  if (movil) {
    // El botón se desmonta y vuelve durante el vuelo: se pulsa desde la página,
    // esperando a que exista en ese instante.
    await page.evaluate(async () => {
      for (let n = 0; n < 40; n++) {
        const b = document.querySelector('button[aria-label="Siguiente escena"]');
        if (b) return b.click();
        await new Promise((r) => setTimeout(r, 250));
      }
    });
  } else {
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    await page.mouse.wheel({ deltaY: 200 });
  }
  // Un paso dura 1,15 s (2,6 el primero) y después el mapa sigue trayendo lo
  // suyo: se le da el vuelo más un respiro, que es lo que la sonda mide como
  // "hasta quieto".
  await espera(lento ? 9000 : 4500);
}

const informe = await page.evaluate(() => window.__crdMedicion());
await browser.close();

const etiqueta = `${perfil}${lento ? "-lento" : ""}`;
await fs.mkdir(".artifacts", { recursive: true });
await fs.writeFile(`.artifacts/medicion-${etiqueta}.json`, JSON.stringify(informe, null, 2));

console.log(`\n── Arranque (${etiqueta}, ${informe.viewport.w}x${informe.viewport.h}) ──`);
console.table([informe.arranque]);
console.log("── Por escena: vuelo de la cámara, y lo que sigue llegando después ──");
console.table(informe.escenas);
console.log("── Red por grupo (bytes reales del navegador, no del timing API) ──");
console.table(
  informe.red.map((g) => {
    const real = bytes.get(g.grupo);
    return { ...g, kbReal: real ? Math.round(real.kb) : 0, respuestas: real?.n ?? 0 };
  })
);
console.log("── Totales ──");
console.table([informe.totales]);
console.log(`\nInforme crudo: .artifacts/medicion-${etiqueta}.json`);
