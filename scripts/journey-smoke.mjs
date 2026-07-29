import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const url = process.env.JOURNEY_URL ?? "http://localhost:3000";
const outputDir = path.resolve(process.env.JOURNEY_ARTIFACTS ?? ".artifacts/journey-smoke");
const viewports = [
  [320, 568], [390, 844], [430, 932], [768, 1024], [1440, 900],
];
const scenes = ["hero", "destinos-intro", "polaroid-0", "polaroid-5", "mapa", "viajeros", "negocios", "equipo", "cta"];

await fs.mkdir(outputDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader"],
});

try {
  for (const [width, height] of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

    const initial = await page.evaluate(() => ({
      active: document.querySelector("[aria-current]")?.getAttribute("aria-label") ?? null,
      hero: document.querySelector("h1")?.textContent ?? null,
      xOverflow: document.documentElement.scrollWidth > window.innerWidth,
      rootOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
    }));
    if (!initial.hero?.includes("ConoceRD") || initial.active?.includes("Descarga") || initial.xOverflow || initial.rootOverflow === "hidden" || initial.bodyOverflow === "hidden") {
      throw new Error(`Invalid cold load at ${width}x${height}: ${JSON.stringify(initial)}`);
    }

    for (const scene of scenes) {
      await page.evaluate((target) => document.getElementById(`trigger-${target}`)?.scrollIntoView(), scene);
      await new Promise((resolve) => setTimeout(resolve, 250));
      const state = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      if (!state) throw new Error(`Horizontal overflow in ${scene} at ${width}x${height}`);
      await page.screenshot({ path: path.join(outputDir, `${width}x${height}-${scene}.png`) });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
