"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import type { MotionValue } from "motion/react";
import type maplibregl from "maplibre-gl";
import { heroFactorAtProgress } from "@/lib/journey";
import { applyJourneyFrame, getIdleBearing, setIdleBearing } from "@/lib/journeyCamera";

const DEG_PER_SECOND = 1.2;
const MAX_IDLE_MS = 10_000;
const MAX_IDLE_PROGRESS = 0.004;

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
    const startedAt = performance.now();

    const tick = (now: number) => {
      if (!running) return;
      const p = progress.get();
      if (p > MAX_IDLE_PROGRESS || now - startedAt >= MAX_IDLE_MS) {
        running = false;
        return;
      }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;

      if (heroFactorAtProgress(p) > 0.01 && !document.hidden) {
        setIdleBearing((getIdleBearing() + DEG_PER_SECOND * dt) % 360);
        applyJourneyFrame(mapRef.current, p);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [active, mapRef, progress]);
}
