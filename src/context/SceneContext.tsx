"use client";

import { createContext, useContext, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";

type SceneContextValue = {
  activeScene: string;
  setActiveScene: (scene: string) => void;
  /** Progreso global suavizado 0..1 del journey (lo escribe useJourneyScroll). */
  progress: MotionValue<number>;
};

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  // The first server and client frame is always the Hero. Viewport detection
  // may decide how to drive the journey, but it never decides its first scene.
  const [activeScene, setActiveScene] = useState<string>("hero");
  const progress = useMotionValue(0);
  return (
    <SceneContext.Provider value={{ activeScene, setActiveScene, progress }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene(): SceneContextValue {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene debe usarse dentro de <SceneProvider>");
  return ctx;
}
