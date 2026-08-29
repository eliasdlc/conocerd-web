// ─────────────────────────────────────────────────────────────────────────────
//  Probe comparable entre ramas.
//
//  Existe porque comparar cinco ramas sirve de poco si cada una se mide con un
//  método distinto. Este script es el método: mismas escenas, mismos encuadres,
//  mismas esperas, mismo formato de salida. Lo que cambia entre corridas es el
//  servidor que está escuchando, nunca la regla.
//
//  Mide cuatro cosas:
//
//   1. ARRANQUE. Peticiones y bytes hasta que el hero está en pie, separados por
//      tipo (documento, script, hoja, fuente, imagen, tesela). El JS inicial va
//      aparte, transferido y sin comprimir.
//   2. RENDER. Llamadas de dibujo por fotograma en cada escena, contadas
//      envolviendo `drawElements`/`drawArrays` antes de que cargue nada. Es
//      contabilidad de CPU, así que el número vale igual con GPU y sin ella.
//   3. TIEMPO. Milisegundos por fotograma y tareas largas del hilo principal.
//      Estos SÍ dependen de la máquina: sólo valen comparados con otra corrida
//      del mismo equipo, nunca contra un número de otra máquina.
//   4. PÍXELES. Una captura del viewport por escena, con reduced-motion puesto
//      para que la escena quieta sea siempre la misma imagen. `comparar-ramas.mjs`
//      las diffea: dos ramas que pintan lo mismo dan 0,00 % de píxeles distintos,
//      y ahí es donde se ve si una rama quitó algo que alguien estaba mirando.
//
//  SUELO DE RUIDO, medido corriendo dos veces la MISMA build (agentbox, sin GPU,
//  1440x900). Sin esto no se puede decir si una diferencia es de la rama o del
//  aire, y es la mitad del valor de este script:
//
//    píxeles distintos       0,00 %   en las 8 escenas con diff fiable
//    dibujos por fotograma   0 a 3 %
//    js inicial              0 %      (exacto)
//    bytes del recorrido     0 %      (exacto)
//    teselas del hero        ±6 %
//    ms hasta hero listo     ±19 %
//    ms por fotograma        hasta ±148 %   ← INSERVIBLE sin GPU
//
//  O sea: un cambio de píxeles por encima de 0,1 % es real, uno de dibujos por
//  encima del 5 % es real, y cualquier cifra de milisegundos de una máquina sin
//  GPU no dice nada. Esa última se juzga en la máquina de siempre, o mejor
//  todavía, con la mano en el scroll.
//
//  Uso:
//    PROBE_URL=http://localhost:3000 PROBE_LABEL=dev node scripts/probe-rama.mjs
//
//  Variables:
//    PROBE_URL         servidor a medir           (http://localhost:3000)
//    PROBE_LABEL       nombre de la corrida       (obligatorio)
//    PROBE_OUT         raíz de artefactos         (.artifacts/ramas)
//    PROBE_VIEWPORTS   "390x844,1440x900"
//    PROBE_SWIFTSHADER "1" fuerza render por software (máquinas sin GPU)
//    PROBE_GPU         "1" pide la GPU real en headless; sin esto Chromium cae
//                      a SwiftShader y los ms dejan de medir la máquina
//    PROBE_CHROME_ARGS banderas extra de chromium, separadas por coma
//    PROBE_MOTION      "1" quita reduced-motion: mide el vuelo de cámara de
//                      verdad en vez del salto seco. Sólo con GPU, y las
//                      capturas dejan de servir para el diff de píxeles.
//    CHROMIUM_PATH     binario                    (/usr/bin/chromium)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const url = process.env.PROBE_URL ?? "http://localhost:3000";
const label = process.env.PROBE_LABEL;
if (!label) throw new Error("Falta PROBE_LABEL: sin nombre no se puede comparar una corrida con otra.");

const outDir = path.resolve(process.env.PROBE_OUT ?? ".artifacts/ramas", label);
const viewports = (process.env.PROBE_VIEWPORTS ?? "390x844,1440x900")
  .split(",")
  .map((v) => v.trim().split("x").map(Number));

const SCENES = ["hero", "polaroid-0", "polaroid-5", "destinos-finale", "mapa", "viajeros", "negocios", "equipo", "cta"];

// El lienzo de Viajeros lleva un avatar recorriendo la ruta dentro del propio
// mapa: ninguna captura repite y un diff de píxeles ahí siempre da ruido.
const SIN_DIFF = new Set(["viajeros"]);

const esTesela = (u) => /tiles\.basemaps\.cartocdn\.com|\.pbf(\?|$)|\.mvt(\?|$)/.test(u);
const clasifica = (u, tipo) => {
  if (esTesela(u)) return "tesela";
  if (/basemaps\.cartocdn\.com.*style\.json|tiles\.json/.test(u)) return "estilo";
  if (tipo === "Document") return "documento";
  if (tipo === "Script") return "script";
  if (tipo === "Stylesheet") return "hoja";
  if (tipo === "Font") return "fuente";
  if (tipo === "Image" || tipo === "Media") return "imagen";
  return "otro";
};

/**
 * Envuelve las llamadas de dibujo de WebGL y abre un contador por fotograma.
 * Se inyecta antes que cualquier script de la página: si se instalara después,
 * MapLibre ya tendría su contexto y los envoltorios no lo alcanzarían.
 */
function instrumentar() {
  const estado = { total: 0, frames: [], tareasLargas: 0, msBloqueado: 0 };
  window.__crd = estado;

  for (const Ctx of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Ctx) continue;
    for (const metodo of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const original = Ctx.prototype[metodo];
      if (!original) continue;
      Ctx.prototype[metodo] = function (...args) {
        estado.total++;
        return original.apply(this, args);
      };
    }
  }

  let previo = 0;
  let ultimoT = null;
  const tick = (t) => {
    const dibujos = estado.total - previo;
    previo = estado.total;
    // Sólo interesan los fotogramas en los que el mapa realmente pintó. Los
    // frames en reposo dibujan cero y arrastrarían la mediana al suelo.
    if (dibujos > 0 && ultimoT !== null) estado.frames.push({ dibujos, ms: t - ultimoT });
    ultimoT = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  try {
    new PerformanceObserver((lista) => {
      for (const entrada of lista.getEntries()) {
        estado.tareasLargas++;
        estado.msBloqueado += Math.max(0, entrada.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // Firefox y Safari no traen longtask. El resto de las métricas sigue valiendo.
  }
}

const redondea = (x) => (x == null ? null : Math.round(x * 10) / 10);
const mediana = (xs) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = o.length >> 1;
  return redondea(o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2);
};
const percentil = (xs, p) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return redondea(o[Math.min(o.length - 1, Math.floor((p / 100) * o.length))]);
};

/** Abre el contador de red por CDP, incluidos los workers que piden teselas. */
async function engancharRed(page, registro) {
  const anotar = (sesion) => {
    const pendientes = new Map();
    sesion.on("Network.requestWillBeSent", (e) => {
      pendientes.set(e.requestId, { url: e.request.url, tipo: e.type });
    });
    sesion.on("Network.responseReceived", (e) => {
      const p = pendientes.get(e.requestId);
      if (p) p.tipo = e.type ?? p.tipo;
    });
    sesion.on("Network.loadingFinished", (e) => {
      const p = pendientes.get(e.requestId);
      if (!p) return;
      pendientes.delete(e.requestId);
      registro.push({ url: p.url, clase: clasifica(p.url, p.tipo), bytes: e.encodedDataLength ?? 0 });
    });
  };

  const principal = await page.target().createCDPSession();
  await principal.send("Network.enable");
  anotar(principal);

  // MapLibre parsea y a veces pide teselas desde workers. Sin auto-attach el
  // contador vería la mitad del tráfico y las teselas saldrían en cero.
  await principal.send("Target.setAutoAttach", {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: true,
  });
  principal.on("sessionattached", async (sesion) => {
    try {
      await sesion.send("Network.enable");
      anotar(sesion);
    } catch {
      // Un worker que muere antes de habilitar la red no aporta nada.
    }
  });
  return principal;
}

const resume = (registro) => {
  const porClase = {};
  for (const r of registro) {
    porClase[r.clase] ??= { peticiones: 0, bytes: 0 };
    porClase[r.clase].peticiones++;
    porClase[r.clase].bytes += r.bytes;
  }
  return {
    peticiones: registro.length,
    bytes: registro.reduce((s, r) => s + r.bytes, 0),
    porClase,
  };
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function irAEscena(page, escena, movil) {
  if (movil) {
    for (let guarda = 0; guarda < 10; guarda++) {
      const activa = await page.evaluate(
        () => document.querySelector(".crd-journey")?.getAttribute("data-active-scene") ?? null
      );
      if (activa === escena) break;
      await page.click('button[aria-label="Siguiente escena"]');
      await espera(150);
    }
  } else {
    const ir = async () => {
      await page.evaluate((destino) => {
        if (destino === "hero") return void window.scrollTo(0, 0);
        const ancla = document.getElementById(`trigger-${destino}`);
        if (!ancla) throw new Error(`Falta el ancla de ${destino}`);
        window.scrollTo(0, ancla.offsetTop + ancla.offsetHeight / 2 - window.innerHeight);
      }, escena);
    };
    await ir();
    await espera(80);
    await ir();
  }
  // Con reduced-motion la cámara llega de un salto y 1,4 s sobran. Con el vuelo
  // real activo hace falta más, o la ventana de "reposo" cazaría el final del
  // vuelo y lo contaría como animación en reposo.
  // Con la CDN lenta 1,4 s no bastan y la captura sale con teselas a medio
  // llegar, que en el diff parece un cambio de la rama. `PROBE_ESPERA_MS` sube
  // ese margen; las dos corridas de una comparación tienen que usar el mismo.
  const margen = Number(process.env.PROBE_ESPERA_MS ?? 1_400);
  await espera(process.env.PROBE_MOTION === "1" ? 3_000 : margen);
}

const informe = { label, url, generado: null, viewports: {} };

for (const [ancho, alto] of viewports) {
  const movil = ancho < 900;
  const clave = `${ancho}x${alto}`;
  const args = ["--no-sandbox"];
  if (process.env.PROBE_SWIFTSHADER === "1") args.push("--enable-unsafe-swiftshader", "--use-angle=swiftshader");
  // Chromium sin cabeza cae a SwiftShader aunque la máquina tenga GPU, y
  // entonces los milisegundos miden el render por software en vez del equipo.
  // Con esto se pide la GPU de verdad.
  if (process.env.PROBE_GPU === "1") args.push("--enable-gpu", "--use-angle=gl", "--ignore-gpu-blocklist");
  if (process.env.PROBE_CHROME_ARGS) args.push(...process.env.PROBE_CHROME_ARGS.split(",").filter(Boolean));

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: "new",
    args,
  });

  try {
    const page = await browser.newPage();
    const red = [];
    await engancharRed(page, red);
    await page.evaluateOnNewDocument(instrumentar);
    await page.setViewport({ width: ancho, height: alto, deviceScaleFactor: 1, isMobile: movil, hasTouch: movil });
    // Sin reduced-motion cada captura cae en un punto distinto de la animación
    // y el diff de píxeles deja de significar nada. A cambio, con reduced-motion
    // el vuelo de cámara no existe: se llega de un salto. Por eso `PROBE_MOTION`.
    if (process.env.PROBE_MOTION !== "1") {
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    }

    const t0 = Date.now();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90_000 });
    await page.waitForSelector("h1", { timeout: 20_000 });
    await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 }).catch(() => {});
    // Mismo margen que entre escenas: con la CDN lenta, 1,5 s dejaban el hero
    // sin una sola tesela y la captura salía en crema.
    await espera(Number(process.env.PROBE_ESPERA_MS ?? 1_500));
    const msArranque = Date.now() - t0;

    const arranque = resume(red);
    const jsInicial = red.filter((r) => r.clase === "script");
    const sinComprimir = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .filter((e) => e.initiatorType === "script" || /\.js(\?|$)/.test(e.name))
        .reduce((s, e) => s + (e.decodedBodySize || 0), 0)
    );

    await fs.mkdir(path.join(outDir, clave), { recursive: true });
    const escenas = {};
    let corteRed = red.length;

    for (const escena of SCENES) {
      // Dos ventanas por escena, porque cuestan cosas distintas y una tapa a la
      // otra. LLEGAR es el vuelo de cámara: el mapa repinta cada fotograma y es
      // el momento que el visitante siente como pesado. QUEDARSE es la escena ya
      // quieta: MapLibre no repinta un mapa parado, así que aquí lo normal es
      // cero, y cualquier cosa por encima de cero es alguien animando en reposo.
      await page.evaluate(() => {
        window.__crd.frames.length = 0;
      });
      await irAEscena(page, escena, movil);
      const llegada = await page.evaluate(() => window.__crd.frames.slice());

      const activa = await page.evaluate(
        () => document.querySelector(".crd-journey")?.getAttribute("data-active-scene") ?? null
      );

      await page.evaluate(() => {
        window.__crd.frames.length = 0;
      });
      await espera(1_600);
      const muestra = await page.evaluate(() => ({
        frames: window.__crd.frames.slice(),
        tareasLargas: window.__crd.tareasLargas,
        msBloqueado: Math.round(window.__crd.msBloqueado),
      }));

      const nuevas = red.slice(corteRed);
      corteRed = red.length;

      // Captura del viewport y NO del lienzo por elemento: pedirle a Puppeteer
      // la captura de un elemento lo mete en vista primero, y el lienzo del mapa
      // es sticky, así que ese scroll mueve el recorrido a otra escena. Costó un
      // rato entenderlo: la escena siguiente ya no encontraba su ancla.
      await page.screenshot({ path: path.join(outDir, clave, `${escena}.png`) });

      escenas[escena] = {
        activaReal: activa,
        correcta: activa === escena,
        llegada: {
          framesPintados: llegada.length,
          dibujosPorFrame: mediana(llegada.map((f) => f.dibujos)),
          msPorFrameMediana: mediana(llegada.map((f) => f.ms)),
          msPorFrameP95: percentil(llegada.map((f) => f.ms), 95),
        },
        reposo: {
          framesPintados: muestra.frames.length,
          dibujosPorFrame: mediana(muestra.frames.map((f) => f.dibujos)),
          msPorFrameMediana: mediana(muestra.frames.map((f) => f.ms)),
        },
        tareasLargasAcumuladas: muestra.tareasLargas,
        msBloqueadoAcumulado: muestra.msBloqueado,
        teselasNuevas: nuevas.filter((r) => r.clase === "tesela").length,
        bytesNuevos: nuevas.reduce((s, r) => s + r.bytes, 0),
        diffFiable: !SIN_DIFF.has(escena),
      };
    }

    const total = resume(red);
    informe.viewports[clave] = {
      msHastaHeroListo: msArranque,
      arranque: {
        ...arranque,
        jsTransferido: jsInicial.reduce((s, r) => s + r.bytes, 0),
        jsSinComprimir: sinComprimir,
      },
      recorridoCompleto: total,
      escenas,
    };
    await page.close();
  } finally {
    await browser.close();
  }
}

informe.generado = new Date().toISOString();
await fs.writeFile(path.join(outDir, "metricas.json"), JSON.stringify(informe, null, 2));

for (const [clave, v] of Object.entries(informe.viewports)) {
  const kb = (b) => `${Math.round(b / 1024)} KB`;
  console.log(`\n── ${label} @ ${clave} ─────────────────────────────`);
  console.log(`arranque       ${v.arranque.peticiones} peticiones, ${kb(v.arranque.bytes)}, ${v.msHastaHeroListo} ms`);
  console.log(`js inicial     ${kb(v.arranque.jsTransferido)} transferido, ${kb(v.arranque.jsSinComprimir)} sin comprimir`);
  console.log(`teselas hero   ${v.arranque.porClase.tesela?.peticiones ?? 0}, ${kb(v.arranque.porClase.tesela?.bytes ?? 0)}`);
  console.log(`recorrido      ${v.recorridoCompleto.peticiones} peticiones, ${kb(v.recorridoCompleto.bytes)}`);
  console.log("                   ─── llegada (el vuelo) ───   ── reposo ──");
  console.log("escena             frames dibujos ms/f  p95    frames dibujos   teselas");
  for (const [escena, e] of Object.entries(v.escenas)) {
    const aviso = e.correcta ? "" : `  ⚠ activa=${e.activaReal}`;
    const c = (x, n) => String(x ?? "-").padStart(n);
    console.log(
      `  ${escena.padEnd(17)}${c(e.llegada.framesPintados, 6)}${c(e.llegada.dibujosPorFrame, 8)}${c(e.llegada.msPorFrameMediana, 5)}${c(e.llegada.msPorFrameP95, 7)}${c(e.reposo.framesPintados, 11)}${c(e.reposo.dibujosPorFrame, 8)}${c(e.teselasNuevas, 10)}${aviso}`
    );
  }
}
console.log(`\nartefactos en ${outDir}`);
