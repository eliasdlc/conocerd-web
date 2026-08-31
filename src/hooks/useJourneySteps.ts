"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { animate, type AnimationPlaybackControls, type MotionValue } from "motion/react";
import type maplibregl from "maplibre-gl";
import { SCENE_BANDS, SCENE_COUNT, nearestSceneIndex, sceneAtProgress } from "@/lib/journey";
import { applyJourneyFrame, measureViewport } from "@/lib/journeyCamera";

// ─────────────────────────────────────────────────────────────────────────────
//  Motor de PASOS — el único motor del recorrido, en teléfono y en escritorio.
//
//  El teléfono lo usa desde agosto de 2026: el scroll libre corría demasiado y
//  nadie sabe medir cuán lento deslizar para ver el vuelo de la cámara. El
//  escritorio lo adoptó después, y por un motivo distinto: una cámara que es
//  función directa de la rueda o del trackpad hereda cada arranque y cada
//  frenazo del gesto, que es humano y por tanto irregular. El recorrido salía a
//  tirones aunque la página fuera a 60 fps.
//
//  Aquí cada paso empieza y termina exactamente donde el encuadre está
//  diseñado, y la animación cinemática completa ocurre entre medias, siempre
//  igual. El progreso se anima LINEALMENTE entre `center`s porque el easing ya
//  vive en la cámara (easeInOut por tramo en lib/journey): encadenar los dos
//  daría un arranque y un frenado dobles.
// ─────────────────────────────────────────────────────────────────────────────

const STEP_BASE_MS = 1150; // un paso
const STEP_EXTRA_MS = 300; // por cada paso adicional en un salto
const STEP_MAX_MS = 2600;

export interface UseJourneyStepsOptions {
  /**
   * Gated hasta que `matchMedia` resuelve: el primer encuadre depende del
   * tamaño real de la ventana, y asentar la cámara antes de saberlo la deja en
   * el sitio equivocado.
   */
  enabled: boolean;
  mapRef: RefObject<maplibregl.Map | null>;
  progress: MotionValue<number>;
  onSceneChange: (name: string) => void;
}

export interface JourneySteps {
  index: number;
  count: number;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useJourneySteps({
  enabled,
  mapRef,
  progress,
  onSceneChange,
}: UseJourneyStepsOptions): JourneySteps {
  const [index, setIndex] = useState(() => nearestSceneIndex(progress.get()));
  const indexRef = useRef(index);
  const animRef = useRef<AnimationPlaybackControls | null>(null);
  const animatingRef = useRef(false);
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

  const goTo = useCallback(
    (target: number) => {
      if (!enabled) return;
      const clamped = Math.max(0, Math.min(SCENE_COUNT - 1, target));
      const from = progress.get();
      const to = SCENE_BANDS[clamped].center;

      indexRef.current = clamped;
      setIndex(clamped);
      animRef.current?.stop();

      if (Math.abs(to - from) < 1e-6) {
        apply(to);
        return;
      }

      // Duración según cuántos keyframes se atraviesan: un salto de capítulo
      // no puede durar lo mismo que un paso, pero tampoco escalar sin techo.
      const jump = Math.max(1, Math.abs(clamped - nearestSceneIndex(from)));
      const ms = prefersReducedMotion()
        ? 1
        : Math.min(STEP_MAX_MS, STEP_BASE_MS + (jump - 1) * STEP_EXTRA_MS);

      animatingRef.current = true;
      animRef.current = animate(from, to, {
        duration: ms / 1000,
        ease: "linear",
        onUpdate: apply,
        onComplete: () => {
          animatingRef.current = false;
        },
      });
    },
    [apply, enabled, progress]
  );

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const prev = useCallback(() => goTo(indexRef.current - 1), [goTo]);

  // Al activarse, el motor asienta la cámara en el keyframe del paso actual.
  // Sin esto el mapa se quedaría en el encuadre con el que se construyó hasta
  // la primera pulsación.
  useEffect(() => {
    if (!enabled) return;
    measureViewport();
    apply(SCENE_BANDS[indexRef.current].center);
    // No hay pista de scroll: cualquier desplazamiento residual (una recarga
    // que restaura la posición, una vuelta desde el pie) dejaría el recorrido
    // corrido por debajo del nav.
    window.scrollTo(0, 0);

    const onResize = () => {
      measureViewport();
      apply(progress.get());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      animRef.current?.stop();
      animatingRef.current = false;
    };
  }, [enabled, apply, progress]);

  return { index, count: SCENE_COUNT, goTo, next, prev };
}
