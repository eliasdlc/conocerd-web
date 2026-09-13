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

// Último frame escrito, y sobre qué instancia de mapa. La cámara del recorrido
// es constante por tramos: antes del primer keyframe `segmentAt` devuelve null
// y el frame no depende del progreso, así que el motor pide de 37 a 40
// escrituras por recorrido bit a bit idénticas a la anterior. Cada una es un
// `jumpTo` y MapLibre vuelve a dibujar el globo entero para no cambiar un solo
// píxel. Guardar el frame y comparar sale ~140 veces más barato que escribirlo.
let lastFrame: number[] | null = null;
let lastMap: maplibregl.Map | null = null;

/**
 * Olvida el último frame escrito. Obligatorio siempre que la cámara pueda haber
 * cambiado por fuera de `applyJourneyFrame` (un vuelo) o que el frame calculado
 * para el mismo progreso pase a ser otro (un resize cambia el padding).
 */
export function resetJourneyFrame() {
  lastFrame = null;
  lastMap = null;
}

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
  // El padding sale del ancho de ventana: con otro viewport, el mismo progreso
  // ya no da el mismo frame.
  resetJourneyFrame();
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
  // La rotación en reposo se mezcla solo mientras queda "modo hero" y se
  // desvanece con él ⇒ nunca hay un corte al volver al keyframe.
  const bearing = cam.bearing + idleBearing * heroFactorAtProgress(p);
  const padding = paddingAtProgress(p, viewport);

  // Si el frame es idéntico al anterior el mapa ya está exactamente ahí:
  // escribirlo sólo compraría un repintado completo sin cambio en pantalla.
  // La instancia entra en la comparación porque un mapa recién montado arranca
  // en su vista inicial y necesita la primera escritura sí o sí.
  const frame = [
    cam.center[0],
    cam.center[1],
    cam.zoom,
    cam.pitch,
    bearing,
    padding.top,
    padding.right,
    padding.bottom,
    padding.left,
  ];
  if (lastMap === map && lastFrame !== null && frame.every((n, i) => n === lastFrame![i])) return;
  lastFrame = frame;
  lastMap = map;

  map.jumpTo({
    center: cam.center,
    zoom: cam.zoom,
    pitch: cam.pitch,
    bearing,
    padding,
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
  // El vuelo mueve la cámara por su cuenta: lo que quede anotado como último
  // frame deja de describir dónde está el mapa.
  resetJourneyFrame();

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
