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

// Cada cuántos frames se escribe la cámara. A 60 Hz el giro avanza 0,02 grados
// por frame, que sobre el globo del hero son 0,14 px: MapLibre redibujaba el
// planeta entero 420 veces en 7 segundos para mover menos de un sexto de píxel.
// Escribiendo 1 de cada 3 el paso queda en 0,48 px, todavía por debajo del
// píxel, y se van 288 de esos 420 renders.
//
// Se cuentan FRAMES y no milisegundos a propósito: un umbral de 66 ms cae
// alternativamente en el cuarto y en el quinto rAF y produce pasos que alternan
// 0,64 y 0,80 px. Esa cadencia desigual es justo lo único que haría visible el
// cambio; contando frames son 20 Hz exactos y pasos iguales.
const FRAMES_POR_ESCRITURA = 3;

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
    let frame = 0;
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
        // El ángulo se integra en TODOS los frames, con el dt real: así la
        // velocidad angular no cambia y el globo gira exactamente igual de
        // rápido que antes. Lo único que baja es cada cuánto se le pide al
        // mapa que dibuje ese ángulo.
        setIdleBearing((getIdleBearing() + DEG_PER_SECOND * dt) % 360);
        if (frame % FRAMES_POR_ESCRITURA === 0) applyJourneyFrame(mapRef.current, p);
        frame++;
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
