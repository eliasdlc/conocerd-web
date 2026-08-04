"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Riel de progreso del journey.
//
//  La home es una pista de ~1300vh con un mapa sticky: sin una referencia
//  externa, el visitante no tiene forma de saber que hay siete capítulos
//  debajo — la primera pantalla se lee como una página completa. Este riel es
//  esa referencia: cuántos capítulos hay, en cuál estás y cuánto queda.
//
//  Todo su movimiento sale del progreso de scroll (MotionValue), nunca de un
//  reloj en reposo. En desktop vive en el borde derecho con etiquetas; en móvil
//  se reduce a una barra de 3px en el borde superior, que es la convención que
//  la gente ya sabe leer sin ocupar ancho.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useTransform } from "motion/react";
import { useScene } from "@/context/SceneContext";
import { SCENE_BANDS } from "@/lib/journey";
import { scrollToSection } from "@/lib/journeyNav";

type Capitulo = { nombre: string; escena: string; start: number; end: number };

// Los capítulos salen de SCENES (lib/journey): escenas consecutivas que
// comparten `chapter` se funden en una sola parada del riel — los 6 polaroids
// son "Destinos", no seis puntos distintos.
const CAPITULOS: Capitulo[] = (() => {
  const out: Capitulo[] = [];
  for (const b of SCENE_BANDS) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.nombre === b.def.chapter) ultimo.end = b.end;
    else out.push({ nombre: b.def.chapter, escena: b.name, start: b.start, end: b.end });
  }
  return out;
})();

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Índice del capítulo que contiene un progreso 0..1. */
function capituloEn(p: number): number {
  const i = CAPITULOS.findIndex((c) => p < c.end);
  return i < 0 ? CAPITULOS.length - 1 : i;
}

/**
 * Progreso → avance del riel 0..1. No es el progreso crudo: cada capítulo ocupa
 * exactamente una fila, así que el relleno cruza el punto de un capítulo a mitad
 * de su banda y el riel nunca miente sobre en cuál estás (las bandas de scroll
 * miden distinto: `mapa` dura 130vh y `polaroid-1` 82vh).
 */
function avanceDeRiel(p: number): number {
  const i = capituloEn(p);
  const c = CAPITULOS[i];
  return (i + clamp01((p - c.start) / (c.end - c.start))) / CAPITULOS.length;
}

/**
 * `true` mientras el scroll se está moviendo (y ~1 s después de parar). Las
 * etiquetas del riel viven de esto: mientras bajas te dicen a qué capítulo
 * entras, y al detenerte se apartan — en reposo se montarían sobre el mockup
 * del teléfono de Viajeros/Negocios, que es contenido que se lee quieto.
 */
function useEnMovimiento(progress: ReturnType<typeof useScene>["progress"]): boolean {
  const [moviendo, setMoviendo] = useState(false);
  const timer = useRef(0);

  useMotionValueEvent(progress, "change", () => {
    // setState con el mismo valor: React descarta el render, así que esto no
    // cuesta un re-render por frame.
    setMoviendo(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMoviendo(false), 1000);
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return moviendo;
}

export default function JourneyProgress() {
  const { progress } = useScene();
  const [activo, setActivo] = useState(0);
  const moviendo = useEnMovimiento(progress);

  const avance = useTransform(progress, avanceDeRiel);

  // El índice cambia 7 veces en todo el recorrido: setState aquí no re-renderiza
  // por frame (el relleno sí va por frame, pero fuera de React vía MotionValue).
  useMotionValueEvent(progress, "change", (p) => {
    const i = capituloEn(p);
    setActivo((prev) => (prev === i ? prev : i));
  });

  return (
    <>
      {/* ── Desktop: riel de capítulos en el borde derecho ── */}
      <nav
        aria-label="Progreso del recorrido"
        data-moviendo={moviendo ? "true" : undefined}
        className="group fixed right-[clamp(10px,1.4vw,24px)] top-1/2 z-[80] hidden w-9 -translate-y-1/2 desk:block"
      >
        <ol className="relative m-0 flex list-none flex-col p-0">
          {/* La pista y su relleno: el relleno es la única pieza animada y lo
              mueve el scroll directamente. Centrada en los 36px de la columna
              para que todos los puntos caigan sobre la misma línea. */}
          <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-0 w-[2px] rounded-full bg-ink/12" />
          <motion.span
            aria-hidden="true"
            style={{ scaleY: avance }}
            className="absolute bottom-0 left-[17px] top-0 w-[2px] origin-top rounded-full bg-mango"
          />

          {CAPITULOS.map((c, i) => (
            <li key={c.nombre}>
              <button
                type="button"
                onClick={() => scrollToSection(`trigger-${c.escena}`)}
                aria-current={activo === i ? "step" : undefined}
                className="relative flex size-9 cursor-pointer items-center justify-center rounded-full focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2"
              >
                {/* Absoluta: la etiqueta no debe ensanchar la columna ni robar
                    el hover del contenido que tiene debajo. */}
                <span
                  className={`pointer-events-none absolute right-[calc(100%-2px)] whitespace-nowrap rounded-full bg-cream/95 px-2 py-[3px] font-mono text-micro font-bold uppercase tracking-[.1em] shadow-card transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 ${
                    activo === i ? "text-ink-2" : "text-muted"
                  } ${activo === i && moviendo ? "opacity-100" : "opacity-0"}`}
                >
                  {c.nombre}
                </span>
                <span
                  className={`grid shrink-0 place-items-center rounded-full border-2 transition-all duration-200 ${
                    activo === i
                      ? "size-4 border-mango bg-cream"
                      : i < activo
                        ? "size-2.5 border-transparent bg-mango"
                        : "size-2.5 border-transparent bg-ink/20 group-hover:bg-ink/30"
                  }`}
                >
                  {/* Punto interior del capítulo activo: el aro solo no se lee
                      como "estás aquí" a 10px de distancia. */}
                  {activo === i && <span className="block size-1.5 rounded-full bg-mango" />}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Móvil: barra fina en el borde superior ── */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[90] h-[3px] bg-ink/10 desk:hidden"
      >
        <motion.span style={{ scaleX: avance }} className="block h-full origin-left bg-mango" />
      </div>
    </>
  );
}
