// ─────────────────────────────────────────────────────────────────────────────
//  Estructura del journey + matemática de la cámara.
//
//  La cámara es una FUNCIÓN CONTINUA del progreso 0..1 (no bandas discretas).
//  Este módulo es la única fuente de: la pista de escenas, los capítulos, y las
//  conversiones progreso↔escena↔cámara↔encuadre. El motor de scroll lo consume
//  a través de `lib/journeyCamera.ts` en todos los viewports.
// ─────────────────────────────────────────────────────────────────────────────

import { SCENE_CAMERAS, resolveCamera, type SceneCamera, type Viewport } from "@/data/destinations";

export type SceneDef = {
  name: string;
  /** vh de pista de scroll = "tiempo en cámara" relativo (solo desktop). */
  height: number;
  /** Capítulo de contenido al que pertenece. */
  chapter: string;
  /**
   * Zona segura del overlay, como fracción del viewport. La cámara centra la
   * escena en el área LIBRE, no en la pantalla entera: por eso el globo del
   * hero queda arriba en móvil y a la derecha en desktop.
   * `padLeft` solo aplica en desktop, `padBottom` solo en móvil.
   */
  padLeft?: number;
  padBottom?: number;
};

// Alturas recalibradas: los 6 polaroids ocupaban 6 pantallas completas de
// scroll (100vh cada uno) y el tramo se hacía eterno; 82vh mantiene el ritmo
// sin comerse el dwell de las escenas de lectura.
export const SCENES: SceneDef[] = [
  { name: "hero",             height: 100, chapter: "Inicio",   padLeft: 0.44, padBottom: 0.40 },
  { name: "destinos-intro",   height:  75, chapter: "Destinos", padBottom: 0.16 },
  { name: "polaroid-0",       height:  82, chapter: "Destinos", padBottom: 0.46 },
  { name: "polaroid-1",       height:  82, chapter: "Destinos", padBottom: 0.46 },
  { name: "polaroid-2",       height:  82, chapter: "Destinos", padBottom: 0.46 },
  { name: "polaroid-3",       height:  82, chapter: "Destinos", padBottom: 0.46 },
  { name: "polaroid-4",       height:  82, chapter: "Destinos", padBottom: 0.46 },
  { name: "polaroid-5",       height:  82, chapter: "Destinos", padBottom: 0.46 },
  { name: "destinos-finale",  height:  95, chapter: "Destinos", padBottom: 0.52 },
  { name: "mapa",             height: 130, chapter: "Tu ruta",  padBottom: 0.34 },
  { name: "viajeros",         height: 115, chapter: "Viajeros", padBottom: 0.58 },
  { name: "negocios",         height: 125, chapter: "Negocios", padBottom: 0.58 },
  { name: "equipo",           height: 100, chapter: "Equipo",   padBottom: 0.50 },
  { name: "cta",              height: 110, chapter: "Descarga", padBottom: 0.46 },
];

export const TRIGGER_TOTAL_VH = SCENES.reduce((sum, s) => sum + s.height, 0);

// Mobile keeps the same relative scene timing so camera bands and anchor
// positions stay aligned, but needs less physical scrolling than desktop.
// 0.63 turns the 1329vh desktop track into ~837dvh on phones.
export const MOBILE_TRACK_SCALE = 0.63;
export const MOBILE_TRIGGER_TOTAL_DVH = TRIGGER_TOTAL_VH * MOBILE_TRACK_SCALE;

// ─── Bandas en espacio de progreso [0,1] ──────────────────────────────────────
// `start/end` = banda de la escena (activeScene + progreso local).
// `center`    = punto de progreso donde la cámara se asienta en su keyframe;
//               también es el destino de la navegación directa.

export type SceneBand = {
  name: string;
  index: number;
  start: number;
  end: number;
  center: number;
  camera: SceneCamera;
  def: SceneDef;
};

export const SCENE_BANDS: SceneBand[] = (() => {
  let acc = 0;
  const total = TRIGGER_TOTAL_VH;
  return SCENES.map((s, index) => {
    const start = acc / total;
    const end = (acc + s.height) / total;
    const center = (acc + s.height / 2) / total;
    acc += s.height;
    return { name: s.name, index, start, end, center, camera: SCENE_CAMERAS[s.name], def: s };
  });
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// easeInOutCubic: velocidad ~0 en cada keyframe ⇒ la cámara se "asienta" en
// cada escena y viaja rápido entre escenas, sin frames congelados.
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Interpolación de ángulo por el camino más corto (evita giros de 359°).
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

// Web Mercator normalizado (0..1). Interpolar el centro en este espacio y no en
// lat/lng crudos evita que la trayectoria se curve al alejarse del ecuador.
const mercY = (lat: number) =>
  0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);
const mercLat = (y: number) =>
  ((Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 4) * 360) / Math.PI;

// ─── Viewport ─────────────────────────────────────────────────────────────────

export type JourneyViewport = { width: number; height: number; mobile: boolean };

export const REFERENCE_VIEWPORT: JourneyViewport = { width: 1440, height: 900, mobile: false };

// ─── Tramos: perfil de vuelo tipo flyTo ───────────────────────────────────────
//
//  Problema real que resuelve esto: interpolar centro y zoom linealmente entre
//  dos keyframes lejanos con zoom alto hace que el suelo pase a toda velocidad
//  ("desplazamiento de píxeles" enorme) y el usuario pierde toda referencia —
//  se nota muchísimo entre polaroids, que están a un extremo y otro de la isla.
//
//  Solución (van Wijk simplificado, lo mismo que hace `flyTo` internamente):
//   1. El zoom hace un ARCO: baja hasta el nivel donde los dos extremos caben
//      en pantalla y vuelve a subir. La cámara "se eleva, viaja y aterriza".
//   2. El centro NO avanza linealmente en el tiempo, sino proporcional a
//      2^-zoom, es decir a velocidad angular ~constante EN PANTALLA. Así el
//      grueso del recorrido ocurre mientras está alejada, que es cuando el
//      movimiento se lee como viaje y no como barrido.

type Segment = {
  a: Viewport;
  b: Viewport;
  /** Niveles de zoom que el arco baja por debajo del keyframe más cercano. */
  dip: number;
  /** Tabla acumulada: t (eased) → avance normalizado del centro 0..1. */
  table: number[];
};

const TABLE_STEPS = 32;

// Campana con derivada 0 en los extremos: el arco de zoom arranca y termina sin
// tirón (con sin(πt) puro habría un salto de velocidad en cada keyframe).
const bell = (t: number) => Math.pow(Math.sin(Math.PI * t), 1.5);

const segZoom = (s: Segment, t: number) => lerp(s.a.zoom, s.b.zoom, t) - s.dip * bell(t);

function buildSegments(v: JourneyViewport): Segment[] {
  // Distancia que debe caber en pantalla para considerar "los dos extremos a
  // la vista". 0.62 del lado corto deja aire para el overlay.
  const fitPx = Math.max(220, Math.min(v.width, v.height) * 0.62);

  return SCENE_BANDS.slice(0, -1).map((band, i) => {
    const a = resolveCamera(band.camera, v.mobile);
    const b = resolveCamera(SCENE_BANDS[i + 1].camera, v.mobile);

    const dx = (b.center[0] - a.center[0]) / 360;
    const dy = mercY(b.center[1]) - mercY(a.center[1]);
    const dist = Math.hypot(dx, dy); // fracción del mundo

    const zLow = Math.min(a.zoom, b.zoom);
    // Zoom al que `dist` ocupa exactamente `fitPx` (mundo = 512·2^z px).
    const zFit = dist > 1e-9 ? Math.log2(fitPx / (512 * dist)) : zLow;
    // <0.35 niveles no se percibe y solo añade ruido; >5 marea.
    const raw = zLow - zFit;
    const dip = raw < 0.35 ? 0 : Math.min(raw, 5);

    const seg: Segment = { a, b, dip, table: [] };

    // Tabla de avance del centro: integral de 2^-zoom, normalizada.
    const weights: number[] = [];
    for (let k = 0; k <= TABLE_STEPS; k++) weights.push(Math.pow(2, -segZoom(seg, k / TABLE_STEPS)));
    const cum = [0];
    for (let k = 1; k <= TABLE_STEPS; k++) {
      cum.push(cum[k - 1] + (weights[k - 1] + weights[k]) / 2);
    }
    const total = cum[TABLE_STEPS] || 1;
    seg.table = cum.map((c) => c / total);
    return seg;
  });
}

let cacheKey = "";
let cacheSegments: Segment[] = [];

function segmentsFor(v: JourneyViewport): Segment[] {
  // Redondeo a 40px: evita reconstruir la tabla en cada frame de un resize.
  const key = `${v.mobile}|${Math.round(v.width / 40)}|${Math.round(v.height / 40)}`;
  if (key !== cacheKey) {
    cacheKey = key;
    cacheSegments = buildSegments(v);
  }
  return cacheSegments;
}

function sampleTable(table: number[], t: number): number {
  const x = clamp01(t) * TABLE_STEPS;
  const i = Math.min(TABLE_STEPS - 1, Math.floor(x));
  return lerp(table[i], table[i + 1], x - i);
}

/** Índice del tramo que contiene `p` y su t crudo 0..1, o null si está fuera. */
function segmentAt(p: number): { i: number; t: number } | null {
  const bands = SCENE_BANDS;
  if (p <= bands[0].center) return null;
  if (p >= bands[bands.length - 1].center) return null;
  for (let i = 0; i < bands.length - 1; i++) {
    if (p >= bands[i].center && p < bands[i + 1].center) {
      return { i, t: (p - bands[i].center) / (bands[i + 1].center - bands[i].center) };
    }
  }
  return null;
}

// ─── API de consulta por progreso ─────────────────────────────────────────────

/** Escena activa (discreta) para overlays con visibilidad booleana. */
export function sceneAtProgress(p: number): string {
  let name = SCENE_BANDS[0].name;
  for (const b of SCENE_BANDS) {
    if (p >= b.start) name = b.name;
    else break;
  }
  return name;
}

/** Índice de escena activo. */
export function sceneIndexAtProgress(p: number): number {
  let index = 0;
  for (const b of SCENE_BANDS) {
    if (p >= b.start) index = b.index;
    else break;
  }
  return index;
}

/** Índice del keyframe más cercano — para re-sincronizar al cambiar de motor. */
export function nearestSceneIndex(p: number): number {
  let best = 0;
  let bestD = Infinity;
  for (const b of SCENE_BANDS) {
    const d = Math.abs(b.center - p);
    if (d < bestD) { bestD = d; best = b.index; }
  }
  return best;
}

/** Progreso local 0..1 dentro de la banda de una escena (para enter/exit). */
export function localProgress(p: number, name: string): number {
  const b = SCENE_BANDS.find((x) => x.name === name);
  if (!b) return 0;
  return clamp01((p - b.start) / (b.end - b.start));
}

/**
 * Cuánto queda del "modo hero" (1 en el hero, 0 al llegar a destinos-intro).
 * Lo usa la rotación en reposo del globo para desvanecerse al arrancar.
 */
export function heroFactorAtProgress(p: number): number {
  const seg = segmentAt(p);
  if (!seg) return p <= SCENE_BANDS[0].center ? 1 : 0;
  if (seg.i !== 0) return 0;
  return 1 - easeInOut(seg.t);
}

/** Cámara interpolada de forma continua entre los keyframes de cada escena. */
export function cameraAtProgress(p: number, v: JourneyViewport): Viewport {
  const bands = SCENE_BANDS;
  const at = segmentAt(p);
  if (!at) {
    const band = p <= bands[0].center ? bands[0] : bands[bands.length - 1];
    return resolveCamera(band.camera, v.mobile);
  }

  const seg = segmentsFor(v)[at.i];
  const t = easeInOut(at.t);
  const ct = sampleTable(seg.table, t);

  const ax = seg.a.center[0] / 360;
  const bx = seg.b.center[0] / 360;
  const ay = mercY(seg.a.center[1]);
  const by = mercY(seg.b.center[1]);

  return {
    center: [lerp(ax, bx, ct) * 360, mercLat(lerp(ay, by, ct))],
    zoom: segZoom(seg, t),
    pitch: lerp(seg.a.pitch, seg.b.pitch, t),
    bearing: lerpAngle(seg.a.bearing, seg.b.bearing, t),
  };
}

/**
 * Padding de cámara = zona segura del overlay. Desplaza el punto donde la
 * cámara centra la escena hacia el área libre: desktop empuja a la derecha
 * (texto a la izquierda), móvil empuja hacia arriba (contenido debajo).
 */
export function paddingAtProgress(p: number, v: JourneyViewport) {
  const bands = SCENE_BANDS;
  const at = segmentAt(p);

  let padLeft: number;
  let padBottom: number;
  if (!at) {
    const def = (p <= bands[0].center ? bands[0] : bands[bands.length - 1]).def;
    padLeft = def.padLeft ?? 0;
    padBottom = def.padBottom ?? 0;
  } else {
    const t = easeInOut(at.t);
    const a = bands[at.i].def;
    const b = bands[at.i + 1].def;
    padLeft = lerp(a.padLeft ?? 0, b.padLeft ?? 0, t);
    padBottom = lerp(a.padBottom ?? 0, b.padBottom ?? 0, t);
  }

  return v.mobile
    ? { top: 0, right: 0, bottom: Math.round(v.height * padBottom), left: 0 }
    : { top: 0, right: 0, bottom: 0, left: Math.round(v.width * padLeft) };
}
