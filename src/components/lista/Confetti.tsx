"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Confeti de una sola pasada para el registro en /lista.
//
//  Sin canvas ni librería: son ~26 divs con un keyframe CSS y su destino en
//  custom properties. Se montan al registrarse y se desmontan solos al acabar,
//  así que no dejan nada animándose en reposo — que es justo lo que hace
//  molesta una celebración. Con `prefers-reduced-motion` no se monta nada.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#E0552F", "#FF8D16", "#25CCB8", "#0C6A60", "#FFC94D"];
const COUNT = 26;
const LIFETIME_MS = 1900;

interface Particle {
  color: string;
  w: number;
  h: number;
  round: boolean;
  dx: number;
  peak: number;
  dy: number;
  rot: number;
  delay: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: COUNT }, (_, i) => {
    // Reparto en abanico en vez de aleatorio puro: con 26 partículas el azar
    // deja huecos visibles a un lado. El jitter rompe la simetría.
    const spread = (i / (COUNT - 1)) * 2 - 1; // -1 … 1
    const jitter = Math.random() * 0.4 - 0.2;
    return {
      color: COLORS[i % COLORS.length],
      w: 5 + Math.random() * 5,
      h: 7 + Math.random() * 7,
      round: i % 4 === 0,
      dx: (spread + jitter) * 190,
      peak: -(55 + Math.random() * 120),
      dy: 170 + Math.random() * 150,
      rot: (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 460),
      delay: Math.random() * 0.16,
    };
  });
}

export default function Confetti() {
  const [alive, setAlive] = useState(true);
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const particles = useMemo(() => (reduced ? [] : makeParticles()), [reduced]);

  useEffect(() => {
    const id = window.setTimeout(() => setAlive(false), LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (reduced || !alive) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-0 overflow-visible"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="crd-confetti"
          style={
            {
              width: p.w,
              height: p.round ? p.w : p.h,
              borderRadius: p.round ? "50%" : 2,
              background: p.color,
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}px`,
              "--peak": `${p.peak}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
