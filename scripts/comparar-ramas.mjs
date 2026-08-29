// ─────────────────────────────────────────────────────────────────────────────
//  Compara dos corridas de `probe-rama.mjs`.
//
//  Dos salidas, y la segunda es la que decide:
//
//   · La tabla de números dice cuánto cambió cada métrica. Bytes y llamadas de
//     dibujo son deterministas y se pueden creer tal cual. Los milisegundos sólo
//     valen si las dos corridas salieron del mismo equipo.
//   · El diff de píxeles dice si el cambio se ve. Una rama que quita capas del
//     basemap y da 0,00 % de píxeles distintos está quitando cosas que nadie
//     estaba viendo: eso es ahorro gratis. Si da 3 %, está borrando algo que sí
//     se pintaba, y entonces la pregunta ya no es cuánto ahorra sino qué se
//     llevó por delante.
//
//  Uso:
//    node scripts/comparar-ramas.mjs .artifacts/ramas/base .artifacts/ramas/rama
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [dirBase, dirRama] = process.argv.slice(2);
if (!dirBase || !dirRama) throw new Error("Uso: node scripts/comparar-ramas.mjs <dir-base> <dir-rama>");

const leer = async (d) => JSON.parse(await fs.readFile(path.join(d, "metricas.json"), "utf8"));
const base = await leer(dirBase);
const rama = await leer(dirRama);

const kb = (b) => `${Math.round(b / 1024)} KB`;
const delta = (a, b, fmt = (x) => x) => {
  if (a == null || b == null) return `${fmt(a ?? 0)} → ${fmt(b ?? 0)}`;
  const d = b - a;
  const pct = a === 0 ? "" : ` (${d > 0 ? "+" : ""}${Math.round((d / a) * 100)} %)`;
  return `${fmt(a)} → ${fmt(b)}${pct}`;
};

/**
 * Porcentaje de píxeles que difieren. Dos capturas del mismo basemap con el
 * mismo encuadre deberían dar 0,00; cualquier cosa por encima de ~0,05 es un
 * cambio real y no ruido de compresión.
 */
async function diffPixeles(a, b) {
  const [ia, ib] = await Promise.all([
    sharp(a).raw().ensureAlpha().toBuffer({ resolveWithObject: true }),
    sharp(b).raw().ensureAlpha().toBuffer({ resolveWithObject: true }),
  ]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) return { error: "tamaños distintos" };
  let distintos = 0;
  for (let i = 0; i < ia.data.length; i += 4) {
    // Umbral por canal: por debajo de 4 es ruido del codificador, no un píxel
    // que alguien vería cambiar.
    if (
      Math.abs(ia.data[i] - ib.data[i]) > 4 ||
      Math.abs(ia.data[i + 1] - ib.data[i + 1]) > 4 ||
      Math.abs(ia.data[i + 2] - ib.data[i + 2]) > 4
    ) {
      distintos++;
    }
  }
  const total = ia.data.length / 4;
  return { pct: Math.round((distintos / total) * 10_000) / 100, distintos, total };
}

console.log(`\n═══ ${base.label}  →  ${rama.label} ═══`);

for (const clave of Object.keys(base.viewports)) {
  const b = base.viewports[clave];
  const r = rama.viewports[clave];
  if (!r) continue;

  console.log(`\n── ${clave} ──────────────────────────────────`);
  console.log(`js inicial sin comprimir  ${delta(b.arranque.jsSinComprimir, r.arranque.jsSinComprimir, kb)}`);
  console.log(`js inicial transferido    ${delta(b.arranque.jsTransferido, r.arranque.jsTransferido, kb)}`);
  console.log(`bytes de arranque         ${delta(b.arranque.bytes, r.arranque.bytes, kb)}`);
  console.log(
    `teselas del hero          ${delta(b.arranque.porClase.tesela?.peticiones ?? 0, r.arranque.porClase.tesela?.peticiones ?? 0)}`
  );
  console.log(
    `bytes de tesela del hero  ${delta(b.arranque.porClase.tesela?.bytes ?? 0, r.arranque.porClase.tesela?.bytes ?? 0, kb)}`
  );
  console.log(`bytes del recorrido       ${delta(b.recorridoCompleto.bytes, r.recorridoCompleto.bytes, kb)}`);
  console.log(`ms hasta hero listo       ${delta(b.msHastaHeroListo, r.msHastaHeroListo)}`);

  console.log(`\nescena             dibujos/frame al llegar   ms/frame al llegar     píxeles distintos`);
  for (const escena of Object.keys(b.escenas)) {
    const eb = b.escenas[escena];
    const er = r.escenas[escena];
    if (!er) continue;

    const pngB = path.join(dirBase, clave, `${escena}.png`);
    const pngR = path.join(dirRama, clave, `${escena}.png`);
    let pix = "  (sin captura)";
    try {
      await fs.access(pngB);
      await fs.access(pngR);
      const d = await diffPixeles(pngB, pngR);
      pix = d.error ? `  ${d.error}` : `  ${d.pct.toFixed(2)} %${eb.diffFiable ? "" : "  (no fiable)"}`;
    } catch {
      // Una escena sin lienzo no tiene nada que diffear.
    }

    console.log(
      `  ${escena.padEnd(17)}${delta(eb.llegada.dibujosPorFrame, er.llegada.dibujosPorFrame).padEnd(26)}${delta(eb.llegada.msPorFrameMediana, er.llegada.msPorFrameMediana).padEnd(23)}${pix}`
    );
  }
}

console.log("\nRecordatorio: los ms sólo valen si las dos corridas salieron del mismo equipo.\n");
