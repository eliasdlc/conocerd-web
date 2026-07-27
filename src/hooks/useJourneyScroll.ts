"use client";

import { RefObject, useCallback, useEffect, useRef } from "react";
import {
  useScroll,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import type maplibregl from "maplibre-gl";
import { sceneAtProgress, SCENE_BANDS } from "@/lib/journey";
import { applyJourneyFrame, currentViewport, measureViewport } from "@/lib/journeyCamera";

// ─────────────────────────────────────────────────────────────────────────────
//  Motor de scroll del journey — DESKTOP.
//
//  scrollYProgress (0..1 sobre toda la pista) → useSpring (amortigua el fling)
//  → cámara = función continua del progreso (lib/journey) → jumpTo por frame.
//  Sin dwell muerto y sin saltos aunque se scrollee rápido.
//
//  En móvil este motor se apaga (`enabled: false`) y manda `useJourneySteps`.
// ─────────────────────────────────────────────────────────────────────────────

export interface UseJourneyScrollOptions {
  /** Pista de scroll: el outer div del journey. */
  containerRef: RefObject<HTMLElement | null>;
  mapRef: RefObject<maplibregl.Map | null>;
  /** MotionValue compartido (SceneContext) con el progreso suavizado 0..1. */
  progress: MotionValue<number>;
  onSceneChange: (name: string) => void;
  /** false en móvil: el progreso lo escribe el motor de pasos. */
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

  // Amortigua el trackpad/fling: el progreso no se teletransporta, pasa por
  // todos los valores intermedios.
  //
  // `restDelta` por defecto es 0.01 — sobre un rango 0..1 eso es un 1% de TODO
  // el journey (≈13vh de scroll): el muelle se daba por asentado antes de
  // llegar al keyframe y la cámara quedaba sistemáticamente corta. Con 1e-5
  // aterriza en el keyframe exacto.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 32,
    mass: 0.4,
    restDelta: 0.00001,
    restSpeed: 0.0001,
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
  // El segundo guardo no es redundante: al estrechar la ventana, el layout
  // colapsa la pista a 100dvh y el navegador recorta el scroll a 0 ANTES de que
  // React llegue a re-renderizar con `enabled: false`. Sin mirar el viewport ya
  // medido, ese scroll fantasma escribía progreso 0 y el modo móvil arrancaba
  // en el hero en vez de donde estaba el usuario.
  useMotionValueEvent(smooth, "change", (p) => {
    if (enabled && !currentViewport().mobile) apply(p);
  });

  useEffect(() => {
    if (!enabled) return;
    measureViewport();

    const el = containerRef.current;
    const carried = progress.get();
    if (carried > 0.001 && el) {
      // Venimos del motor de pasos (resize a desktop): la posición de scroll no
      // significa nada todavía, manda el progreso ya recorrido.
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: top + (el.offsetHeight - window.innerHeight) * carried,
        behavior: "instant" as ScrollBehavior,
      });
      smooth.jump(carried);
      apply(carried);
    } else {
      // Carga normal (incluida una recarga a media página): manda el scroll.
      apply(scrollYProgress.get());
    }

    const onResize = () => {
      measureViewport();
      if (!currentViewport().mobile) apply(smooth.get());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [enabled, apply, containerRef, progress, scrollYProgress, smooth]);
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
  window.scrollTo({ top: top + range * band.center, behavior: "smooth" });
}
