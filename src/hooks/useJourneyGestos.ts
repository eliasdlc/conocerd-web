"use client";

import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Entrada por GESTOS del recorrido — ESCRITORIO.
//
//  La página no se scrollea: el motor de pasos (useJourneySteps) anima de
//  keyframe en keyframe y esta capa decide, por cada gesto de rueda, trackpad o
//  teclado, si ese gesto vale un paso. La decisión es binaria a propósito: no
//  existe "casi un paso" que luego se devuelva, ni una cola que una ráfaga
//  pueda convertir en tres escenas.
//
//  Un gesto es un paso cuando:
//  · el delta acumulado del gesto cruza `umbral`, y
//  · el motor no está en vuelo (todo delta durante la animación se descarta,
//    no se encola).
//
//  Lo que separa un slideshow bueno de uno que salta dos veces por swipe es la
//  cola de inercia del trackpad: tras levantar el dedo siguen llegando eventos
//  cada vez más pequeños durante un segundo o más. Esa cola se reconoce porque
//  sus deltas DECRECEN, y se ignora. Sólo un delta que crece respecto al
//  anterior (un empujón nuevo, o el siguiente notch de una rueda, que llega
//  siempre igual de grande) puede abrir otro paso dentro del mismo gesto. Un
//  silencio de `silencioMs` sin eventos cierra el gesto y arranca uno nuevo.
// ─────────────────────────────────────────────────────────────────────────────

export interface GestoParams {
  /** Delta acumulado (px) que un gesto tiene que cruzar para valer un paso. */
  umbral: number;
  /** Silencio (ms) sin eventos de rueda tras el cual el siguiente es un gesto nuevo. */
  silencioMs: number;
}

export interface UseJourneyGestosOptions {
  /** Sólo en escritorio, con el viewport resuelto y el recorrido bloqueado. */
  enabled: boolean;
  params: GestoParams;
  /** `true` mientras el motor de pasos anima: todo gesto se descarta. */
  enVuelo: () => boolean;
  index: number;
  count: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  /** Última escena y gesto hacia abajo: salir del recorrido al pie. */
  onEnd: () => void;
}

// Firefox entrega deltas en líneas (deltaMode 1); ~40 px por línea es la
// convención que usan los normalizadores de scroll.
function wheelDeltaPx(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 40;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}

// ¿Algún ancestro scrolleable puede consumir el delta (el manifiesto de Equipo,
// el panel lateral)? Entonces la rueda es suya y el recorrido no se mueve.
function innerScrollConsumes(e: WheelEvent): boolean {
  const down = e.deltaY > 0;
  let el = e.target instanceof Element ? e.target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      if (down ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

const STEP_KEYS: Record<string, 1 | -1> = {
  ArrowDown: 1,
  PageDown: 1,
  " ": 1,
  ArrowUp: -1,
  PageUp: -1,
};

export function useJourneyGestos({
  enabled,
  params,
  enVuelo,
  index,
  count,
  next,
  prev,
  goTo,
  onEnd,
}: UseJourneyGestosOptions) {
  // Los callbacks y el índice cambian por render; el listener se registra una
  // vez por `enabled` y lee siempre lo último a través de este ref.
  const latest = useRef({ index, count, next, prev, goTo, onEnd, enVuelo, params });
  useEffect(() => {
    latest.current = { index, count, next, prev, goTo, onEnd, enVuelo, params };
  });

  useEffect(() => {
    if (!enabled) return;

    // Estado del gesto en curso.
    let ultimoAt = 0;
    let ultimoAbs = 0;
    let ultimoSigno = 0;
    let acumulado = 0;
    let disparadoEnGesto = false;

    const paso = (dir: 1 | -1) => {
      const { index, count, next, prev, onEnd } = latest.current;
      if (dir > 0) {
        if (index >= count - 1) onEnd();
        else next();
      } else if (index > 0) {
        prev();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey) return; // zoom del navegador
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // gesto horizontal (píldora)
      if (innerScrollConsumes(e)) return;
      // La página está bloqueada y la rueda es del recorrido: nada de scroll
      // nativo, ni siquiera el rebote.
      e.preventDefault();

      const { params, enVuelo } = latest.current;
      const d = wheelDeltaPx(e);
      const abs = Math.abs(d);
      const signo = Math.sign(d);
      const now = performance.now();

      const nuevoGesto = now - ultimoAt > params.silencioMs || signo !== ultimoSigno;
      // Un delta que no decrece es un empujón nuevo (o un notch de rueda), no
      // la cola de inercia del anterior.
      const creciente = abs >= ultimoAbs;
      ultimoAt = now;
      ultimoAbs = abs;
      ultimoSigno = signo;

      if (nuevoGesto) {
        acumulado = 0;
        disparadoEnGesto = false;
      }

      if (enVuelo()) return;

      if (disparadoEnGesto) {
        // El gesto ya valió un paso. Sólo otro empujón entero abre el siguiente.
        if (abs >= params.umbral && creciente) paso(signo as 1 | -1);
        return;
      }

      acumulado += d;
      if (Math.abs(acumulado) >= params.umbral) {
        acumulado = 0;
        disparadoEnGesto = true;
        paso(signo as 1 | -1);
      }
    };

    // Teclado: un paso por pulsación, mismo cerrojo que la rueda. Inicio y Fin
    // saltan a los extremos. Nada mientras el foco está en un control.
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement) return;
      const { count, goTo, enVuelo } = latest.current;
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        if (!enVuelo()) goTo(e.key === "Home" ? 0 : count - 1);
        return;
      }
      const dir = STEP_KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      if (!enVuelo()) paso(dir);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled]);
}
