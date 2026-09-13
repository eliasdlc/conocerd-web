"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import {
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import type maplibregl from "maplibre-gl";
import { nearestSceneIndex, sceneAtProgress, SCENE_BANDS, SCENE_COUNT } from "@/lib/journey";
import {
  applyJourneyFrame,
  cameraInFlight,
  flyToJourneyFrame,
  measureViewport,
} from "@/lib/journeyCamera";

// ─────────────────────────────────────────────────────────────────────────────
//  Motor de scroll del journey — SOLO DESKTOP (móvil va por useJourneySteps).
//
//  Dos intenciones, dos tratos (ago 2026):
//
//  · NARRAR (rueda/touchpad): el tope de ritmo vive en el INPUT, no en la
//    cámara. Los gestos de rueda se interceptan y la página avanza a velocidad
//    legible con una cola acotada a ~una escena — un fling significa
//    "siguiente destino", nunca media pista de deuda incontrolable. Cámara y
//    scroll van 1:1: parar o invertir responde al instante. Al quedar la rueda
//    quieta, el scroll se asienta en el keyframe más cercano (cancelable con
//    cualquier gesto). Flechas/AvPág dan el mismo paso que el stepper móvil.
//
//  · NAVEGAR (nav, riel, footer, hash): teletransporte. Scroll, progreso y
//    overlays saltan YA al destino y la cámara hace UN vuelo directo (van
//    Wijk, vía flyTo en journeyCamera) sin recorrer los keyframes intermedios.
//
//  El chase (persecución con tope) se conserva como red de seguridad para los
//  inputs que siguen nativos a propósito: arrastrar la barra, Inicio/Fin,
//  espacio, restauración del navegador. Con la rueda gobernada casi nunca
//  satura. scrollYProgress → chase → useSpring → cámara = función continua.
// ─────────────────────────────────────────────────────────────────────────────

// Tope de ritmo, en progreso/s. Una escena mide ~0.077 de progreso ⇒ ~0.8 s
// por escena a tope. Scroll deliberado (~2-3 notches/s) queda por debajo.
const MAX_PROGRESS_SPEED = 0.1;
// Cola de rueda máxima por delante (o detrás) de lo visible: ~1.2 escenas.
// Define el significado de un fling — avanza un destino — y acota lo peor que
// puede pasar con un gesto desmedido.
const WHEEL_QUEUE_PROGRESS = 0.09;
// Ocio tras el último gesto de rueda antes de asentarse en el keyframe.
const SNAP_IDLE_MS = 260;
// A menos de esto del centro ya se considera asentado (no se ajusta).
const SNAP_EPSILON = 0.002;
// Vuelo directo de navegación: crece con la distancia, con suelo y techo.
const FLIGHT_BASE_MS = 700;
const FLIGHT_PER_TRACK_MS = 900;
const FLIGHT_MAX_MS = 1500;

// Firefox entrega deltas en líneas (deltaMode 1); ~40 px por línea es la
// convención que usan los normalizadores de scroll.
function wheelDeltaPx(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 40;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

// ¿Algún ancestro scrolleable puede consumir el delta (modales, listas
// internas)? Entonces la rueda es suya y el gobernador no interviene.
function innerScrollConsumes(e: WheelEvent): boolean {
  const down = e.deltaY > 0;
  let el = e.target instanceof Element ? e.target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      if (down ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

const STEP_KEYS: Record<string, 1 | -1> = {
  ArrowDown: 1,
  PageDown: 1,
  ArrowUp: -1,
  PageUp: -1,
};

// La escena 0 navega al TOPE de página (progreso 0), no a su keyframe a media
// banda: la cámara es la misma (p ≤ primer center ⇒ frame del hero) pero solo
// el tope garantiza el hero completo, sin el overlay a medio salir.
function sceneTargetProgress(sceneIndex: number): number {
  return sceneIndex === 0 ? 0 : SCENE_BANDS[sceneIndex].center;
}

export interface UseJourneyScrollOptions {
  /** Pista de scroll: el outer div del journey. */
  containerRef: RefObject<HTMLElement | null>;
  mapRef: RefObject<maplibregl.Map | null>;
  /** MotionValue compartido (SceneContext) con el progreso suavizado 0..1. */
  progress: MotionValue<number>;
  onSceneChange: (name: string) => void;
  /** Gated: sólo conduce en desktop y con el viewport ya resuelto. */
  enabled: boolean;
}

export interface JourneyScrollControls {
  /** Salto de navegación: teletransporta el scroll y vuela la cámara directa. */
  jumpToScene: (sceneIndex: number) => void;
}

export function useJourneyScroll({
  containerRef,
  mapRef,
  progress,
  onSceneChange,
  enabled,
}: UseJourneyScrollOptions): JourneyScrollControls {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Persigue a scrollYProgress con velocidad acotada (ver cabecera). El spring
  // de abajo cuelga de este valor, no del scroll crudo.
  const chase = useMotionValue(0);

  // Amortigua el trackpad/fling: el progreso no se teletransporta, pasa por
  // todos los valores intermedios.
  //
  // `restDelta` por defecto es 0.01 — sobre un rango 0..1 eso es un 1% de TODO
  // el journey (≈13vh de scroll): el muelle se daba por asentado antes de
  // llegar al keyframe y la cámara quedaba sistemáticamente corta.
  //
  // El criterio de parada se mide en píxeles de pantalla, no en cifras
  // significativas del progreso. La pista mide 12.322 px, así que 1e-4 de
  // progreso son 1,2 px de scroll y 0,004 niveles de zoom: cien veces más fino
  // que el 1e-2 por defecto que causó el bug, y por debajo de lo que un notch
  // de rueda mueve. Con 1e-5 el muelle seguía escribiendo cámara hasta 3,7 s
  // después del último notch, y los últimos frames movían exactamente 0,0 px.
  const smooth = useSpring(chase, {
    stiffness: 110,
    damping: 32,
    mass: 0.4,
    restDelta: 0.0001,
    restSpeed: 0.001,
  });
  const reduceMotion = useReducedMotion();

  // ── Gobernador de rueda ─────────────────────────────────────────────────────
  // Destino en px absolutos de la cola de rueda; null = sin cola. La página
  // solo se mueve desde el paso de rAF de abajo, a velocidad tope.
  const wheelTarget = useRef<number | null>(null);
  // Último scrollY que escribió el gobernador: si la página se movió por otra
  // vía (barra, teclado nativo, un salto de nav), la cola caduca — el usuario
  // eligió otro mecanismo y arrastrar una cola vieja sería pelearse con él.
  const lastWrote = useRef(-1);
  const snapTimer = useRef(0);

  const trackMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return null;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    return range > 0 ? { top, range } : null;
  }, [containerRef]);

  const cancelWheelQueue = useCallback(() => {
    wheelTarget.current = null;
    lastWrote.current = -1;
    window.clearTimeout(snapTimer.current);
  }, []);

  // Asentarse en el keyframe más cercano cuando la rueda queda quieta. Solo se
  // arma tras un gesto de rueda real: el scroll programático (smoke, capturas,
  // restauración del navegador) nunca debe verse "corregido" por el snap.
  const armSnap = useCallback(() => {
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => {
      if (wheelTarget.current != null || cameraInFlight()) return;
      const m = trackMetrics();
      if (!m) return;
      const p = (window.scrollY - m.top) / m.range;
      const first = SCENE_BANDS[0].center;
      const last = SCENE_BANDS[SCENE_BANDS.length - 1].center;
      // Antes del primer centro (tope de página) o después del último (rumbo
      // al footer) no hay keyframe que reclamar: no tocar.
      if (p <= first || p >= last) return;
      const center = SCENE_BANDS[nearestSceneIndex(p)].center;
      if (Math.abs(p - center) < SNAP_EPSILON) return;
      lastWrote.current = Math.round(window.scrollY);
      wheelTarget.current = m.top + m.range * center;
    }, SNAP_IDLE_MS);
  }, [trackMetrics]);

  useAnimationFrame((_, delta) => {
    if (!enabled || reduceMotion) return;
    // Pestañas en segundo plano acumulan deltas enormes; 64 ms evita que un
    // frame perdido se convierta en un teletransporte.
    const dt = Math.min(delta, 64) / 1000;

    // 1) Drena la cola de rueda a velocidad tope. Mientras un vuelo de nav
    //    tiene la cámara, la cola espera: al aterrizar se reanuda suave desde
    //    el destino, sin saltos.
    const target = wheelTarget.current;
    if (target != null && !cameraInFlight()) {
      const cur = window.scrollY;
      if (lastWrote.current >= 0 && Math.abs(cur - lastWrote.current) > 2) {
        // Alguien más movió la página: la cola caduca (ver lastWrote).
        cancelWheelQueue();
      } else {
        const m = trackMetrics();
        if (!m) {
          cancelWheelQueue();
        } else {
          const maxStep = MAX_PROGRESS_SPEED * m.range * dt;
          const diff = target - cur;
          const next = Math.abs(diff) <= maxStep ? target : cur + Math.sign(diff) * maxStep;
          // "instant" explícito: globals.css pone scroll-behavior:smooth y un
          // scrollTo posicional se volvería una animación asíncrona — la página
          // se movería "sola" frames después y dispararía el detector de
          // movimiento externo de arriba, matando la propia cola.
          window.scrollTo({ top: next, behavior: "instant" as ScrollBehavior });
          lastWrote.current = Math.round(window.scrollY);
          if (next === target) {
            wheelTarget.current = null;
            lastWrote.current = -1;
            // La cola puede terminar mucho después del último notch: el snap
            // se re-arma aquí para medir el ocio desde el final del glide.
            armSnap();
          }
        }
      }
    }

    // 2) Chase: red de seguridad para los inputs nativos (barra, teclado).
    const scrollTarget = scrollYProgress.get();
    const current = chase.get();
    const diff = scrollTarget - current;
    if (diff === 0) return;
    const step = MAX_PROGRESS_SPEED * dt;
    chase.set(Math.abs(diff) <= step ? scrollTarget : current + Math.sign(diff) * step);
  });

  const lastScene = useRef<string>("");

  const apply = useCallback(
    (p: number) => {
      progress.set(p);
      // Durante un vuelo de nav, applyJourneyFrame es no-op (journeyCamera):
      // progreso y overlays avanzan, la cámara es del vuelo.
      applyJourneyFrame(mapRef.current, p);
      const scene = sceneAtProgress(p);
      if (scene !== lastScene.current) {
        lastScene.current = scene;
        onSceneChange(scene);
      }
    },
    [progress, mapRef, onSceneChange]
  );

  // ── Salto de navegación (nav, riel, footer, hash) ───────────────────────────
  const jumpToScene = useCallback(
    (sceneIndex: number) => {
      const el = containerRef.current;
      const band = SCENE_BANDS[sceneIndex];
      if (!el || !band) return;

      const targetP = sceneTargetProgress(sceneIndex);
      const top = el.getBoundingClientRect().top + window.scrollY;
      const range = el.offsetHeight - window.innerHeight;
      const from = range > 0 ? Math.min(1, Math.max(0, (window.scrollY - top) / range)) : 0;
      const dist = Math.abs(targetP - from);

      // Navegar es teletransporte: el scroll no "recorre" nada. La cola de
      // rueda pendiente muere aquí — clicar el nav es cambiar de mecanismo.
      cancelWheelQueue();
      window.scrollTo({ top: top + range * targetP, behavior: "instant" as ScrollBehavior });
      chase.jump(targetP);
      smooth.jump(targetP);

      const map = mapRef.current;
      if (reduceMotion || !map || dist < 1e-4) {
        apply(targetP);
        return;
      }

      // La cámara hace UN vuelo directo mientras el estado ya está en destino.
      // Orden importa: el vuelo toma la cámara ANTES del apply, que si no
      // escribiría un jumpTo al destino y no habría nada que volar.
      const ms = Math.round(Math.min(FLIGHT_MAX_MS, FLIGHT_BASE_MS + FLIGHT_PER_TRACK_MS * dist));
      flyToJourneyFrame(map, targetP, ms, () => {
        // Aterrizó: la escritura por-frame retoma desde el mismo frame en el
        // que el vuelo dejó la cámara (mismo progreso ⇒ sin salto).
        apply(smooth.get());
      });
      apply(targetP);
    },
    [containerRef, mapRef, chase, smooth, apply, reduceMotion, cancelWheelQueue]
  );

  // ── Rueda + teclado ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || reduceMotion) return;

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return; // zoom del navegador
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // gesto horizontal (píldora)
      if (innerScrollConsumes(e)) return;
      const m = trackMetrics();
      if (!m) return;
      e.preventDefault();

      const cur = window.scrollY;
      if (wheelTarget.current == null) lastWrote.current = Math.round(cur);
      const queue = WHEEL_QUEUE_PROGRESS * m.range;
      const maxDoc = document.documentElement.scrollHeight - window.innerHeight;
      const raw = (wheelTarget.current ?? cur) + wheelDeltaPx(e);
      // Cola acotada respecto a lo VISIBLE: por muchos notches que lleguen, el
      // destino nunca se aleja más de ~una escena de donde estás.
      const bounded = Math.min(cur + queue, Math.max(cur - queue, raw));
      wheelTarget.current = Math.min(maxDoc, Math.max(0, bounded));
      armSnap();
    };

    // Flechas y Re/AvPág = paso de escena, espejo del stepper móvil: discreto,
    // al ritmo tope y cancelable. Espacio, Inicio/Fin y la barra siguen
    // nativos: son posicionamiento deliberado (y la vía de llegar al footer).
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const dir = STEP_KEYS[e.key];
      if (!dir) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) return;
      const m = trackMetrics();
      if (!m) return;
      const p = Math.min(1, Math.max(0, (window.scrollY - m.top) / m.range));
      const targetIndex = nearestSceneIndex(p) + dir;
      // En los extremos, teclado nativo: hacia el footer o rebotando en el tope.
      if (targetIndex < 0 || targetIndex > SCENE_COUNT - 1) return;
      e.preventDefault();
      if (wheelTarget.current == null) lastWrote.current = Math.round(window.scrollY);
      wheelTarget.current = m.top + m.range * sceneTargetProgress(targetIndex);
      armSnap();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      cancelWheelQueue();
    };
  }, [enabled, reduceMotion, trackMetrics, armSnap, cancelWheelQueue]);

  // useMotionValueEvent re-suscribe cuando cambia el callback ⇒ el closure lee
  // siempre el `enabled` actual sin necesidad de un ref.
  //
  // Camera and overlay composition still resolve viewport-specific values
  // through `measureViewport`.
  useMotionValueEvent(smooth, "change", (p) => {
    if (enabled && !reduceMotion) apply(p);
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (enabled && reduceMotion) apply(p);
  });

  useEffect(() => {
    if (!enabled) return;
    measureViewport();

    const el = containerRef.current;
    const carried = progress.get();
    if (carried > 0.001 && el) {
      // Tras un resize (o al volver del modo pasos móvil), conserva el progreso
      // ya recorrido y vuelve a alinear la posición física del track.
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + (el.offsetHeight - window.innerHeight) * carried,
        behavior: "instant" as ScrollBehavior,
      });
      chase.jump(carried);
      smooth.jump(carried);
      apply(carried);
    } else {
      // Carga normal (incluida una recarga a media página): manda el scroll.
      // Los jump evitan que el limitador convierta la restauración del
      // navegador en un vuelo desde el hero.
      const p = scrollYProgress.get();
      chase.jump(p);
      smooth.jump(p);
      apply(p);
    }

    const onResize = () => {
      measureViewport();
      apply(reduceMotion ? scrollYProgress.get() : smooth.get());
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, apply, chase, containerRef, progress, reduceMotion, scrollYProgress, smooth]);

  return { jumpToScene };
}
