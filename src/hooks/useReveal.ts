"use client";
import { useEffect, useRef } from "react";

export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity .7s ease, transform .8s cubic-bezier(.2,.8,.3,1)";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.style.opacity = "1";
        el.style.transform = "none";

        el.querySelectorAll<HTMLElement>("[data-count]").forEach(countEl => {
          if (countEl.dataset.done) return;
          countEl.dataset.done = "1";
          const target = parseFloat(countEl.dataset.count!);
          const dec = countEl.dataset.dec ? parseInt(countEl.dataset.dec) : 0;
          const suf = countEl.dataset.suffix || "";
          const dur = 1300;
          const t0 = performance.now();
          const fmt = (v: number) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString("es-DO");
          const step = (t: number) => {
            const k = Math.min(1, (t - t0) / dur);
            const ease = 1 - Math.pow(1 - k, 3);
            countEl.textContent = fmt(target * ease) + suf;
            if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });

        el.querySelectorAll<HTMLElement>("[data-bar]").forEach(bar => {
          bar.style.width = bar.dataset.bar + "%";
        });

        observer.unobserve(el);
      },
      { threshold: 0.16 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
