"use client";

import { useEffect, useRef } from "react";
import { useMotionValueEvent } from "motion/react";
import { useMap } from "@/components/map/Map";
import { useScene } from "@/context/SceneContext";

// ─────────────────────────────────────────────────────────────────────────────
//  GlobeShading (#1) — le da VOLUMEN al globo del hero. MapLibre dibuja la esfera
//  plana; estas capas DOM la sombrean como un planeta real:
//    · terminator  → gradiente que oscurece el borde inferior-derecho (luz desde
//                    arriba-izq) ⇒ la esfera deja de verse como un sticker.
//    · halo        → glow atmosférico teal alrededor del disco.
//    · sombra de contacto → elipse difusa debajo, ancla el globo al crema.
//    · nubes        → capa suave girando lento, recortada al disco (vida sutil).
//
//  Posición y radio se calculan del propio mapa: el centro es map.project(RD) y
//  el radio se deriva del zoom (fórmula del globo). Así trackean el globo aunque
//  el padding lo empuje a la derecha. Se desvanecen apenas empieza el scroll:
//  cuando el globo baja y hace zoom a RD ya no es un disco, así que se quitan.
// ─────────────────────────────────────────────────────────────────────────────

const RD_CENTER: [number, number] = [-70.1627, 18.7357];

// Radio en px del disco del globo a un zoom dado. worldSize = 512·2^zoom; la
// circunferencia de la esfera ≈ worldSize ⇒ r = worldSize / 2π.
function globeRadiusPx(zoom: number): number {
  return (512 * Math.pow(2, zoom)) / (2 * Math.PI);
}

export default function GlobeShading() {
  const map = useMap();
  const { progress } = useScene();

  const wrapRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);

  function update(p: number) {
    const wrap = wrapRef.current;
    const disc = discRef.current;
    if (!map || !wrap || !disc) return;

    // Sólo visible en el hero; se apaga rápido al primer scroll (globo ya baja).
    const vis = Math.max(0, 1 - p * 22);
    wrap.style.opacity = String(vis);
    if (vis <= 0) {
      wrap.style.visibility = "hidden";
      return;
    }
    wrap.style.visibility = "visible";

    try {
      const c = map.project(RD_CENTER);
      const r = globeRadiusPx(map.getZoom());
      disc.style.width = `${r * 2}px`;
      disc.style.height = `${r * 2}px`;
      disc.style.left = `${c.x}px`;
      disc.style.top = `${c.y}px`;
    } catch {
      /* project puede fallar antes del primer render del estilo */
    }
  }

  useMotionValueEvent(progress, "change", update);

  // Posiciona una vez cuando el mapa está listo (antes del primer scroll).
  useEffect(() => {
    if (!map) return;
    let raf = 0;
    const tryPlace = () => {
      update(progress.get());
      // Reintenta unos frames por si el estilo aún no proyecta bien.
      raf = requestAnimationFrame(tryPlace);
    };
    raf = requestAnimationFrame(tryPlace);
    const stop = setTimeout(() => cancelAnimationFrame(raf), 600);
    const onResize = () => update(progress.get());
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stop);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 4, // sobre el canvas del mapa, debajo del contenido del hero (z 10)
        transition: "opacity 0.25s linear",
      }}
    >
      {/* Disco: contenedor centrado en el globo, todo lo demás es relativo a él */}
      <div
        ref={discRef}
        style={{
          position: "absolute",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
        }}
      >
        {/* Halo atmosférico teal */}
        <div
          style={{
            position: "absolute",
            inset: "-6%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%, rgba(37,204,184,0) 60%, rgba(37,204,184,0.28) 78%, rgba(37,204,184,0) 100%)",
            filter: "blur(6px)",
          }}
        />

        {/* Sombra de contacto: elipse difusa debajo del globo */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "97%",
            width: "78%",
            height: "14%",
            transform: "translate(-50%, 0)",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(38,70,83,0.28) 0%, rgba(38,70,83,0) 70%)",
            filter: "blur(4px)",
          }}
        />

        {/* Nubes girando lento, recortadas al disco */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "-25%",
              opacity: 0.5,
              mixBlendMode: "screen",
              background:
                "radial-gradient(circle at 22% 34%, rgba(255,255,255,0.9) 0 6%, rgba(255,255,255,0) 12%)," +
                "radial-gradient(circle at 68% 26%, rgba(255,255,255,0.7) 0 5%, rgba(255,255,255,0) 11%)," +
                "radial-gradient(circle at 44% 60%, rgba(255,255,255,0.8) 0 7%, rgba(255,255,255,0) 14%)," +
                "radial-gradient(circle at 78% 66%, rgba(255,255,255,0.6) 0 5%, rgba(255,255,255,0) 12%)," +
                "radial-gradient(circle at 30% 78%, rgba(255,255,255,0.55) 0 4%, rgba(255,255,255,0) 10%)",
              animation: "crdGlobeClouds 90s linear infinite",
            }}
          />
        </div>

        {/* Terminator: sombreado esférico (luz arriba-izq, sombra abajo-der) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 34%)," +
              "radial-gradient(circle at 62% 68%, rgba(12,42,52,0.42) 0%, rgba(12,42,52,0.12) 46%, rgba(12,42,52,0) 66%)",
            boxShadow: "inset -10px -14px 40px rgba(12,42,52,0.35), inset 8px 10px 30px rgba(255,255,255,0.22)",
          }}
        />
      </div>
    </div>
  );
}
