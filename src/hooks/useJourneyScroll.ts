"use client";

import { RefObject, useEffect, useRef } from "react";
import {
  useScroll,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "motion/react";
import type maplibregl from "maplibre-gl";
import { cameraAtProgress, sceneAtProgress } from "@/lib/journey";

// ─────────────────────────────────────────────────────────────────────────────
//  Motor de scroll del journey (#3). Reemplaza useSceneTrigger (bandas discretas).
//
//  scrollYProgress (0..1 sobre toda la pista) → useSpring (amortigua el fling,
//  mata la "sensibilidad") → cámara = función continua del progreso, aplicada
//  con map.jumpTo en cada frame. Sin dwell muerto (siempre se mueve) y sin
//  saltos (es continua aunque scrollees rápido).
// ─────────────────────────────────────────────────────────────────────────────

export interface UseJourneyScrollOptions {
  /** Pista de scroll: el outer div del journey. */
  containerRef: RefObject<HTMLElement | null>;
  mapRef: RefObject<maplibregl.Map | null>;
  /** MotionValue compartido (en SceneContext) con el progreso suavizado 0..1. */
  progress: MotionValue<number>;
  /** Notifica el cambio de escena discreta (para overlays con visibilidad booleana). */
  onSceneChange: (name: string) => void;
}

export function useJourneyScroll({
  containerRef,
  mapRef,
  progress,
  onSceneChange,
}: UseJourneyScrollOptions) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Amortigua el trackpad/fling: el progreso no puede teletransportarse, pasa
  // por todos los valores intermedios ⇒ se acaban los saltos (Caso B).
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 30,
    mass: 0.35,
  });

  const lastScene = useRef<string>("");

  function apply(p: number) {
    progress.set(p);
    const map = mapRef.current;
    if (map) {
      const c = cameraAtProgress(p);
      map.jumpTo({
        center: c.center,
        zoom: c.zoom,
        pitch: c.pitch,
        bearing: c.bearing,
      });
    }
    const scene = sceneAtProgress(p);
    if (scene !== lastScene.current) {
      lastScene.current = scene;
      onSceneChange(scene);
    }
  }

  useMotionValueEvent(smooth, "change", apply);

  // Estado inicial correcto al montar / recargar a media página.
  useEffect(() => {
    apply(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
