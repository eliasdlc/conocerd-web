"use client";

import { RefObject, useEffect } from "react";
import { useScene } from "@/context/SceneContext";

export function useSceneTrigger(containerRef: RefObject<HTMLElement | null>) {
  const { setActiveScene } = useScene();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const triggers = Array.from(
      container.querySelectorAll<HTMLElement>("[data-scene]")
    );
    if (triggers.length === 0) return;

    // Snapshot absolute page-Y position of the container and each trigger.
    // Trigger divs' offsetTop is relative to outerRef (position:relative).
    const containerTop =
      container.getBoundingClientRect().top + window.scrollY;

    const bands = triggers.map((el) => ({
      scene: el.getAttribute("data-scene")!,
      start: el.offsetTop,
      end: el.offsetTop + el.offsetHeight,
    }));

    function tick() {
      // Anchor point = center of the viewport, relative to the container top.
      // A scene activates when this anchor falls inside its band.
      const anchor =
        window.scrollY - containerTop + window.innerHeight * 0.5;
      const match = bands.find((b) => anchor >= b.start && anchor < b.end);
      if (match) setActiveScene(match.scene);
    }

    let rafId = 0;
    function onScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    tick(); // set correct scene on mount / back-navigation

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [containerRef, setActiveScene]);
}
