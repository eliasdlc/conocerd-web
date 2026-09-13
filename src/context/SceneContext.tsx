"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";

type SceneContextValue = {
  activeScene: string;
  setActiveScene: (scene: string) => void;
  /** Progreso global 0..1 del recorrido (lo escribe useJourneySteps). */
  progress: MotionValue<number>;
};

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  // The first server and client frame is always the Hero. Viewport detection
  // may decide how to drive the journey, but it never decides its first scene.
  const [activeScene, setActiveScene] = useState<string>("hero");
  const progress = useMotionValue(0);
  // Sin memo, el objeto es nuevo en cada render y todo consumidor se vuelve a
  // renderizar aunque la escena no haya cambiado. `setActiveScene` y `progress`
  // son estables, así que el value sólo cambia cuando cambia la escena.
  const value = useMemo(
    () => ({ activeScene, setActiveScene, progress }),
    [activeScene, progress]
  );
  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>;
}

export function useScene(): SceneContextValue {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error("useScene debe usarse dentro de <SceneProvider>");
  return ctx;
}
