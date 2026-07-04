"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent } from "motion/react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useScene } from "@/context/SceneContext";

gsap.registerPlugin(MotionPathPlugin);

// ─────────────────────────────────────────────────────────────────────────────
//  HeroRoutes (#16) — rutas de viaje animadas alrededor/detrás del globo.
//  Van en zIndex -1 dentro de la capa sticky: el canvas del globo es opaco sobre
//  la esfera y transparente alrededor, así que las rutas se ven "girando" por
//  fuera y pasan POR DETRÁS del globo hacia RD. GSAP: cada ruta se dibuja
//  (draw-on) con stagger, luego fluye (marching dashes) y un marcador viaja por
//  ella (MotionPath) ⇒ sensación de viaje. Sólo en el hero: se desvanece al
//  scrollear. Respeta prefers-reduced-motion.
// ─────────────────────────────────────────────────────────────────────────────

// Coordenadas en un lienzo 1440×900. Todas convergen al pin de RD (~880,360),
// arqueándose sobre el globo como rutas de vuelo de un mapa de viaje.
const RD = { x: 880, y: 360 };
const ROUTES: { d: string; color: string }[] = [
  { d: `M -40 700 C 220 640 380 380 ${RD.x} ${RD.y}`, color: "#F76C4D" },
  { d: `M 120 900 C 420 820 560 520 ${RD.x} ${RD.y}`, color: "#FF8D16" },
  { d: `M 1500 760 C 1240 700 1080 460 ${RD.x} ${RD.y}`, color: "#25CCB8" },
  { d: `M 760 980 C 940 820 1000 520 ${RD.x} ${RD.y}`, color: "#FF8D16" },
  { d: `M 1480 220 C 1240 300 1060 300 ${RD.x} ${RD.y}`, color: "#F76C4D" },
];

export default function HeroRoutes() {
  const { progress } = useScene();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Fade hero-only: se apaga apenas empieza el scroll (el globo baja a RD).
  useMotionValueEvent(progress, "change", (p) => {
    const el = wrapRef.current;
    if (el) el.style.opacity = String(Math.max(0, 1 - p * 16));
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      ROUTES.forEach((r, i) => {
        // Glow (halo) + core (blanco) de la misma ruta se dibujan juntos.
        const parts = Array.from(svg.querySelectorAll<SVGPathElement>(`path[data-r="${i}"]`));
        const len = parts[0]?.getTotalLength() ?? 0;
        gsap.set(parts, { strokeDasharray: len, strokeDashoffset: len });
        const start = 0.3 + i * 0.4;
        const tl = gsap.timeline({ delay: start });
        tl.to(parts, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" })
          // Al terminar de dibujarse, pasa a punteado y fluye en loop (marching).
          .set(parts, { strokeDasharray: "10 14" })
          .to(parts, { strokeDashoffset: -240, duration: 7, ease: "none", repeat: -1 });

        // Marcador que viaja por la ruta (sensación de "alguien en camino").
        const dot = svg.querySelector<SVGCircleElement>(`circle.rider[data-r="${i}"]`);
        if (dot) {
          gsap.set(dot, { opacity: 0 });
          gsap.to(dot, { opacity: 1, duration: 0.4, delay: start + 1.3 });
          gsap.to(dot, {
            duration: 5.5,
            repeat: -1,
            delay: start + 1.3,
            ease: "none",
            motionPath: { path: r.d, align: r.d, alignOrigin: [0.5, 0.5] },
          });
        }
      });
    }, svg);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 6, // sobre el globo + su sombreado (z4), debajo del texto/pin del hero (z10)
        pointerEvents: "none",
        transition: "opacity 0.3s linear",
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
      >
        <defs>
          <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {/* Halo coloreado (glow, difuminado) */}
        {ROUTES.map((r, i) => (
          <path
            key={`g-${i}`}
            data-r={i}
            d={r.d}
            fill="none"
            stroke={r.color}
            strokeWidth={9}
            strokeLinecap="round"
            opacity={0.55}
            filter="url(#routeGlow)"
          />
        ))}
        {/* Núcleo blanco (alto contraste sobre tierra y mar) */}
        {ROUTES.map((r, i) => (
          <path
            key={`c-${i}`}
            data-r={i}
            d={r.d}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.95}
          />
        ))}
        {/* Marcadores viajando */}
        {ROUTES.map((r, i) => (
          <circle key={`d-${i}`} className="rider" data-r={i} r={6} fill="#fff" stroke={r.color} strokeWidth={3} opacity={0} />
        ))}
      </svg>
    </div>
  );
}
