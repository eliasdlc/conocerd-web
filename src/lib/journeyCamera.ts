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

// Token del vuelo directo en curso (flyToJourneyFrame). Mientras existe, la
// cámara es del vuelo: applyJourneyFrame se descarta para que los escritores
// por-frame (scroll, rotación idle del hero, resize) no lo cancelen — un
// jumpTo cualquiera mataría el flyTo a mitad de arco.
let activeFlight: symbol | null = null;

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
  if (!map || activeFlight) return;
  // Pestaña oculta: el rAF del mapa no corre y nadie está mirando. Escribir
  // aquí sólo deja trabajo acumulado para cuando la pestaña vuelva.
  if (typeof document !== "undefined" && document.hidden) return;
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

/** `true` mientras un vuelo directo de navegación tiene la cámara. */
export function cameraInFlight(): boolean {
  return activeFlight !== null;
}

/**
 * Vuelo DIRECTO al frame del progreso `p`: el arco van Wijk de `flyTo`
 * (elevarse, cruzar, aterrizar) entre la cámara actual y el keyframe destino,
 * SIN pasar por los keyframes intermedios — es el salto de navegación, no la
 * narrativa. `onDone` corre exactamente una vez, al aterrizar (moveend) o al
 * vencer el timeout de seguridad; si otro vuelo releva a este, el onDone del
 * relevado no corre (el del nuevo hará el resync).
 */
export function flyToJourneyFrame(
  map: maplibregl.Map,
  p: number,
  durationMs: number,
  onDone: () => void
) {
  const token = Symbol("journey-flight");
  activeFlight = token;

  const cam = cameraAtProgress(p, viewport);
  map.flyTo({
    center: cam.center,
    zoom: cam.zoom,
    pitch: cam.pitch,
    bearing: cam.bearing + idleBearing * heroFactorAtProgress(p),
    padding: paddingAtProgress(p, viewport),
    duration: durationMs,
    essential: true,
  });

  let timer = 0;
  const finish = () => {
    map.off("moveend", finish);
    window.clearTimeout(timer);
    if (activeFlight !== token) return;
    activeFlight = null;
    onDone();
  };
  map.once("moveend", finish);
  // El cinturón: si moveend se pierde (pestaña en segundo plano, estilo aún
  // cargando), el vuelo no puede dejar la cámara secuestrada para siempre.
  timer = window.setTimeout(finish, durationMs + 400);
}
