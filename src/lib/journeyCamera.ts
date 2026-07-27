// ─────────────────────────────────────────────────────────────────────────────
//  Único punto de escritura sobre la cámara del mapa.
//
//  Los dos motores (scroll en desktop, pasos en móvil) y la rotación en reposo
//  del hero pasan por aquí. Tener una sola función que escribe evita que dos
//  fuentes se pisen: antes `useHeroIdleMotion` llamaba a `jumpTo` por su cuenta
//  y dejaba el bearing desalineado del keyframe ⇒ salto visible al primer
//  scroll. Ahora la rotación es un OFFSET que el frame mezcla y desvanece.
// ─────────────────────────────────────────────────────────────────────────────

import type maplibregl from "maplibre-gl";
import {
  cameraAtProgress,
  heroFactorAtProgress,
  paddingAtProgress,
  REFERENCE_VIEWPORT,
  type JourneyViewport,
} from "@/lib/journey";
import { MOBILE_BREAKPOINT } from "@/hooks/useIsMobile";

let viewport: JourneyViewport = REFERENCE_VIEWPORT;
let idleBearing = 0;

/** Relee el tamaño de ventana (una vez por resize, no por frame). */
export function measureViewport(): JourneyViewport {
  if (typeof window === "undefined") return viewport;
  const width = window.innerWidth;
  viewport = { width, height: window.innerHeight, mobile: width < MOBILE_BREAKPOINT };
  return viewport;
}

export function currentViewport(): JourneyViewport {
  return viewport;
}

/** Offset de bearing de la rotación en reposo del hero (grados). */
export function setIdleBearing(deg: number) {
  idleBearing = deg;
}

export function getIdleBearing() {
  return idleBearing;
}

/** Escribe en el mapa el frame correspondiente al progreso `p` (0..1). */
export function applyJourneyFrame(map: maplibregl.Map | null | undefined, p: number) {
  if (!map) return;
  const cam = cameraAtProgress(p, viewport);
  map.jumpTo({
    center: cam.center,
    zoom: cam.zoom,
    pitch: cam.pitch,
    // La rotación en reposo se mezcla solo mientras queda "modo hero" y se
    // desvanece con él ⇒ nunca hay un corte al volver al keyframe.
    bearing: cam.bearing + idleBearing * heroFactorAtProgress(p),
    padding: paddingAtProgress(p, viewport),
  });
}
