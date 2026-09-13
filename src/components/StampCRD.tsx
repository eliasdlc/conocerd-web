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
//  Revisión ago 2026 — "más viva". El cuño era monocromo y su única jerarquía
//  eran dos líneas de texto diminuto que nadie leía. Ahora:
//   · habla los tres colores del logo (coral/mint de tinta, mango, mint),
//   · un amanecer de rayos nace detrás del wordmark,
//   · el pin de marca corona, flanqueado por la palma y la flor del logo,
//   · y la línea principal vive en una cinta de banner, en negativo: es lo
//     único que se lee de un vistazo, y por eso se lleva el contraste.
//
//  El reparto vertical es un compromiso medido: los dos textos en arco ocupan
//  las bandas r45–51.5 (arriba) y r37–43.5 (abajo), así que TODO lo demás cabe
//  en un disco de radio ~37 alrededor del centro. Mover cualquier pieza sin
//  respetar ese disco hace que el arco de abajo se solape con la línea de pie.
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
  /** Segundo color: rayos y pin de la corona. Mango de marca por defecto. */
  accent?: string;
  /** Tercer color: palma y flor. Mint de marca por defecto. */
  accent2?: string;
  /** Texto de la cinta central, en negativo (p. ej. "RUTA GUARDADA"). */
  line1?: string;
  /** Línea de pie bajo la cinta (p. ej. "· EST. 2026 ·"). Corta: el hueco es poco. */
  line2?: string;
  className?: string;
  /** Texto accesible; por defecto decorativa (aria-hidden). */
  label?: string;
}

/** Papel del sticker. También es el color del texto en negativo de la cinta. */
const PAPER = "#FFFDF6";

// El cuño es lettering de etiqueta: mayúsculas con tracking, nunca titular.
// El mono con el que se dibujaba salió del sistema con el rediseño.
const LABEL = "var(--font-jakarta), system-ui, sans-serif";

/** Amanecer detrás del wordmark: 14 rayos = 14 huecos, sin costura visible. */
const RAYS = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);

export default function StampCRD({
  size = 112,
  rotate = -8,
  color = "#B23410",
  accent = "#FF8D16",
  accent2 = "#25CCB8",
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
  const paper = `${uid}-paper`;

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
        {/* El papel no es plano: se calienta un punto hacia el borde. */}
        <radialGradient id={paper} cx="40%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="58%" stopColor={PAPER} />
          <stop offset="100%" stopColor="#FBF2E1" />
        </radialGradient>
        <path id={topArc} d="M 25 70 A 45 45 0 0 1 115 70" fill="none" />
        <path id={bottomArc} d="M 26.5 70 A 43.5 43.5 0 0 0 113.5 70" fill="none" />
      </defs>

      {/* Base de papel: círculo + puntos gordos en el borde = troquel
          festoneado. El fondo nunca es transparente. El patrón del dash está
          calculado para cerrar en 42 puntos exactos (2π·62 / 9.275) y no
          dejar una costura en el ángulo cero. */}
      <g filter={`url(#${drop})`}>
        <circle cx="70" cy="70" r="62" fill={`url(#${paper})`} />
        <circle
          cx="70"
          cy="70"
          r="62"
          fill="none"
          stroke="#FEFAEF"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="0.1 9.175"
        />
      </g>

      {/* Amanecer. Los rayos terminan en punta dentro del disco central (r≈39.5,
          justo por dentro de las bandas de los arcos), así que no hace falta
          recortarlos: un clip circular dejaba un canto duro que se leía como
          engranaje. Sin filtro de tinta: desplazarlos sólo los emborrona. */}
      <g opacity="0.15">
        {RAYS.map((deg) => (
          <path key={deg} d="M 70 70 L 64 31 L 76 31 Z" fill={accent} transform={`rotate(${deg} 70 70)`} />
        ))}
      </g>

      {/* El cuño entintado (todo en currentColor, con la tinta imperfecta) */}
      <g filter={`url(#${ink})`} opacity="0.92">
        {/* Doble anillo del cuño, con un dentado de perforación en medio */}
        <circle cx="70" cy="70" r="57" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="70" cy="70" r="52.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <circle
          cx="70"
          cy="70"
          r="54.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="0.1 4.3"
          opacity="0.5"
        />

        {/* Arco superior: el país */}
        <text fontFamily={LABEL} fontSize="9" fontWeight="700" letterSpacing="1.5" fill="currentColor">
          <textPath href={`#${topArc}`} startOffset="50%" textAnchor="middle">
            REPÚBLICA DOMINICANA
          </textPath>
        </text>
        {/* Arco inferior: el lema */}
        <text fontFamily={LABEL} fontSize="6.4" fontWeight="700" letterSpacing="1.1" fill="currentColor" opacity="0.9">
          <textPath href={`#${bottomArc}`} startOffset="50%" textAnchor="middle">
            ✶ DESCUBRE LO NUESTRO ✶
          </textPath>
        </text>
        {/* Estrellas laterales, como en los cuños de pasaporte */}
        <text x="19.5" y="73.5" textAnchor="middle" fontSize="8" fill="currentColor">✶</text>
        <text x="120.5" y="73.5" textAnchor="middle" fontSize="8" fill="currentColor">✶</text>
      </g>

      {/* Corona: el pin de la marca en mango, flanqueado por la palma y la flor
          del logo. Mismo filtro de tinta: pertenecen al cuño, no al papel. */}
      <g filter={`url(#${ink})`}>
        <g transform="translate(70 42) scale(0.82)">
          <path
            d="M0 -9.5c-3.7 0-6.7 3-6.7 6.7 0 5 6.7 12.3 6.7 12.3s6.7-7.3 6.7-12.3c0-3.7-3-6.7-6.7-6.7z"
            fill={accent}
          />
          <circle cx="0" cy="-2.6" r="2.5" fill={PAPER} />
        </g>

        {/* Palma: tronco curvo y cinco frondas en abanico desde la copa. */}
        <g transform="translate(49 42) scale(0.6)" fill={accent2}>
          <path d="M-1.6 12Q-.9 5.4.3.2L2.9.9Q1.5 5.6 1.2 12Z" />
          {[-174, -137, -100, -63, -26].map((deg) => (
            <path key={deg} d="M0 0Q5.2-5.6 11.8-4.2Q5.4-1.7 0 .6Z" transform={`rotate(${deg})`} />
          ))}
        </g>

        {/* Flor: cinco pétalos y el corazón en tinta. */}
        <g transform="translate(91 43)">
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx="0" cy="-4.6" rx="2.8" ry="3.9" fill={accent2} transform={`rotate(${deg})`} />
          ))}
          <circle cx="0" cy="0" r="1.9" fill={color} />
        </g>
      </g>

      {/* El wordmark real de la marca, nítido (sin filtro de tinta).
          aspect 668:211 → a 60 de ancho son ~19 de alto. */}
      <image
        href="/assets/wordmark.svg"
        x="40"
        y="53"
        width="60"
        height="19"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Cinta de banner. El texto va fuera del filtro de tinta: en negativo y a
          este cuerpo, el desplazamiento se lo comería. */}
      <g filter={`url(#${ink})`}>
        <path d="M30 76 H110 L104.5 82 L110 88 H30 L35.5 82 Z" fill="currentColor" />
        <path d="M30 76 L35.5 82 L30 88 Z" fill="currentColor" opacity="0.5" />
        <path d="M110 76 L104.5 82 L110 88 Z" fill="currentColor" opacity="0.5" />
      </g>
      <text
        x="70"
        y="84.4"
        textAnchor="middle"
        fontFamily={LABEL}
        fontSize="6.6"
        fontWeight="700"
        letterSpacing="0.8"
        fill={PAPER}
      >
        {line1}
      </text>

      {line2 ? (
        <text
          x="70"
          y="95.5"
          textAnchor="middle"
          fontFamily={LABEL}
          fontSize="5"
          fontWeight="700"
          letterSpacing="0.7"
          fill="currentColor"
          opacity="0.78"
        >
          {line2}
        </text>
      ) : null}
    </svg>
  );
}
