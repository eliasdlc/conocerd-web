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

// WebGL antes que nada. Bajo carga, el proceso de GPU de Chromium a veces no
// levanta: MapLibre no arranca, no se pide una sola tesela y el informe sale
// precioso. Medido el 14 sep 2026 con la máquina a load 12, dos corridas
// seguidas dieron cero peticiones al cielo por esto y no por el cambio.
const webgl = await page.evaluate(() => {
  const c = document.createElement("canvas");
  return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
});
if (!webgl) {
  console.error("Sin WebGL en este Chromium: el mapa no puede arrancar y la medida no valdría.");
  await browser.close();
  process.exit(1);
}

await page.goto("about:blank");
await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });

// El hero en reposo: el globo tiene que estar dibujado antes de bajar.
await page.waitForSelector("canvas.maplibregl-canvas", { timeout: 60_000 });

// Y el cielo tiene que haber MONTADO, no sólo el lienzo existir. Sin esperar a
// esto, en una máquina cargada el recorrido avanzaba antes de que el mapa
// terminara de arrancar y el informe salía con cero peticiones al cielo: limpio
// por el motivo equivocado. El cielo son las nubes y las dos capas de la
// Tierra, vengan de donde vengan.
const CIELO = ["NASA (teselas)", "mundo horneado", "nubes"];
const hayCielo = () => CIELO.some((g) => bytes.has(g));
const arranque = Date.now();
while (!hayCielo() && Date.now() - arranque < (lento ? 90_000 : 45_000)) await espera(500);
const cieloMs = Date.now() - arranque;
await espera(lento ? 9000 : 4000);

/** La escena que el recorrido dice estar pintando. */
const escena = () =>
  page.evaluate(
    () => document.querySelector(".crd-journey")?.getAttribute("data-active-scene") ?? null
  );

// El amanecer entero: el descenso del globo al primer destino es lo que pide
// las capas del cielo. Se avanza HASTA la escena, no N veces: un gesto que se
// pierde (y se pierden, porque la rueda llega antes de que hidrate) dejaba la
// cámara en el hero y el informe salía limpio por el motivo equivocado.
const META = "polaroid-1";
const limite = Date.now() + (lento ? 120_000 : 60_000);
let llegada = await escena();
while (llegada !== META && Date.now() < limite) {
  if (movil) {
    const boton = await page.$('button[aria-label="Siguiente escena"]');
    if (boton) await boton.click();
  } else {
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    await page.mouse.wheel({ deltaY: 200 });
  }
  await espera(lento ? 3000 : 1500);
  llegada = await escena();
}
// Con la cámara ya asentada, lo que siga llegando es del tramo, no del gesto.
await espera(lento ? 9000 : 4500);

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
// Sin esta línea el informe no se puede comparar con otro: una corrida que se
// quedó en el hero pide una fracción de lo que pide el descenso completo.
console.log(
  `Escena al cerrar: ${llegada ?? "desconocida"}${llegada === META ? "" : "  ← NO llegó, la medida no compara"}` +
    ` · el cielo montó a los ${(cieloMs / 1000).toFixed(1)} s${hayCielo() ? "" : "  ← NUNCA montó, la medida no vale"}`
);
