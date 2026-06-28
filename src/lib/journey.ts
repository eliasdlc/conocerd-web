// ─────────────────────────────────────────────────────────────────────────────
//  Estructura del journey + matemática de scroll continuo (#3).
//
//  El motor nuevo trata la cámara como FUNCIÓN CONTINUA del scroll (no bandas
//  discretas). Este módulo es la única fuente de la pista de escenas y de las
//  conversiones progreso↔escena↔cámara, compartido por el hook useJourneyScroll
//  y por los overlays que quieran progreso local.
// ─────────────────────────────────────────────────────────────────────────────

import { SCENE_CAMERAS, type Viewport } from "@/data/destinations";

export type SceneDef = { name: string; height: number };

// Pista de escenas. `height` en vh = "tiempo en cámara" relativo de cada escena.
// Calibrado para que las secciones interactivas (mapa) y de lectura tengan aire.
export const SCENES: SceneDef[] = [
  { name: "destinos-intro", height: 80 },
  { name: "polaroid-0", height: 100 },
  { name: "polaroid-1", height: 100 },
  { name: "polaroid-2", height: 100 },
  { name: "polaroid-3", height: 100 },
  { name: "polaroid-4", height: 100 },
  { name: "polaroid-5", height: 100 },
  { name: "destinos-finale", height: 90 },
  { name: "mapa", height: 130 },
  { name: "viajeros", height: 120 },
  { name: "negocios", height: 130 },
  { name: "equipo", height: 100 },
  { name: "cta", height: 100 },
];

export const TRIGGER_TOTAL_VH = SCENES.reduce((sum, s) => sum + s.height, 0);

// ─── Bandas en espacio de progreso [0,1] ──────────────────────────────────────
// `start/end` = banda de la escena (para activeScene + progreso local).
// `center`    = punto de progreso donde la cámara se asienta en su keyframe.

export type SceneBand = {
  name: string;
  start: number;
  end: number;
  center: number;
  camera: Viewport;
};

export const SCENE_BANDS: SceneBand[] = (() => {
  let acc = 0;
  const total = TRIGGER_TOTAL_VH;
  return SCENES.map((s) => {
    const start = acc / total;
    const end = (acc + s.height) / total;
    const center = (acc + s.height / 2) / total;
    acc += s.height;
    return { name: s.name, start, end, center, camera: SCENE_CAMERAS[s.name] };
  });
})();

// ─── Helpers de interpolación ─────────────────────────────────────────────────

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// easeInOutCubic: velocidad ~0 cerca de cada keyframe ⇒ la cámara casi se
// "asienta" en cada escena (quasi-dwell) y viaja rápido entre escenas, sin
// frames congelados (mata el dwell muerto del Caso A).
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Interpolación de ángulo por el camino más corto (evita giros de 359°).
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

function interpCamera(a: Viewport, b: Viewport, t: number): Viewport {
  return {
    center: [lerp(a.center[0], b.center[0], t), lerp(a.center[1], b.center[1], t)],
    zoom: lerp(a.zoom, b.zoom, t),
    pitch: lerp(a.pitch, b.pitch, t),
    bearing: lerpAngle(a.bearing, b.bearing, t),
  };
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

/** Progreso local 0..1 dentro de la banda de una escena (para enter/exit). */
export function localProgress(p: number, name: string): number {
  const b = SCENE_BANDS.find((x) => x.name === name);
  if (!b) return 0;
  return clamp01((p - b.start) / (b.end - b.start));
}

/** Cámara interpolada de forma continua entre los keyframes de cada escena. */
export function cameraAtProgress(p: number): Viewport {
  const cs = SCENE_BANDS;
  if (p <= cs[0].center) return cs[0].camera;
  const last = cs[cs.length - 1];
  if (p >= last.center) return last.camera;
  for (let i = 0; i < cs.length - 1; i++) {
    if (p >= cs[i].center && p < cs[i + 1].center) {
      const t = (p - cs[i].center) / (cs[i + 1].center - cs[i].center);
      return interpCamera(cs[i].camera, cs[i + 1].camera, easeInOut(t));
    }
  }
  return last.camera;
}
