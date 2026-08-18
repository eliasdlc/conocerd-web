// Captura una propuesta de primera pantalla en desktop y móvil.
//
//   node scripts/shot-hero.mjs <slug> [desk|mobile|ambas] [ms extra] [puerto] [descenso 0..1]
//
// Escribe en public/heroes-preview/<slug>-<modo>.png, que es de donde el índice
// (/heroes) saca las miniaturas. Las banderas de WebGL son las mismas que usan
// las capturas del journey: sin swiftshader, cualquier variante con mapa sale
// en blanco bajo headless.
//
// `descenso` (opcional) scrollea esa fracción de la pista antes de disparar y
// guarda aparte como <slug>-<modo>-d<NN>.png: es la única forma de ver si el
// zoom del scrollytelling se lee bien a media bajada. 0 (por defecto) captura
// la primera pantalla tal cual, que es la que usa el índice.
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const [slug, modoArg = "ambas", extraArg = "2600", puerto = "3000", descensoArg = "0"] =
  process.argv.slice(2);
if (!slug) {
  console.error("uso: node scripts/shot-hero.mjs <slug> [desk|mobile|ambas] [ms] [puerto]");
  process.exit(1);
}

const extra = Number(extraArg);
const url = `http://localhost:${puerto}/heroes/${slug}`;
const salida = "public/heroes-preview";
await mkdir(salida, { recursive: true });

const MODOS = {
  desk: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const pedidos = modoArg === "ambas" ? ["desk", "mobile"] : [modoArg];

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  headless: "new",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--in-process-gpu",
  ],
});

for (const modo of pedidos) {
  const vp = MODOS[modo];
  if (!vp) throw new Error(`modo desconocido: ${modo}`);
  const page = await browser.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  await page.setViewport(vp);
  if (vp.isMobile) {
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
  }
  const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, extra));

  const descenso = Math.max(0, Math.min(1, Number(descensoArg) || 0));
  if (descenso > 0) {
    // Scroll suave (no un salto): el motor de la cámara escucha eventos de
    // scroll, y un jump de una sola vez puede capturarse antes del primer rAF.
    await page.evaluate(async (frac) => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const destino = total * frac;
      const pasos = 24;
      for (let i = 1; i <= pasos; i++) {
        window.scrollTo(0, (destino * i) / pasos);
        await new Promise((r) => setTimeout(r, 40));
      }
    }, descenso);
    await new Promise((r) => setTimeout(r, 1200));
  }

  const sufijo = descenso > 0 ? `-d${String(Math.round(descenso * 100)).padStart(2, "0")}` : "";
  const out = `${salida}/${slug}-${modo}${sufijo}.png`;
  await page.screenshot({ path: out });
  console.log(`[${modo}] ${res?.status()} → ${out}`);
  if (errores.length) console.log(`[${modo}] errores:\n  ${errores.slice(0, 8).join("\n  ")}`);
  await page.close();
}

await browser.close();
