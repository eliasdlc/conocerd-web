"use client";

import { useId } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Estampa ConoceRD — el cuño de caucho de la marca.
//
//  Un solo sello para todo el sitio en rework: la ruta guardada del mapa, la
//  esquina de las cards de Viajeros/Negocios y la mesa de El equipo. Doble
//  anillo, arco "CONOCERD ✶ REPÚBLICA DOMINICANA", el pin del logo al centro y
//  hasta dos líneas mono de contexto. La "realidad" del cuño la ponen tres
//  cosas: tinta desplazada con feTurbulence (el borde nunca es perfecto),
//  mix-blend-multiply (la tinta se funde con el papel/mapa, no flota) y una
//  rotación leve de tampón manual.
// ─────────────────────────────────────────────────────────────────────────────

export interface StampCRDProps {
  size?: number;
  /** Giro de tampón manual (deg). */
  rotate?: number;
  /** Tinta. Por defecto coral-ink (#B23410); mint-ink #0C6A60 también lee bien. */
  color?: string;
  /** Línea mono principal bajo el pin (p. ej. "RUTA GUARDADA"). */
  line1?: string;
  /** Línea mono secundaria (p. ej. "4 PARADAS · 320 KM"). */
  line2?: string;
  className?: string;
  /** Texto accesible; por defecto decorativa (aria-hidden). */
  label?: string;
}

export default function StampCRD({
  size = 112,
  rotate = -8,
  color = "#B23410",
  line1 = "EST. 2026",
  line2 = "· HECHO EN RD ·",
  className = "",
  label,
}: StampCRDProps) {
  const uid = useId();
  const topArc = `${uid}-top`;
  const bottomArc = `${uid}-bot`;
  const ink = `${uid}-ink`;

  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, mixBlendMode: "multiply", color }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <defs>
        {/* Tinta imperfecta: un desplazamiento sutil rompe la geometría CAD. */}
        <filter id={ink} x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" />
        </filter>
        <path id={topArc} d="M 16 70 A 54 54 0 0 1 124 70" fill="none" />
        <path id={bottomArc} d="M 21.5 70 A 48.5 48.5 0 0 0 118.5 70" fill="none" />
      </defs>

      <g filter={`url(#${ink})`} opacity="0.88">
        {/* Doble anillo del cuño */}
        <circle cx="70" cy="70" r="66" fill="none" stroke="currentColor" strokeWidth="3.4" />
        <circle cx="70" cy="70" r="60.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
        {/* Anillo interior punteado, límite del área de texto */}
        <circle cx="70" cy="70" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1.6 3.4" opacity="0.8" />

        {/* Arco superior: la marca (medidas contenidas: a más de fs 12 el
            texto desborda el arco y se recorta contra el viewBox) */}
        <text className="font-mono" fontSize="12" fontWeight="700" letterSpacing="2.4" fill="currentColor">
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">
            ✶ CONOCERD ✶
          </textPath>
        </text>
        {/* Arco inferior: el país */}
        <text className="font-mono" fontSize="7.2" fontWeight="700" letterSpacing="1.6" fill="currentColor">
          <textPath href={`#${bottomArc}`} startOffset="50%" textAnchor="middle">
            REPÚBLICA DOMINICANA
          </textPath>
        </text>

        {/* El pin del logo, en tinta (el hueco es papel, no crema) */}
        <g transform="translate(70 48) scale(1.15)">
          <path
            d="M0 -9.5c-3.7 0-6.7 3-6.7 6.7 0 5 6.7 12.3 6.7 12.3s6.7-7.3 6.7-12.3c0-3.7-3-6.7-6.7-6.7z"
            fill="currentColor"
          />
          <circle cx="0" cy="-2.6" r="2.5" fill="#FFFFFF" fillOpacity="0.92" />
        </g>

        {/* Líneas de contexto — dentro del anillo punteado (r40): la cuerda a
            estas alturas mide ~75px, por eso los tamaños van contenidos. */}
        <text x="70" y="80" textAnchor="middle" className="font-mono" fontSize="7.4" fontWeight="700" letterSpacing="1.1" fill="currentColor">
          {line1}
        </text>
        <text x="70" y="89.5" textAnchor="middle" className="font-mono" fontSize="5.2" fontWeight="700" letterSpacing="0.8" fill="currentColor" opacity="0.85">
          {line2}
        </text>
      </g>
    </svg>
  );
}
