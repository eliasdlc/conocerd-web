"use client";

import { createContext, useContext, useState } from "react";

type SceneContextValue = {
  activeScene: string;
  setActiveScene: (scene: string) => void;
};

const SceneContext = createContext<SceneContextValue>({
  activeScene: "",
  setActiveScene: () => {},
});

export function SceneProvider({ children }: { children: React.ReactNode }) {
  const [activeScene, setActiveScene] = useState<string>("");
  return (
    <SceneContext.Provider value={{ activeScene, setActiveScene }}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene(): SceneContextValue {
  return useContext(SceneContext);
}
