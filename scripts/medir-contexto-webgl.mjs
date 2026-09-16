// ─────────────────────────────────────────────────────────────────────────────
//  El mapa se apaga a mitad del recorrido, y no vuelve.
//
//    pnpm medir:contexto <baseUrl> [movil|escritorio] [normal|forzar] [sinvideo]
//    pnpm medir:contexto <baseUrl> movil normal "bloquea=app-panel-negocio"
//
//  Recorre las 13 escenas escuchando `webglcontextlost` y preguntando al mapa
//  cuántos rasgos dibuja de verdad en cada una. Existe porque una pérdida de
//  contexto no se ve como un error: el mapa deja de pintar, `queryRenderedFeatures`
//  devuelve vacío y la cámara se congela, así que en cualquier tabla de medida
//  sale como una escena que no tiene nada que dibujar.
//
//  Lo medido en la laptop (Intel Iris Xe, Mesa, Chromium headless con
//  `--use-angle=gles-egl`), reproducible en las dos orientaciones:
//
//    con vídeo                muere en `viajeros` a los ~30 s
//    sin el del panel         muere en `viajeros` a los ~30 s
//    sin los tres de viajeros muere en `negocios` a los ~34 s
//    vídeos recodificados     muere igual: no es el peso, es decodificar
//    sin ningún vídeo         las 13 escenas completas
//
//  O sea: cualquier vídeo que arranque tumba el contexto, en la escena donde
//  arranca. En agentbox (Intel HD 530) NO pasa, así que depende del driver.
//
//  MapLibre hace su parte (`_contextLost` llama a `preventDefault` y
//  `_contextRestored` rehace el estilo entero), y `components/map/engine`
//  escucha las dos. Lo que falla es que el navegador nunca emite
//  `webglcontextrestored`: se pierde el canal con la GPU y no vuelve. Por eso
//  la suposición escrita en `engine.tsx` ("MapLibre se restaura solo") no
//  alcanza, y hacen falta las cuatro escenas de después para verlo.
// ─────────────────────────────────────────────────────────────────────────────

import puppeteer from "puppeteer-core";
const perfil = process.argv[2] ?? "movil";
const forzar = process.argv[3] === "forzar";
// `sinvideo` bloquea los mp4 de las maquetas. La escena donde se pierde el
// contexto es justo donde entran: si sin ellos el contexto aguanta, el que se
// come la memoria de la GPU es el decodificador de video, no el mapa.
const sinVideo = process.argv.includes("sinvideo");
// Un patrón para bloquear sólo algunos vídeos y ver cuál es el que tumba el
// contexto: `bloquea=panel` deja fuera el del panel del negocio.
const bloquea = (process.argv.find((a) => a.startsWith("bloquea=")) ?? "").split("=")[1];
const VP = perfil === "movil"
  ? { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: "new",
  args: ["--no-sandbox","--use-gl=angle","--use-angle=gles-egl","--enable-gpu","--ignore-gpu-blocklist"] });
const p = await b.newPage();
await p.setViewport(VP);
if (VP.isMobile) await p.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
await p.evaluateOnNewDocument(() => {
  window.__gl = { perdido: false, restaurado: false, cuando: null, razon: null };
  document.addEventListener("webglcontextlost", (e) => {
    window.__gl.perdido = true; window.__gl.cuando = Math.round(performance.now()); window.__gl.razon = e.statusMessage ?? null;
  }, true);
  document.addEventListener("webglcontextrestored", () => { window.__gl.restaurado = true; }, true);
});
if (sinVideo || bloquea) {
  const re = bloquea ? new RegExp(bloquea) : /\.mp4($|\?)/;
  await p.setRequestInterception(true);
  p.on("request", (r) => (re.test(r.url()) ? r.abort() : r.continue()));
}
const errores = [];
p.on("pageerror", (e) => errores.push(String(e).slice(0, 140)));
p.on("console", (m) => { if (m.type() === "error" || /webgl|context|gpu/i.test(m.text())) errores.push(m.text().slice(0, 140)); });
await p.goto("http://localhost:3111/?medir=mudo", { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForFunction(() => window.__crdMedicion && window.__crdMedicion().arranque.mapaLoadMs !== null, { timeout: 120000, polling: 500 });
await espera(2500);
const ESC = ["hero","polaroid-0","polaroid-1","polaroid-2","polaroid-3","polaroid-4","polaroid-5","destinos-finale","mapa","viajeros","negocios","equipo","cta"];
for (let i = 0; i < 13; i++) {
  if (i > 0) {
    if (VP.isMobile) await p.evaluate(async () => { for (let n=0;n<40;n++){const x=document.querySelector('button[aria-label="Siguiente escena"]'); if(x) return x.click(); await new Promise(r=>setTimeout(r,250));} });
    else { await p.mouse.move(VP.width/2, VP.height/2); await p.mouse.wheel({ deltaY: 200 }); }
    await espera(i === 1 ? 4200 : 3000);
  }
  if (forzar) {
    await p.evaluate(async () => { const m = window.__crdMapa; const t0 = performance.now();
      while (performance.now() - t0 < 1600) { m?.triggerRepaint?.(); await new Promise(r => requestAnimationFrame(r)); } });
  }
  const e = await p.evaluate(() => ({ gl: window.__gl, z: +(window.__crdMapa?.getZoom?.() ?? -1).toFixed(2), capas: window.__crdMapa?.queryRenderedFeatures?.().length ?? -1 }));
  console.log(`${String(i).padStart(2)} ${ESC[i].padEnd(16)} z${String(e.z).padEnd(6)} rasgos ${String(e.capas).padStart(4)}  ${e.gl.perdido ? "PERDIDO a "+e.gl.cuando+" ms"+(e.gl.restaurado?" (restaurado)":"") : "ok"}`);
}
if (errores.length) console.log("errores:", [...new Set(errores)].slice(0, 5));
await b.close();
