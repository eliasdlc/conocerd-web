"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Riel de progreso del journey.
//
//  La home es una pista de ~1300vh con un mapa sticky: sin una referencia
//  externa, el visitante no tiene forma de saber que hay siete capítulos
//  debajo — la primera pantalla se lee como una página completa. Este riel es
//  esa referencia: cuántos capítulos hay, en cuál estás y cuánto queda.
//
//  El avance es un estado, no una acción: va en el mismo relleno que las
//  barras de progreso de la app (`selected`), nunca en el acento.
//
//  Todo su movimiento sale del progreso de scroll (MotionValue), nunca de un
//  reloj en reposo. En desktop vive en el borde derecho con etiquetas; en móvil
//  se reduce a una barra de 3px en el borde superior, que es la convención que
//  la gente ya sabe leer sin ocupar ancho.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useScene } from "@/context/SceneContext";
import { usePieALaVista } from "@/hooks/usePieALaVista";
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

/**
 * Ata una escala del riel a un MotionValue escribiendo el `transform` en el
 * nodo, sin pasar por React ni por el sistema de componentes de motion. Es el
 * mismo resultado que un `<motion.span style={{scaleY}}>` y no arrastra el
 * runtime de componentes a la home por dos rellenos de barra.
 */
function useEscala(value: MotionValue<number>, eje: "X" | "Y") {
  const ref = useRef<HTMLSpanElement>(null);

  useMotionValueEvent(value, "change", (v) => {
    if (ref.current) ref.current.style.transform = `scale${eje}(${v})`;
  });

  // El primer frame: sin esto la barra arranca sin escala (llena) hasta que el
  // scroll se mueva por primera vez.
  useEffect(() => {
    if (ref.current) ref.current.style.transform = `scale${eje}(${value.get()})`;
  }, [value, eje]);

  return ref;
}

export default function JourneyProgress() {
  const { progress } = useScene();
  const [activo, setActivo] = useState(0);
  const moviendo = useEnMovimiento(progress);
  // El riel cuenta cuánto queda de recorrido: sobre el pie ya no queda nada, y
  // ahí sólo era una pieza flotante encima de contenido ajeno.
  const enElPie = usePieALaVista();

  const avance = useTransform(progress, avanceDeRiel);
  const rielRef = useEscala(avance, "Y");
  const barraRef = useEscala(avance, "X");

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
        className={`group fixed right-[clamp(10px,1.4vw,24px)] top-1/2 z-[80] hidden w-9 -translate-y-1/2 transition-opacity duration-300 desk:block ${
          enElPie ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <ol className="relative m-0 flex list-none flex-col p-0">
          {/* La pista y su relleno: el relleno es la única pieza animada y lo
              mueve el scroll directamente. Centrada en los 36px de la columna
              para que todos los puntos caigan sobre la misma línea. */}
          <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-0 w-[2px] rounded-full bg-line-strong" />
          <span
            ref={rielRef}
            aria-hidden="true"
            className="absolute bottom-0 left-[17px] top-0 w-[2px] origin-top rounded-full bg-selected"
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
                  className={`pointer-events-none absolute right-[calc(100%-2px)] whitespace-nowrap rounded-full bg-cream/95 px-2 py-[3px] font-label text-mini transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 ${
                    activo === i ? "font-bold text-ink" : "font-semibold text-muted"
                  } ${activo === i && moviendo ? "opacity-100" : "opacity-0"}`}
                >
                  {c.nombre}
                </span>
                {/* Un punto de 8 por capítulo, todos iguales, con un anillo de
                    crema que separa el punto de la pista. Quien dice dónde
                    estás es el relleno: cada capítulo ocupa exactamente una
                    fila, así que el borde del relleno cruza su punto a mitad de
                    banda. Un punto activo más gordo contaría lo mismo dos
                    veces y le quitaría el trabajo al riel. */}
                <span
                  className={`size-2 shrink-0 rounded-full ring-[3px] ring-cream transition-colors duration-200 ${
                    i <= activo ? "bg-selected" : "bg-line-strong group-hover:bg-muted-2"
                  }`}
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ── Móvil: barra fina en el borde superior ── */}
      <div
        aria-hidden="true"
        className={`fixed inset-x-0 top-0 z-[90] h-[3px] bg-line-strong transition-opacity duration-300 desk:hidden ${
          enElPie ? "opacity-0" : "opacity-100"
        }`}
      >
        <span ref={barraRef} className="block h-full origin-left bg-selected" />
      </div>
    </>
  );
}
