// ─────────────────────────────────────────────────────────────────────────────
//  Pesa el hero y el amanecer: qué pide el sitio desde que abre hasta que la
//  cámara aterriza en el primer destino.
//
//    node scripts/medir-hero.mjs <baseUrl> [escritorio|movil] [--lento]
//
//  Mide desde FUERA de la página, con el protocolo del navegador (CDP), así que
//  no necesita que el sitio lleve nada dentro: sirve igual en esta rama, en
//  `dev` o contra un preview de Vercel, y por eso se puede comparar un antes y
//  un después que viven en commits distintos.
//
//  `encodedDataLength` y no `transferSize`: el peso del timing API vale 0 en
//  todo lo que viene de otro origen sin Timing-Allow-Origin, que es justamente
//  lo que hay que pesar aquí (la NASA y Carto).
//
//  `unicas` es lo que paga una visita fría. Una petición repetida dentro de la
//  misma sesión sale de la caché del navegador y no cruza la red.
// ─────────────────────────────────────────────────────────────────────────────

import puppeteer from "puppeteer-core";

const [base = "http://localhost:3000", perfil = "escritorio", ...flags] = process.argv.slice(2);
const lento = flags.includes("--lento");
const movil = perfil === "movil";

const VIEWPORT = movil
  ? { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false };

const GRUPOS = [
  [/gibs\.earthdata|blue.?marble|nasa/i, "NASA (teselas)"],
  [/\/mundo\/v\d+\//, "mundo horneado"],
  [/nubes\.webp/, "nubes"],
  [/\.(pbf|mvt)($|\?)/, "teselas Carto"],
  [/cartocdn\.com/, "estilo y glifos Carto"],
  [/\.js($|\?)/, "JS de la app"],
  [/\.css($|\?)/, "CSS"],
  [/\.(woff2?|ttf|otf)($|\?)/, "fuentes"],
  [/\.(mp4|webm|mov)($|\?)/, "vídeo"],
  [/\.(webp|png|jpe?g|avif|svg|gif)($|\?)/, "imágenes"],
];
const grupoDe = (url) => GRUPOS.find(([re]) => re.test(url))?.[1] ?? "otros";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: "new",
  // GPU de verdad: bajo swiftshader el globo no se dibuja y se mediría una
  // escena que no se está pintando.
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"],
});

const page = await browser.newPage();
await page.setViewport(VIEWPORT);
if (movil) {
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  );
}

const cdp = await page.createCDPSession();
await cdp.send("Network.enable");
if (lento) {
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

const bytes = new Map();
const urlDe = new Map();
cdp.on("Network.responseReceived", (e) => urlDe.set(e.requestId, e.response.url));
const sumar = (id, len) => {
  const url = urlDe.get(id);
  if (!url) return;
  urlDe.delete(id);
  const g = grupoDe(url);
  const prev = bytes.get(g) ?? { n: 0, kb: 0, urls: new Set() };
  prev.urls.add(url);
  bytes.set(g, { n: prev.n + 1, kb: prev.kb + (len || 0) / 1024, urls: prev.urls });
};
cdp.on("Network.loadingFinished", (e) => sumar(e.requestId, e.encodedDataLength));
cdp.on("Network.loadingFailed", (e) => sumar(e.requestId, 0));

// El LCP se observa desde dentro, que es el único sitio donde existe.
await page.evaluateOnNewDocument(() => {
  window.__lcp = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime);
  }).observe({ type: "largest-contentful-paint", buffered: true });
});

await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

// El hero en reposo: el globo tiene que estar dibujado antes de bajar.
await page.waitForSelector("canvas.maplibregl-canvas", { timeout: 60_000 });
await espera(lento ? 9000 : 4000);

// El amanecer entero: el descenso del globo al primer destino es lo que pide
// las capas del cielo. Dos pasos bastan para pasarlo de largo.
for (let i = 0; i < 2; i++) {
  if (movil) {
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
  await espera(lento ? 9000 : 4500);
}

const lcp = await page.evaluate(() => window.__lcp);
await browser.close();

const filas = [...bytes.entries()]
  .map(([grupo, v]) => ({ grupo, peticiones: v.n, unicas: v.urls.size, kb: Math.round(v.kb) }))
  .sort((a, b) => b.kb - a.kb);

const ajeno = filas.filter((f) => f.grupo.includes("NASA") || f.grupo.includes("Carto"));
console.log(`\n── Hero y amanecer · ${perfil}${lento ? " lento" : ""} · ${VIEWPORT.width}x${VIEWPORT.height} ──`);
console.table(filas);
console.log(
  `LCP ${lcp} ms · ${filas.reduce((a, f) => a + f.peticiones, 0)} peticiones, ` +
    `${filas.reduce((a, f) => a + f.kb, 0)} KB · de dominios ajenos: ` +
    `${ajeno.reduce((a, f) => a + f.peticiones, 0)} peticiones, ${ajeno.reduce((a, f) => a + f.kb, 0)} KB`
);
