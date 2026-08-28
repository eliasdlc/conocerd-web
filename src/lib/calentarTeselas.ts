// ─────────────────────────────────────────────────────────────────────────────
//  Calienta la caché HTTP del navegador con las teselas que el recorrido va a
//  pedir, antes de que MapLibre las pida.
//
//  El problema que resuelve: quien entra por primera vez recorre destino por
//  destino y cada uno se descarga en el momento en que la cámara llega. Medido
//  con perfil de teléfono (4G, CPU 4x), la primera tesela del hero se pide a
//  los 2638 ms y tarda 520 en llegar. Las de cada destino cuestan lo mismo, una
//  por una, mientras la persona baja.
//
//  Este módulo no mete nada en la caché de MapLibre: eso no tiene API pública.
//  Mete las teselas en la caché HTTP del navegador, que Carto sirve con
//  `max-age` de 180 días. Cuando MapLibre las pida, salen del disco en vez de
//  la red. Sigue costando descomprimir, parsear y subir a GPU, pero se ahorra
//  el viaje, que es la parte cara en un teléfono.
//
//  No importa maplibre ni nada que lo arrastre: vive en el bundle inicial.
// ─────────────────────────────────────────────────────────────────────────────

import { CARTO_TILEJSON } from "@/lib/basemap";

export type Tesela = { z: number; x: number; y: number };

/**
 * Regla de reparto de subdominios de MapLibre, copiada de `CanonicalTileID.url`
 * en maplibre-gl: `urls[(x + y) % urls.length]`. Es la única pieza de MapLibre
 * que este módulo replica; la plantilla en sí sale del TileJSON, no de aquí.
 */
export function urlDeTesela(plantillas: readonly string[], { z, x, y }: Tesela): string {
  return plantillas[(x + y) % plantillas.length]
    .replace(/\{z\}/g, String(z))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y))
    .replace(/\{ratio\}/g, "");
}

// ─── Geometría ───────────────────────────────────────────────────────────────

const mercY = (lat: number) =>
  0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);

/** Teselas que cubren un encuadre, en Web Mercator, con `margen` de holgura. */
export function teselasDeEncuadre(
  centro: readonly [number, number],
  zoom: number,
  ancho: number,
  alto: number,
  margen = 1
): Tesela[] {
  const z = Math.max(0, Math.floor(zoom));
  const n = 2 ** z;
  // Un mundo mide 512 · 2^zoom píxeles; la mitad del viewport en fracción de mundo.
  const mundoPx = 512 * 2 ** zoom;
  const medioX = ancho / 2 / mundoPx;
  const medioY = alto / 2 / mundoPx;

  const cx = (centro[0] + 180) / 360;
  const cy = mercY(centro[1]);

  const x0 = Math.floor((cx - medioX) * n) - margen;
  const x1 = Math.floor((cx + medioX) * n) + margen;
  const y0 = Math.floor((cy - medioY) * n) - margen;
  const y1 = Math.floor((cy + medioY) * n) + margen;

  const out: Tesela[] = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= n) continue;
      out.push({ z, x: ((x % n) + n) % n, y });
    }
  }
  return out;
}

/**
 * República Dominicana con holgura: la isla entera más la franja de mar que
 * entra en cualquier encuadre del recorrido. Sirve para no calentar teselas de
 * medio mundo cuando una escena está muy alejada.
 */
const RD = { oeste: -72.1, sur: 17.35, este: -68.25, norte: 20.1 };

export function tocaRD({ z, x, y }: Tesela): boolean {
  const n = 2 ** z;
  const lng = (a: number) => (a / n) * 360 - 180;
  const lat = (b: number) => {
    const t = Math.PI - (2 * Math.PI * b) / n;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(t) - Math.exp(-t)));
  };
  return (
    lng(x + 1) > RD.oeste && lng(x) < RD.este && lat(y) > RD.sur && lat(y + 1) < RD.norte
  );
}

export const claveTesela = ({ z, x, y }: Tesela) => `${z}/${x}/${y}`;

export function unicas(teselas: Tesela[]): Tesela[] {
  const vistas = new Set<string>();
  return teselas.filter((t) => {
    const k = claveTesela(t);
    if (vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
}

// ─── Descarga ────────────────────────────────────────────────────────────────

/** Plantillas de tesela del TileJSON. Ya está precargado, así que sale de caché. */
export async function plantillasDeTesela(señal?: AbortSignal): Promise<string[]> {
  const res = await fetch(CARTO_TILEJSON, { signal: señal });
  if (!res.ok) throw new Error(`TileJSON ${res.status}`);
  const json: { tiles?: unknown } = await res.json();
  const tiles = json.tiles;
  if (!Array.isArray(tiles) || !tiles.every((t): t is string => typeof t === "string")) {
    throw new Error("TileJSON sin lista de tiles");
  }
  return tiles;
}

/**
 * Trae las teselas a la caché del navegador. `concurrencia` se queda corta a
 * propósito: si esto satura la conexión compite con las teselas que MapLibre
 * está pidiendo para lo que la persona mira ahora mismo, y el resultado neto
 * sería peor.
 */
export async function traerTeselas(
  urls: readonly string[],
  { concurrencia = 4, señal }: { concurrencia?: number; señal?: AbortSignal } = {}
): Promise<number> {
  let i = 0;
  let traidas = 0;
  const obrero = async () => {
    while (i < urls.length && !señal?.aborted) {
      const url = urls[i++];
      try {
        // `mode: cors` y credenciales por defecto para que la entrada de caché
        // sea la misma que crea MapLibre desde su worker. Si no coincidieran,
        // el navegador guardaría dos entradas y esto no serviría de nada.
        //
        // `priority: low` no es decoración. Sin ella, medido con perfil de
        // teléfono, calentar el hero empeoraba el primer píxel de 2572 a 3000
        // ms: en 4G la conexión es el recurso escaso y estas descargas
        // retrasaban los 269 KB del chunk de MapLibre. Con la pista de
        // prioridad el navegador las pone por debajo de los scripts.
        const res = await fetch(url, { mode: "cors", priority: "low", signal: señal });
        if (res.ok) {
          // Hay que consumir el cuerpo: sin esto la respuesta no termina de
          // guardarse y la conexión se queda ocupada.
          await res.arrayBuffer();
          traidas++;
        }
      } catch {
        // Una tesela que no llega no es un error de la página: solo significa
        // que MapLibre la pedirá por su cuenta cuando le toque.
      }
    }
  };
  await Promise.all(Array.from({ length: concurrencia }, obrero));
  return traidas;
}
