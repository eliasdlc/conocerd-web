// ─────────────────────────────────────────────────────────────────────────────
//  Instrumental de la cabina: los números que se leen en pantalla.
//
//  Regla de la propuesta: NADA de datos decorativos. Todo lo que muestra el HUD
//  —coordenadas, zoom, rumbo, inclinación, altitud, fase— sale de la cámara real
//  del journey (`cameraAtProgress`) y de `@/data/destinations`. Si el número no
//  cambia al bajar, no está en pantalla.
// ─────────────────────────────────────────────────────────────────────────────

import {
  SCENE_BANDS,
  cameraAtProgress,
  heroFactorAtProgress,
  paddingAtProgress,
  type JourneyViewport,
} from "@/lib/journey";
import { DESTINATIONS, type Viewport } from "@/data/destinations";

/** Reparto de pantalla que reserva el overlay. Ver comentario en `page.tsx`. */
export const ENCUADRE = { padLeft: 0.34, padBottom: 0.38 } as const;

/** Progreso del journey donde termina la pista del descenso (primer destino). */
export const P_DESTINO = SCENE_BANDS[1].center;

/** Destino en el que aterriza la cámara al final de la bajada. */
export const OBJETIVO =
  DESTINATIONS.find((d) => d.featured && d.featuredOrder === 0) ?? DESTINATIONS[0];

export const TOTAL_DESTINOS = DESTINATIONS.length;
export const TOTAL_PROVINCIAS = new Set(DESTINATIONS.map((d) => d.province)).size;
export const TOTAL_CATEGORIAS = new Set(DESTINATIONS.map((d) => d.category)).size;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

// ─── Coordenadas ──────────────────────────────────────────────────────────────

function gms(valor: number, positivo: string, negativo: string): string {
  const dir = valor >= 0 ? positivo : negativo;
  const abs = Math.abs(valor);
  let g = Math.floor(abs);
  let m = Math.floor((abs - g) * 60);
  let s = Math.round((abs - g - m / 60) * 3600);
  // El redondeo del segundo puede desbordar a 60: se acarrea, si no salen
  // lecturas imposibles del tipo 18°44′60″.
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; g += 1; }
  return `${g}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″${dir}`;
}

export const latitud = (lat: number) => gms(lat, "N", "S");
export const longitud = (lng: number) => gms(lng, "E", "O");

// ─── Altitud ──────────────────────────────────────────────────────────────────

// MapLibre mira con un fov de 0.6435 rad (36.87°): la distancia de la cámara al
// suelo es alto_del_viewport / (2·tan(fov/2)) píxeles, y cada píxel mide
// `metros por píxel` a la latitud del centro. De ahí sale una altitud real —
// ~35.000 km sobre el globo (órbita geoestacionaria) y ~70 km al aterrizar.
const FACTOR_CAMARA = 1 / (2 * Math.tan(0.6435 / 2));
const METROS_POR_PIXEL_ECUADOR = 156_543.03392;

export function altitudEnMetros(cam: Viewport, alto: number): number {
  const mpp = (METROS_POR_PIXEL_ECUADOR * Math.cos((cam.center[1] * Math.PI) / 180)) / 2 ** cam.zoom;
  return mpp * alto * FACTOR_CAMARA;
}

/** Miles con punto, sin `toLocaleString`: el servidor y el cliente deben pintar lo mismo. */
const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Altitud lista para pantalla, siempre en km (la unidad no baila mientras desciendes). */
export function altitudEnKm(metros: number): string {
  const km = metros / 1000;
  if (km >= 100) return miles(Math.round(km));
  return km.toFixed(1).replace(".", ",");
}

// ─── Fases del vuelo ──────────────────────────────────────────────────────────

export type Fase = { clave: "orbita" | "aproximacion" | "aterrizaje"; etiqueta: string; corto: string };

export const FASES: readonly Fase[] = [
  { clave: "orbita", etiqueta: "Órbita", corto: "Órbita" },
  { clave: "aproximacion", etiqueta: "Aproximación", corto: "Aprox." },
  { clave: "aterrizaje", etiqueta: "Aterrizaje", corto: "Tierra" },
] as const;

/** Índice de fase por progreso del descenso.
 *
 *  Los cortes están puestos sobre lo que hace la cámara de verdad, no a ojo: la
 *  banda `hero` del journey tiene reposo, así que hasta ~0,34 de la pista el
 *  keyframe no se ha movido (sigue en órbita) y a partir de ~0,82 el zoom ya
 *  pasa de 10 (la isla llena la pantalla). */
export function indiceFase(t: number): number {
  if (t < 0.4) return 0;
  if (t < 0.82) return 1;
  return 2;
}

/** Cámara del journey en un punto del descenso (0..1 de la pista). */
export function camaraEn(t: number, vp: JourneyViewport): Viewport {
  return cameraAtProgress(clamp01(t) * P_DESTINO, vp);
}

/**
 * Punto de la pantalla donde el mapa pinta el centro de cámara, en píxeles.
 *
 * No basta con el encuadre propio: GloboHero mezcla el padding de la propuesta
 * con el del journey a medida que el hero cede el mando (`heroFactorAtProgress`),
 * así que el centro se DESPLAZA durante la bajada. Repetir aquí exactamente esa
 * mezcla es lo que mantiene la mira clavada en el centro de cámara todo el
 * descenso, en vez de irse 180 px a mitad de vuelo.
 */
export function centroDeCamara(t: number, vp: JourneyViewport): { x: number; y: number } {
  const p = clamp01(t) * P_DESTINO;
  const hero = heroFactorAtProgress(p);
  const journey = paddingAtProgress(p, vp);
  const propioLeft = vp.mobile ? 0 : vp.width * ENCUADRE.padLeft;
  const propioBottom = vp.mobile ? vp.height * ENCUADRE.padBottom : 0;
  const left = journey.left + (propioLeft - journey.left) * hero;
  const bottom = journey.bottom + (propioBottom - journey.bottom) * hero;
  return { x: (vp.width + left) / 2, y: (vp.height - bottom) / 2 };
}

/** Rumbo de brújula 0..359 a partir del bearing de la cámara. */
export const rumbo = (bearing: number) => Math.round(((bearing % 360) + 360) % 360);
