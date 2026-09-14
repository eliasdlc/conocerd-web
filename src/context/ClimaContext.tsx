"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useScene } from "@/context/SceneContext";
import type { Clima } from "@/lib/clima/openMeteo";

// El clima de ahora, una vez por sesión, para los chips de las polaroids de
// Destinos. Se pide la primera vez que el
// recorrido entra a un destino, nunca en el hero: ahí el LCP es el logo y una
// petición más en 4G lo retrasa. Si el handler falla, el valor se queda en
// null y nadie pinta nada.
const ClimaContext = createContext<Clima | null>(null);

export function ClimaProvider({ children }: { children: React.ReactNode }) {
  const { activeScene } = useScene();
  const [clima, setClima] = useState<Clima | null>(null);
  const pedido = useRef(false);

  useEffect(() => {
    if (pedido.current || !activeScene.startsWith("polaroid-")) return;
    pedido.current = true;
    // Sin abort al cambiar de escena: la petición tiene que sobrevivir al
    // vuelo que la disparó, o en un teléfono lento nunca llegaría a pintarse.
    fetch("/api/clima")
      .then((r) => (r.ok ? (r.json() as Promise<Clima>) : null))
      .then((c) => {
        if (c) setClima(c);
      })
      .catch(() => {});
  }, [activeScene]);

  return <ClimaContext.Provider value={clima}>{children}</ClimaContext.Provider>;
}

/** `null` hasta que el dato llega, o para siempre si el handler falló. */
export function useClima(): Clima | null {
  return useContext(ClimaContext);
}
