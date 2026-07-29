"use client";

import { useEffect, useState } from "react";

// Compact compositions apply to phones and portrait touch tablets. This avoids
// treating an 768px-wide tablet as a desktop merely because it crosses a CSS
// convention rather than gaining meaningful map real estate.
export const MOBILE_BREAKPOINT = 900;

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

/**
 * Unlike `useIsMobile`, this hook deliberately starts unresolved. A journey
 * engine must never infer a desktop mode during hydration and then replace it
 * a frame later on a phone.
 */
export function useViewportMode(maxWidth: number = MOBILE_BREAKPOINT - 1) {
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidth]);

  return { mobile: mobile ?? false, resolved: mobile !== null };
}
