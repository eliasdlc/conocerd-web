import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const url = process.env.JOURNEY_URL ?? "http://localhost:3000";
const outputDir = path.resolve(process.env.JOURNEY_ARTIFACTS ?? ".artifacts/journey-smoke");
const viewports = [
  [320, 568],
  [360, 800],
  [390, 844],
  [430, 932],
  [834, 1112],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
];
const scenes = ["hero", "destinos-intro", "polaroid-0", "polaroid-5", "destinos-finale", "mapa", "viajeros", "negocios", "equipo", "cta"];

await fs.mkdir(outputDir, { recursive: true });

for (const [width, height] of viewports) {
  // MapLibre/WebGL contexts are process-scoped and Chromium may defer releasing
  // them after a page closes. A fresh browser per viewport keeps the full matrix
  // deterministic instead of starving the final desktop captures.
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
    headless: "new",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
      isMobile: width < 900,
      hasTouch: width < 900,
    });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
    await page.waitForSelector("h1", { timeout: 15_000 });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const initial = await page.evaluate(() => ({
      active: document.querySelector(".crd-journey")?.getAttribute("data-active-scene") ?? null,
      hero: document.querySelector("h1")?.textContent ?? null,
      xOverflow: document.documentElement.scrollWidth > window.innerWidth,
      rootOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
    }));
    if (!initial.hero?.includes("ConoceRD") || initial.active !== "hero" || initial.xOverflow || initial.rootOverflow === "hidden" || initial.bodyOverflow === "hidden") {
      throw new Error(`Invalid cold load at ${width}x${height}: ${JSON.stringify(initial)}`);
    }

    for (const scene of scenes) {
      const scrollToScene = async () => {
        await page.evaluate((target) => {
          if (target === "hero") {
            window.scrollTo(0, 0);
            return;
          }
          const anchor = document.getElementById(`trigger-${target}`);
          if (!anchor) throw new Error(`Missing anchor for ${target}`);
          window.scrollTo(0, anchor.offsetTop + anchor.offsetHeight / 2 - window.innerHeight);
        }, scene);
      };
      await scrollToScene();
      await new Promise((resolve) => setTimeout(resolve, 80));
      await scrollToScene();
      await new Promise((resolve) => setTimeout(resolve, 1_200));

      const state = await page.evaluate(() => {
        const active = document.querySelector(".crd-journey")?.getAttribute("data-active-scene");
        const heading = document.querySelector(".crd-destinos-heading")?.getBoundingClientRect();
        const deck = document.querySelector(
          ".crd-polaroid-deck, .crd-polaroid-deck-mobile"
        )?.getBoundingClientRect();
        const headingDeckOverlap = Boolean(
          heading &&
          deck &&
          heading.left < deck.right &&
          heading.right > deck.left &&
          heading.top < deck.bottom &&
          heading.bottom > deck.top
        );
        const visibleCards = [...document.querySelectorAll(".crd-destinos-card")].filter(
          (node) => Number(getComputedStyle(node).opacity) > 0.5
        );
        const headingCardOverlap = Boolean(
          heading &&
          visibleCards.some((node) => {
            const card = node.getBoundingClientRect();
            return (
              heading.left < card.right &&
              heading.right > card.left &&
              heading.top < card.bottom &&
              heading.bottom > card.top
            );
          })
        );
        const phoneNode = document.querySelector(".crd-phone-wrap");
        const phone = phoneNode?.getBoundingClientRect();
        const phoneVisible = phoneNode ? Number(getComputedStyle(phoneNode).opacity) > 0.5 : false;
        const phoneFrame = document.querySelector(".crd-phone-frame");
        const phoneFrameTransform = phoneFrame ? getComputedStyle(phoneFrame).transform : null;
        const phoneClipped = Boolean(
          phoneVisible &&
          phone &&
          (phone.left < -1 || phone.right > window.innerWidth + 1 || phone.top < -1 || phone.bottom > window.innerHeight + 1)
        );
        return {
          active,
          noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
          headingDeckOverlap,
          headingRect: heading
            ? { top: heading.top, right: heading.right, bottom: heading.bottom, left: heading.left }
            : null,
          deckRect: deck
            ? { top: deck.top, right: deck.right, bottom: deck.bottom, left: deck.left }
            : null,
          headingCardOverlap,
          phoneClipped,
          phoneFrameTransform,
        };
      });
      if (state.active !== scene) {
        throw new Error(`Wrong active scene at ${width}x${height}: expected ${scene}, got ${state.active}`);
      }
      if (!state.noHorizontalOverflow) {
        throw new Error(`Horizontal overflow in ${scene} at ${width}x${height}`);
      }
      if (scene === "destinos-finale" && state.headingDeckOverlap) {
        throw new Error(
          `Heading/deck overlap at ${width}x${height}: ${JSON.stringify({
            heading: state.headingRect,
            deck: state.deckRect,
          })}`
        );
      }
      if (scene.startsWith("polaroid-") && state.headingCardOverlap) {
        throw new Error(`Heading/card overlap in ${scene} at ${width}x${height}`);
      }
      if (scene === "viajeros" && state.phoneClipped) {
        throw new Error(`Phone clipped at ${width}x${height}`);
      }
      if (scene === "viajeros" && state.phoneFrameTransform !== "none") {
        throw new Error(`Phone screen is distorted at ${width}x${height}: ${state.phoneFrameTransform}`);
      }
      await page.screenshot({ path: path.join(outputDir, `${width}x${height}-${scene}.png`) });
    }
    await page.close();
  } finally {
    await browser.close();
  }
}
