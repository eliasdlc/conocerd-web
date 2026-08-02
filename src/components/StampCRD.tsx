"use client";

import { useId } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  Estampa ConoceRD — sticker de equipaje nostálgico (rework ago 2026).
//
//  Antes era tinta pura con mix-blend-multiply: sin fondo, al sobresalir de una
//  card la mitad caía sobre el mapa y el cuño se leía partido en dos tonos.
//  Ahora es una calcomanía física: base de papel crema con borde festoneado
//  (troquel postal) y sombra propia, SIEMPRE opaca, con el cuño entintado
//  encima. El centro lleva el wordmark real de la marca (public/assets/
//  wordmark.svg) en vez de redibujar el logo a mano.
//
//  La "realidad" del cuño la siguen poniendo la tinta desplazada con
//  feTurbulence (el trazo nunca es perfecto) y la rotación de tampón manual.
//  El wordmark va SIN filtro: el logo se mantiene nítido a cualquier tamaño.
// ─────────────────────────────────────────────────────────────────────────────

export interface StampCRDProps {
  size?: number;
  /** Giro de tampón manual (deg). */
  rotate?: number;
  /** Tinta. Por defecto coral-ink (#B23410); mint-ink #0C6A60 también lee bien. */
  color?: string;
  /** Línea mono principal bajo el wordmark (p. ej. "RUTA GUARDADA"). */
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
  const drop = `${uid}-drop`;

  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, color }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <defs>
        {/* Tinta imperfecta: un desplazamiento sutil rompe la geometría CAD. */}
        <filter id={ink} x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" />
        </filter>
        {/* Sombra de pegatina: despega el sticker del papel o del mapa. */}
        <filter id={drop} x="-14%" y="-14%" width="128%" height="132%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="2.4" floodColor="#264653" floodOpacity="0.30" />
        </filter>
        <path id={topArc} d="M 25 70 A 45 45 0 0 1 115 70" fill="none" />
        <path id={bottomArc} d="M 26.5 70 A 43.5 43.5 0 0 0 113.5 70" fill="none" />
      </defs>

      {/* Base de papel: círculo + puntos gordos en el borde = troquel
          festoneado. El fondo nunca es transparente. */}
      <g filter={`url(#${drop})`}>
        <circle cx="70" cy="70" r="62" fill="#FFFDF6" />
        <circle
          cx="70"
          cy="70"
          r="62"
          fill="none"
          stroke="#FFFDF6"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="0.1 9.32"
        />
      </g>

      {/* El cuño entintado (todo en currentColor, con la tinta imperfecta) */}
      <g filter={`url(#${ink})`} opacity="0.92">
        {/* Doble anillo del cuño */}
        <circle cx="70" cy="70" r="57" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="70" cy="70" r="52.5" fill="none" stroke="currentColor" strokeWidth="1.1" />

        {/* Arco superior: el país */}
        <text className="font-mono" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="currentColor">
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">
            REPÚBLICA DOMINICANA
          </textPath>
        </text>
        {/* Arco inferior: el lema */}
        <text className="font-mono" fontSize="6.6" fontWeight="700" letterSpacing="1.2" fill="currentColor" opacity="0.9">
          <textPath href={`#${bottomArc}`} startOffset="50%" textAnchor="middle">
            ✶ DESCUBRE LO NUESTRO ✶
          </textPath>
        </text>
        {/* Estrellas laterales, como en los cuños de pasaporte */}
        <text x="19.5" y="73.5" textAnchor="middle" fontSize="8" fill="currentColor">✶</text>
        <text x="120.5" y="73.5" textAnchor="middle" fontSize="8" fill="currentColor">✶</text>

        {/* El pin de la marca corona el wordmark */}
        <g transform="translate(70 43) scale(0.92)">
          <path
            d="M0 -9.5c-3.7 0-6.7 3-6.7 6.7 0 5 6.7 12.3 6.7 12.3s6.7-7.3 6.7-12.3c0-3.7-3-6.7-6.7-6.7z"
            fill="currentColor"
          />
          <circle cx="0" cy="-2.6" r="2.5" fill="#FFFDF6" />
        </g>

        {/* Líneas de contexto del cuño */}
        <text x="70" y="86" textAnchor="middle" className="font-mono" fontSize="7.6" fontWeight="700" letterSpacing="1.1" fill="currentColor">
          {line1}
        </text>
        <text x="70" y="95.5" textAnchor="middle" className="font-mono" fontSize="5.4" fontWeight="700" letterSpacing="0.8" fill="currentColor" opacity="0.85">
          {line2}
        </text>
      </g>

      {/* El wordmark real de la marca, nítido (sin filtro de tinta).
          aspect 668:211 → a 66 de ancho son ~21 de alto. */}
      <image
        href="/assets/wordmark.svg"
        x="37"
        y="55"
        width="66"
        height="21"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
