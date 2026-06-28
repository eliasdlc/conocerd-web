"use client";

import { motion, useReducedMotion } from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
//  HeroRays (#16) — rutas dashed coral/mango, curvas, que parecen salir de
//  detrás del globo. Solo animación de ENTRADA (no reacciona al scroll). Va por
//  debajo del globo y del texto. Reemplaza conceptualmente al viejo AnimatedRays.
// ─────────────────────────────────────────────────────────────────────────────

const CORAL = "#F76C4D";
const MANGO = "#FF8D16";

// Curvas que emanan del centro (donde está el globo) hacia afuera.
// viewBox 1000×600, centro ~ (500,300).
type Ray = { d: string; color: string; delay: number };
const RAYS: Ray[] = [
  { d: "M500,300 C420,180 300,140 140,150", color: CORAL, delay: 0.1 },
  { d: "M500,300 C560,170 700,130 880,140", color: MANGO, delay: 0.25 },
  { d: "M500,300 C400,360 260,420 110,470", color: MANGO, delay: 0.4 },
  { d: "M500,300 C600,380 760,430 900,470", color: CORAL, delay: 0.55 },
  { d: "M500,300 C470,200 430,120 360,70", color: CORAL, delay: 0.7 },
  { d: "M500,300 C540,210 600,120 690,80", color: MANGO, delay: 0.85 },
];

export default function HeroRays() {
  const reduce = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.5,
      }}
    >
      {RAYS.map((ray, i) => (
        <motion.path
          key={i}
          d={ray.d}
          fill="none"
          stroke={ray.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="2 10"
          initial={reduce ? { pathLength: 1, opacity: 0.5 } : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{
            pathLength: { duration: 1.6, ease: "easeOut", delay: ray.delay },
            opacity: { duration: 0.5, delay: ray.delay },
          }}
        />
      ))}
    </svg>
  );
}
