"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { MotionValue } from "motion/react";
import type maplibregl from "maplibre-gl";
import { heroFactorAtProgress } from "@/lib/journey";
import { applyJourneyFrame, getIdleBearing, setIdleBearing } from "@/lib/journeyCamera";

const DEG_PER_SECOND = 1.2;

// Excepción aprobada al "sin animaciones en reposo": el globo del hero gira
// lento mientras nadie interactúa.
//
// No escribe la cámara por su cuenta — acumula un OFFSET de bearing que
// `applyJourneyFrame` mezcla y desvanece con el factor hero. Antes hacía su
// propio `jumpTo` y el bearing acababa lejos del keyframe: al primer scroll la
// cámara volvía de golpe al valor de la escena (salto visible).
export function useHeroIdleMotion(
  mapRef: RefObject<maplibregl.Map | null>,
  progress: MotionValue<number>,
  active: boolean
) {
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;

      if (heroFactorAtProgress(progress.get()) > 0.01 && !document.hidden) {
        setIdleBearing((getIdleBearing() + DEG_PER_SECOND * dt) % 360);
        applyJourneyFrame(mapRef.current, progress.get());
      }
      // The loop belongs exclusively to the active Hero and is stopped by the
      // effect cleanup as soon as the journey moves on.
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [active, mapRef, progress]);
}
