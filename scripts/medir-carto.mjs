// ─────────────────────────────────────────────────────────────────────────────
//  ¿Cuánto cuesta Carto HOY, después del relieve horneado y de las provincias?
//
//    pnpm medir:carto <baseUrl> [movil|escritorio|ambos]
//
//  Corre DOS ramas del mismo recorrido, una detrás de otra, en el MISMO proceso
//  del MISMO navegador, para que la comparación no arrastre diferencias de
//  máquina ni de sesión:
//
//    con   el sitio tal cual está en dev
//    sin   el mismo sitio con el estilo de Carto reducido a su capa
//          `background` y su servidor de glifos. Ni una tesela vectorial, ni
//          agua, ni carreteras, ni frontera, ni mancha urbana, ni topónimos.
//
//  La rama `sin` NO es una propuesta de producto: es el techo del premio, o sea
//  todo lo que se ahorraría si Carto desapareciera y no se repusiera nada. Lo
//  que costaría reponerlo se cuenta aparte.
//
//  Los glifos siguen saliendo de Carto en la rama `sin` a propósito: los
//  nombres de provincia son nuestros pero se dibujan con el juego de fuentes
//  del estilo, así que sin un servidor de glifos no hay toponimia de ninguna
//  clase. Van en su propia fila de la tabla.
//
//  Mide, por rama y viewport: peticiones y bytes reales por grupo, llamadas de
//  dibujo por frame en cada escena (con la cámara quieta, forzando repintado),
//  tareas largas, y qué capas pintan de verdad un rasgo en cada escena.
//
//  QUÉ MÁQUINA PUEDE CORRER QUÉ. Las peticiones, los bytes y las llamadas de
//  dibujo son CUENTAS: salen igual en cualquier máquina, agentbox incluido. La
//  columna fps es VELOCIDAD y sólo vale donde hay GPU: sin ella Chromium cae a
//  SwiftShader y el número mide el rasterizador, no el cambio (decisiones del
//  30 ago, punto 4). En agentbox se lee todo menos fps; en la laptop se lee
//  todo, y es ahí donde se cierra el gate de la fase.
//
//  Los bytes salen de CDP y no de `content-length`: Next sirve su propio JS y su
//  CSS con `transfer-encoding: chunked` y sin esa cabecera, así que contarla da
//  cero para los 600 KB del bundle. Y tampoco de la Resource Timing API, que
//  suma las respuestas servidas desde la caché del navegador a su tamaño
//  completo: eso es lo que infla el relieve, porque el calentador
//  (lib/calentarTeselas) le mete teselas en la caché a propósito.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import puppeteer from "puppeteer-core";

const [base = "http://localhost:3111", cual = "ambos"] = process.argv.slice(2);

const VIEWPORTS = {
  movil: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  escritorio: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

// 13 escenas, 12 saltos.
const ESCENAS = [
  "hero", "polaroid-0", "polaroid-1", "polaroid-2", "polaroid-3", "polaroid-4",
  "polaroid-5", "destinos-finale", "mapa", "viajeros", "negocios", "equipo", "cta",
];

const ESTILO_CARTO = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TILEJSON_CARTO = "https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Grupos de red ───────────────────────────────────────────────────────────
//
// Los glifos de Carto se sirven en `.pbf`, igual que las teselas vectoriales,
// así que la tabla de `pnpm medir` los mete dentro de "teselas Carto" y no se
// ven. Aquí van separados por la ruta `/fonts/`, que es lo que distingue una
// cosa de la otra, porque el coste de reponerlos es distinto: una tesela se
// hornea, un glifo hay que servirlo.
const GRUPOS = [
  [/\/relieve\/v\d+\//, "relieve"],
  [/\/data\/provincias\//, "provincias (nuestro)"],
  [/cartocdn\.com.*\/fonts\//, "glifos Carto"],
  [/cartocdn\.com.*sprite/, "sprite Carto"],
  [/cartocdn\.com.*\.json/, "estilo y TileJSON Carto"],
  [/cartocdn\.com/, "teselas Carto"],
  [/\.(pbf|mvt)($|\?)/, "teselas Carto"],
  [/gibs\.earthdata|blue.?marble|nasa/i, "NASA (hero)"],
  [/\.js($|\?)/, "JS de la app"],
  [/\.css($|\?)/, "CSS"],
  [/\.(woff2?|ttf|otf)($|\?)/, "fuentes"],
  [/\.(mp4|webm|mov)($|\?)/, "vídeo"],
  [/\.(webp|png|jpe?g|avif|svg|gif)($|\?)/, "imágenes"],
];
const grupoDe = (url) => GRUPOS.find(([re]) => re.test(url))?.[1] ?? "otros";

// ─── El navegador ────────────────────────────────────────────────────────────
//
// El backend de ANGLE se elige probándolo, no por costumbre.
//
// `--use-angle=gl` (lo que usa `scripts/medir-recorrido.mjs`) pide GL de
// escritorio, y sin un display eso NO consigue contexto WebGL en una máquina
// con GPU: medido en la laptop, `getContext("webgl2")` devuelve null, MapLibre
// no llega a emitir `load` y la medición se queda esperando 120 s y se cae.
// Funciona en agentbox sólo porque allí no hay GPU y Chromium cae al
// rasterizador por software.
//
// `--use-angle=gles-egl` entra por el nodo de render (`/dev/dri/renderD128`) y
// da la GPU de verdad sin display: en la laptop devuelve la Iris Xe por Mesa.
// Se prueban en orden y se usa el primero que dé contexto, para que el mismo
// instrumento valga en las dos máquinas.
const BACKENDS = [
  ["gles-egl", ["--use-gl=angle", "--use-angle=gles-egl", "--enable-gpu", "--ignore-gpu-blocklist"]],
  ["vulkan", ["--use-gl=angle", "--use-angle=vulkan", "--enable-gpu", "--ignore-gpu-blocklist"]],
  ["gl", ["--use-gl=angle", "--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"]],
  ["software", ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--in-process-gpu"]],
];

async function elegirBackend() {
  for (const [nombre, args] of BACKENDS) {
    try {
      const b = await puppeteer.launch({
        executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
        headless: "new",
        args: ["--no-sandbox", ...args],
        timeout: 30_000,
      });
      const p = await b.newPage();
      await p.goto("about:blank");
      const r = await p.evaluate(() => {
        const c = document.createElement("canvas");
        const gl = c.getContext("webgl2") ?? c.getContext("webgl");
        if (!gl) return null;
        const d = gl.getExtension("WEBGL_debug_renderer_info");
        return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      });
      await b.close();
      if (r) return { nombre, args, renderer: r };
    } catch {
      // Un backend que ni siquiera arranca es sencillamente el que no toca.
    }
  }
  throw new Error("ningun backend de ANGLE da contexto WebGL en esta maquina");
}

await fs.mkdir(".artifacts/carto", { recursive: true });
const backend = await elegirBackend();
console.log(`backend de ANGLE: ${backend.nombre} → ${backend.renderer}`);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", ...backend.args],
});

// El estilo real, una vez, para poder recortarlo sin inventarme nada: la rama
// `sin` usa EXACTAMENTE la capa `background` de Positron y su `glyphs`.
const estiloReal = await (await fetch(ESTILO_CARTO)).json();
const estiloRecortado = {
  version: estiloReal.version,
  name: "solo-fondo",
  glyphs: estiloReal.glyphs,
  sources: {},
  layers: estiloReal.layers.filter((c) => c.type === "background"),
};
console.log(
  `estilo de Carto: ${estiloReal.layers.length} capas, ${Object.keys(estiloReal.sources).length} fuentes` +
    ` → recortado a ${estiloRecortado.layers.length} capa (${estiloRecortado.layers.map((c) => c.id).join()})`
);

// ─── Una corrida ─────────────────────────────────────────────────────────────

async function corrida(nombreVp, rama) {
  // Un contexto de incógnito POR CORRIDA. El mismo proceso del mismo navegador
  // (que es lo que hace comparable la medida) pero con caché propia: en la
  // primera pasada las dos ramas compartían la caché de disco y la segunda leía
  // de ahí lo que la primera había bajado. El vídeo del hero pasaba de 2.786 KB
  // a 0 sin que nadie hubiera cambiado nada.
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(VIEWPORTS[nombreVp]);
  if (VIEWPORTS[nombreVp].isMobile) {
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
  }

  // Contador de llamadas de dibujo, antes de que corra un solo script de la
  // página. Cuenta por frame, no por segundo: es la unidad de la auditoría del
  // 28 ago (26 en el hero, 246 en negocios) y no depende de la velocidad de la
  // máquina.
  await page.evaluateOnNewDocument(() => {
    const w = window;
    w.__dib = { total: 0, previo: 0, porFrame: [] };
    for (const P of [WebGLRenderingContext, WebGL2RenderingContext]) {
      for (const m of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
        const orig = P.prototype[m];
        if (!orig) continue;
        P.prototype[m] = function (...a) {
          w.__dib.total++;
          return orig.apply(this, a);
        };
      }
    }
    const tic = () => {
      w.__dib.porFrame.push(w.__dib.total - w.__dib.previo);
      w.__dib.previo = w.__dib.total;
      if (w.__dib.porFrame.length > 600) w.__dib.porFrame.shift();
      requestAnimationFrame(tic);
    };
    requestAnimationFrame(tic);
  });

  if (rama === "sin") {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith(ESTILO_CARTO)) {
        // El estilo, recortado a la capa de fondo. No hay fuente `carto`, así
        // que MapLibre no pide una sola tesela vectorial.
        return req.respond({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(estiloRecortado),
        });
      }
      // El calentador pide el TileJSON por su cuenta (lib/calentarTeselas). Sin
      // él lanza y se rinde, que es lo que haría si Carto no existiera.
      if (url.startsWith(TILEJSON_CARTO)) return req.abort();
      return req.continue();
    });
  }

  // Los bytes salen de CDP, no de la cabecera `content-length`.
  //
  // Next sirve su propio JS y su CSS con `transfer-encoding: chunked` y sin
  // `content-length`, así que contar esa cabecera daba CERO para los 598 KB de
  // JS de la app. `Network.loadingFinished.encodedDataLength` es lo que el
  // navegador recibió de verdad por el cable, comprimido y con cabeceras, y
  // vale 0 cuando la respuesta salió de la caché. Eso resuelve las dos cosas a
  // la vez: los bytes de verdad, y separar red de caché sin tener que
  // adivinarlo.
  //
  // Importa que sea CDP y no `performance.getEntriesByType("resource")`: las
  // teselas vectoriales las pide el worker de MapLibre, y lo que pide un worker
  // no entra en el timeline de la página.
  const bytes = new Map();
  const fallos = [];
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  const urlDe = new Map();
  cdp.on("Network.requestWillBeSent", (e) => urlDe.set(e.requestId, e.request.url));
  cdp.on("Network.responseReceived", (e) => {
    urlDe.set(e.requestId, e.response.url);
    if (e.response.status >= 400) fallos.push(`${e.response.status} ${e.response.url.slice(0, 90)}`);
  });
  cdp.on("Network.loadingFinished", (e) => {
    const url = urlDe.get(e.requestId);
    if (!url) return;
    const g = grupoDe(url);
    const n = e.encodedDataLength ?? 0;
    const prev = bytes.get(g) ?? { n: 0, red: 0, kbRed: 0 };
    bytes.set(g, { n: prev.n + 1, red: prev.red + (n > 0 ? 1 : 0), kbRed: prev.kbRed + n / 1024 });
  });
  page.on("pageerror", (e) => fallos.push(`JS ${String(e).slice(0, 120)}`));

  await page.goto(`${base}/?medir=mudo`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => window.__crdMedicion && window.__crdMedicion().arranque.mapaLoadMs !== null,
    { timeout: 120_000, polling: 500 }
  );
  await espera(2500);

  // Con qué está dibujando REALMENTE, leído del contexto del propio mapa y no
  // de un navegador aparte. Es lo que separa un fps que vale de uno que mide un
  // rasterizador por software: si aquí pone SwiftShader o llvmpipe, la columna
  // fps de esta corrida no significa nada y hay que decirlo en la misma tabla.
  const gpu = await page.evaluate(() => {
    const m = window.__crdMapa;
    const lienzo = m?.getCanvas?.();
    const gl = lienzo?.getContext("webgl2") ?? lienzo?.getContext("webgl");
    if (!gl) return "sin contexto webgl";
    const d = gl.getExtension("WEBGL_debug_renderer_info");
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });

  const porEscena = [];

  // Llamadas de dibujo con la cámara QUIETA en la escena. `triggerRepaint` en
  // bucle obliga a MapLibre a redibujar el mismo encuadre: eso aísla el coste
  // de dibujar la escena del coste de mover la cámara, y es el número que la
  // auditoría llamó "llamadas de dibujo por frame".
  const medirEscena = async (indice) => {
    const dib = await page.evaluate(async () => {
      const m = window.__crdMapa;
      window.__dib.porFrame.length = 0;
      const t0 = performance.now();
      let vueltas = 0;
      while (performance.now() - t0 < 1600) {
        m?.triggerRepaint?.();
        await new Promise((r) => requestAnimationFrame(r));
        vueltas++;
      }
      const ms = performance.now() - t0;
      const f = window.__dib.porFrame.filter((n) => n > 0);
      if (!f.length) return { frames: 0, mediana: 0, pico: 0, fps: Math.round((vueltas / ms) * 1000) };
      const s = [...f].sort((a, b) => a - b);
      return {
        frames: f.length,
        mediana: s[Math.floor(s.length / 2)],
        pico: s[s.length - 1],
        // Cuántos frames sale capaz de producir el renderer con la cámara
        // quieta y repintando a la fuerza. En agentbox esto NO significa nada:
        // sin GPU cae a un rasterizador por software y mide el rasterizador.
        // En la laptop es el gate de la fase.
        fps: Math.round((vueltas / ms) * 1000),
      };
    });

    // Qué pinta de verdad cada capa en este encuadre, agrupado por fuente: es
    // lo que separa "la capa está en el estilo" de "la capa dibuja algo aquí".
    const capas = await page.evaluate(() => {
      const m = window.__crdMapa;
      if (!m) return { zoom: null, porCapa: [] };
      const cuenta = new Map();
      for (const f of m.queryRenderedFeatures()) {
        const k = `${f.layer.source ?? "-"}|${f.layer.id}`;
        cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
      }
      return {
        zoom: Number(m.getZoom().toFixed(2)),
        porCapa: [...cuenta].map(([k, n]) => {
          const [fuente, capa] = k.split("|");
          return { fuente, capa, rasgos: n };
        }),
      };
    });

    // Las escenas donde hay algo que MIRAR, no sólo que contar: el globo del
    // hero (que es donde el agua de Carto es el mundo entero), un closeup, y
    // las tres escenas de mapa que son el gate de fps.
    if (["hero", "polaroid-5", "mapa", "viajeros", "negocios"].includes(ESCENAS[indice])) {
      await page.screenshot({
        path: `.artifacts/carto/${nombreVp}-${rama}-${ESCENAS[indice]}.png`,
      });
    }

    porEscena.push({ escena: ESCENAS[indice], ...dib, ...capas });
  };

  await medirEscena(0);

  for (let i = 1; i < ESCENAS.length; i++) {
    if (VIEWPORTS[nombreVp].isMobile) {
      await page.evaluate(async () => {
        for (let n = 0; n < 40; n++) {
          const b = document.querySelector('button[aria-label="Siguiente escena"]');
          if (b) return b.click();
          await new Promise((r) => setTimeout(r, 250));
        }
      });
    } else {
      await page.mouse.move(VIEWPORTS[nombreVp].width / 2, VIEWPORTS[nombreVp].height / 2);
      await page.mouse.wheel({ deltaY: 200 });
    }
    // El vuelo dura 1,15 s (2,6 el primero) y después siguen llegando teselas.
    await espera(i === 1 ? 4200 : 3000);
    await medirEscena(i);
  }

  // Lo que la Resource Timing API ve, para poder contrastarlo con lo que ve el
  // navegador. MapLibre pide las teselas VECTORIALES desde su worker, y un
  // recurso pedido desde un worker no entra en el timeline de la página: la
  // tabla de `pnpm medir` sale de ahí y por eso cuenta de menos.
  const segunTiming = await page.evaluate(() => {
    const e = performance.getEntriesByType("resource");
    const cuenta = (re) => e.filter((r) => re.test(r.name)).length;
    return {
      pbfCarto: cuenta(/cartocdn\.com.*\.pbf/),
      relieve: cuenta(/\/relieve\/v\d+\//),
      total: e.length,
    };
  });

  const informe = await page.evaluate(() => window.__crdMedicion());
  await page.close();
  await ctx.close();

  const red = [...bytes]
    .map(([grupo, v]) => ({
      grupo,
      peticiones: v.n,
      aLaRed: v.red,
      kbALaRed: Math.round(v.kbRed),
    }))
    .sort((a, b) => b.kbALaRed - a.kbALaRed);

  return {
    viewport: nombreVp,
    rama,
    gpu,
    segunTiming,
    arranque: informe.arranque,
    totales: informe.totales,
    red,
    escenas: porEscena,
    fallos: [...new Set(fallos)].slice(0, 8),
  };
}

// ─── Las cuatro corridas, en la misma sesión ─────────────────────────────────

const cuales = cual === "ambos" ? ["movil", "escritorio"] : [cual];
const salida = [];

for (const vp of cuales) {
  for (const rama of ["con", "sin"]) {
    const t0 = Date.now();
    console.log(`\n▶ ${vp} · Carto ${rama}…`);
    const r = await corrida(vp, rama);
    salida.push(r);
    console.log(`  ${Math.round((Date.now() - t0) / 1000)} s · dibujando con: ${r.gpu}`);
    console.table(r.red);
    console.log(
      `  totales: ${r.totales.peticiones} peticiones · ${r.totales.kb} KB (timing API) · ` +
        `${r.totales.tareasLargas} tareas largas, peor ${r.totales.peorTareaMs} ms`
    );
    console.table(
      r.escenas.map((e) => ({
        escena: e.escena,
        z: e.zoom,
        "dibujos/frame": e.mediana,
        pico: e.pico,
        fps: e.fps,
        capas: e.porCapa.length,
        rasgos: e.porCapa.reduce((a, c) => a + c.rasgos, 0),
      }))
    );
    if (r.fallos.length) console.log("  fallos:", r.fallos);
  }
}

// ─── La comparación ──────────────────────────────────────────────────────────

console.log("\n\n════ Carto, lo que cuesta hoy ════");
for (const vp of cuales) {
  const con = salida.find((s) => s.viewport === vp && s.rama === "con");
  const sin = salida.find((s) => s.viewport === vp && s.rama === "sin");
  const kbDe = (r, g) => r.red.find((x) => x.grupo === g)?.kbALaRed ?? 0;
  const pDe = (r, g) => r.red.find((x) => x.grupo === g)?.aLaRed ?? 0;
  const gruposCarto = ["teselas Carto", "estilo y TileJSON Carto", "sprite Carto", "glifos Carto"];

  console.log(`\n── ${vp} ──`);
  console.log(`  GPU: ${con.gpu}`);
  if (/swiftshader|llvmpipe|software/i.test(con.gpu)) {
    console.log("  ¡OJO! rasterizador por software: las columnas fps de abajo NO valen.");
  }
  console.log(
    `  teselas .pbf de Carto: el navegador ve ${pDe(con, "teselas Carto")} salir a la red,` +
      ` la Resource Timing API sólo ${con.segunTiming.pbfCarto}` +
      ` (las del worker de MapLibre no entran en el timeline de la página).`
  );
  console.table(
    gruposCarto.map((g) => ({
      grupo: g,
      "pet. con": pDe(con, g),
      "KB con": kbDe(con, g),
      "pet. sin": pDe(sin, g),
      "KB sin": kbDe(sin, g),
    }))
  );
  const totalRed = (r) => r.red.reduce((a, g) => a + g.aLaRed, 0);
  const totalKb = (r) => r.red.reduce((a, g) => a + g.kbALaRed, 0);
  console.table([
    {
      "": "peticiones a la red",
      con: totalRed(con),
      sin: totalRed(sin),
      delta: totalRed(sin) - totalRed(con),
    },
    {
      "": "KB a la red",
      con: totalKb(con),
      sin: totalKb(sin),
      delta: totalKb(sin) - totalKb(con),
    },
    {
      "": "tareas largas",
      con: con.totales.tareasLargas,
      sin: sin.totales.tareasLargas,
      delta: sin.totales.tareasLargas - con.totales.tareasLargas,
    },
    {
      "": "peor tarea (ms)",
      con: con.totales.peorTareaMs,
      sin: sin.totales.peorTareaMs,
      delta: sin.totales.peorTareaMs - con.totales.peorTareaMs,
    },
    {
      "": "mapa quieto (ms)",
      con: con.arranque.mapaQuietoMs,
      sin: sin.arranque.mapaQuietoMs,
      delta: sin.arranque.mapaQuietoMs - con.arranque.mapaQuietoMs,
    },
  ]);
  console.log("  llamadas de dibujo por frame, escena a escena:");
  console.table(
    ESCENAS.map((nombre, i) => {
      const a = con.escenas[i] ?? {};
      const b = sin.escenas[i] ?? {};
      return {
        escena: nombre,
        z: a.zoom,
        con: a.mediana,
        sin: b.mediana,
        delta: (b.mediana ?? 0) - (a.mediana ?? 0),
        "%": a.mediana ? `${Math.round((((b.mediana ?? 0) - a.mediana) / a.mediana) * 100)} %` : "",
        "fps con": a.fps,
        "fps sin": b.fps,
      };
    })
  );
}

await browser.close();
await fs.mkdir(".artifacts", { recursive: true });
await fs.writeFile(".artifacts/probe-carto.json", JSON.stringify(salida, null, 2));
console.log("\ninforme crudo: .artifacts/probe-carto.json");
