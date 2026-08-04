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
import { sceneAtProgress, SCENE_BANDS } from "@/lib/journey";
import { applyJourneyFrame, measureViewport } from "@/lib/journeyCamera";

// ─────────────────────────────────────────────────────────────────────────────
//  Motor de scroll del journey — SOLO DESKTOP (móvil va por useJourneySteps).
//
//  scrollYProgress (0..1 sobre toda la pista) → chase (tope de velocidad)
//  → useSpring (amortigua el fling) → cámara = función continua del progreso
//  (lib/journey) → jumpTo por frame. Sin dwell muerto y sin saltos aunque se
//  scrollee rápido.
//
//  El "chase" existe porque el spring solo suaviza, no limita: un fling de
//  rueda ponía scrollYProgress tres escenas más adelante y el spring cruzaba
//  todo ese tramo en medio segundo — pantallas enteras pasaban sin poder
//  leerse (queja de usuarios, ago 2026). El chase persigue el scroll a una
//  velocidad MÁXIMA fija, así la cámara atraviesa cada escena a ritmo legible
//  por muy fuerte que se lance la rueda; scrolleando a ritmo normal el tope no
//  se toca y todo se siente igual que antes.
// ─────────────────────────────────────────────────────────────────────────────

// Tope base: en progreso/s. Una escena mide ~0.077 de progreso ⇒ ~0.8 s por
// escena a tope. Scroll deliberado (~2-3 notches/s) queda por debajo del tope.
const MAX_PROGRESS_SPEED = 0.1;
// Tope durante un salto de navegación (nav/footer/riel): el destino puede
// estar a media pista y a 0.1/s tardaría ~10 s. 0.5/s cruza todo en ~2 s.
const NAV_PROGRESS_SPEED = 0.5;

// Salto de navegación en curso: expira por tiempo (más margen) o al primer
// gesto de rueda del usuario, que recupera el tope legible.
let navBoostUntil = 0;

function startNavBoost(distance: number) {
  // Margen ancho: el scroll suave del navegador puede tardar más que el propio
  // tope (medido: ~5 s para cruzar la pista entera). Si el boost expira antes,
  // el tramo final se arrastra a velocidad base. Expirar tarde no hace daño —
  // el boost solo vive mientras el scroll programático sigue moviéndose y un
  // gesto de rueda lo corta al instante.
  navBoostUntil = performance.now() + (distance / NAV_PROGRESS_SPEED) * 1000 + 6000;
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

export function useJourneyScroll({
  containerRef,
  mapRef,
  progress,
  onSceneChange,
  enabled,
}: UseJourneyScrollOptions) {
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
  // llegar al keyframe y la cámara quedaba sistemáticamente corta. Con 1e-5
  // aterriza en el keyframe exacto.
  const smooth = useSpring(chase, {
    stiffness: 110,
    damping: 32,
    mass: 0.4,
    restDelta: 0.00001,
    restSpeed: 0.0001,
  });
  const reduceMotion = useReducedMotion();

  useAnimationFrame((_, delta) => {
    if (!enabled || reduceMotion) return;
    const target = scrollYProgress.get();
    const current = chase.get();
    const diff = target - current;
    if (diff === 0) return;
    // Pestañas en segundo plano acumulan deltas enormes; 64 ms evita que un
    // frame perdido se convierta en un teletransporte.
    const dt = Math.min(delta, 64) / 1000;
    const speed = performance.now() < navBoostUntil ? NAV_PROGRESS_SPEED : MAX_PROGRESS_SPEED;
    const step = speed * dt;
    chase.set(Math.abs(diff) <= step ? target : current + Math.sign(diff) * step);
  });

  const lastScene = useRef<string>("");

  const apply = useCallback(
    (p: number) => {
      progress.set(p);
      applyJourneyFrame(mapRef.current, p);
      const scene = sceneAtProgress(p);
      if (scene !== lastScene.current) {
        lastScene.current = scene;
        onSceneChange(scene);
      }
    },
    [progress, mapRef, onSceneChange]
  );

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
    // Un gesto de rueda cancela el boost de navegación: el usuario retomó el
    // control y el tope vuelve a ser el legible.
    const onWheel = () => {
      navBoostUntil = 0;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
    };
  }, [enabled, apply, chase, containerRef, progress, reduceMotion, scrollYProgress, smooth]);
}

/**
 * Lleva el scroll al punto donde la cámara se asienta en el keyframe de una
 * escena (su `center`), no al inicio de su banda: aterrizar en el borde de la
 * banda dejaba la cámara a medio vuelo con el overlay ya visible.
 */
export function scrollToSceneCenter(container: HTMLElement | null, sceneIndex: number) {
  const band = SCENE_BANDS[sceneIndex];
  if (!container || !band) return;
  const top = container.getBoundingClientRect().top + window.scrollY;
  const range = container.offsetHeight - window.innerHeight;
  // Con el tope de velocidad base, un salto de nav a media pista tardaría ~10 s
  // en llegar: el boost sube el tope lo justo para cruzar en ~2 s.
  const current = range > 0 ? (window.scrollY - top) / range : 0;
  startNavBoost(Math.abs(band.center - Math.min(1, Math.max(0, current))));
  window.scrollTo({ top: top + range * band.center, behavior: "smooth" });
}
