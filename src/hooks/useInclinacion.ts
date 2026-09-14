"use client";

import { useEffect, useState } from "react";
import {
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
//  Una superficie que se inclina hacia el mouse.
//
//  Motion values de principio a fin, nunca estado de React: el puntero manda
//  decenas de posiciones por segundo y cada una sería un render del árbol. La
//  posición del puntero dentro del elemento (0..1 en cada eje) se convierte en
//  grados y pasa por un muelle, así que al salir el papel vuelve solo a plano.
//
//  Sólo con puntero fino y sin "menos movimiento": en un teléfono el hook no
//  registra nada, y quien pidió quietud la tiene.
// ─────────────────────────────────────────────────────────────────────────────

/** `true` cuando hay un mouse o trackpad de verdad. Arranca en `false` para que
 *  el primer render del servidor y del cliente coincidan. */
export function usePunteroFino(): boolean {
  const [fino, setFino] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const leer = () => setFino(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);
  return fino;
}

export type Inclinacion = {
  /** Si el hook está escuchando: puntero fino, sin menos movimiento, y activo. */
  activa: boolean;
  /** Para el `style` de un `motion.*`: rotación y perspectiva. */
  style: { rotateX: MotionValue<number>; rotateY: MotionValue<number>; transformPerspective: number };
  /** Un gradiente que cruza la superficie con el puntero, para un brillo. */
  brillo: MotionValue<string>;
  handlers: {
    onPointerMove?: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerLeave?: () => void;
  };
};

export function useInclinacion({ grados, activo = true }: { grados: number; activo?: boolean }): Inclinacion {
  const fino = usePunteroFino();
  const reduce = useReducedMotion();
  const activa = Boolean(activo && fino && !reduce);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const muelle = { stiffness: 120, damping: 18 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-grados, grados]), muelle);
  const rotateX = useSpring(useTransform(py, [0, 1], [grados, -grados]), muelle);
  const brilloX = useSpring(useTransform(px, [0, 1], [10, 90]), muelle);
  const brillo = useMotionTemplate`linear-gradient(115deg, rgba(255,255,255,0) calc(${brilloX}% - 28%), rgba(255,255,255,.35) ${brilloX}%, rgba(255,255,255,0) calc(${brilloX}% + 28%))`;

  // Al desactivarse, el papel vuelve a plano por el muelle.
  useEffect(() => {
    if (activa) return;
    px.set(0.5);
    py.set(0.5);
  }, [activa, px, py]);

  const handlers: Inclinacion["handlers"] = activa
    ? {
        onPointerMove: (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (!r.width || !r.height) return;
          px.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
          py.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
        },
        onPointerLeave: () => {
          px.set(0.5);
          py.set(0.5);
        },
      }
    : {};

  return { activa, style: { rotateX, rotateY, transformPerspective: 900 }, brillo, handlers };
}
