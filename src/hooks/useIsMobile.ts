"use client";

import { useEffect, useState } from "react";

// Breakpoint compartido entre el layout del hero (HeroOverlay) y el encuadre
// del globo (useJourneyScroll) para que ambos coincidan: < 768px = apilado.
export const MOBILE_BREAKPOINT = 768;

export function useIsMobile(maxWidth: number = MOBILE_BREAKPOINT - 1) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [maxWidth]);
  return mobile;
}
