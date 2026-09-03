import s from "./estilos.module.css";

// ─── Anillo del medallón ─────────────────────────────────────────────────────
//
// Geometría en un viewBox fijo de 400×400: así todo (banda, filetes, dientes y
// texto curvo) escala con `--medalla` sin recalcular nada, y basta comprobar el
// tamaño más chico —el móvil— para saber que el texto sigue leyéndose.
//
// Se dibuja en DOS mitades que en reposo se solapan 1.2 unidades sobre la línea
// del diámetro. No es un capricho: al bajar, cada mitad se va por su lado, y
// una pieza entera habría que duplicarla igual para poder partirla.

const C = 200;
/** Borde exterior de la banda. */
const RO = 197;
/** Borde interior = borde del troquel. Sobre él encaja el agujero del papel. */
const RI = 161;
/** Radio de la línea base del texto curvo, arriba y abajo.
    No es el mismo a propósito: en el arco de arriba las letras crecen HACIA
    FUERA de la línea base y en el de abajo hacia dentro, así que con un único
    radio las dos frases quedaban en anillos distintos. La diferencia es una
    altura de mayúscula (~9 unidades a cuerpo 12.6). */
const RT_SUP = 173.2;
const RT_INF = 182.4;
/** Solape entre mitades: mata la costura de antialias en el diámetro. */
const SOLAPE = 0.6;

/** Semicírculo por arriba (`arriba`) o por abajo, empezando siempre a la izq. */
function semi(r: number, arriba: boolean, dy: number): string {
  const y = C + dy;
  return `M ${C - r},${y} A ${r},${r} 0 0 ${arriba ? 1 : 0} ${C + r},${y}`;
}

/** Media corona (la banda rellena) a un lado del diámetro. */
function corona(arriba: boolean): string {
  const dy = arriba ? SOLAPE : -SOLAPE;
  const y = C + dy;
  return `${semi(RO, arriba, dy)} L ${C + RI},${y} A ${RI},${RI} 0 0 ${
    arriba ? 0 : 1
  } ${C - RI},${y} Z`;
}

/** Filetes, canto moleteado y borde interior de una mitad. */
function Grabados({ arriba }: { arriba: boolean }) {
  const dy = arriba ? SOLAPE : -SOLAPE;
  return (
    <g fill="none" stroke="currentColor">
      {/* Canto moleteado, como el de una moneda. */}
      <path d={semi(194.4, arriba, dy)} strokeWidth="2.6" strokeDasharray="1.1 4.8" opacity="0.3" />
      {/* Filete doble exterior. */}
      <path d={semi(190.4, arriba, dy)} strokeWidth="1.6" opacity="0.52" />
      <path d={semi(186.6, arriba, dy)} strokeWidth="0.7" opacity="0.3" />
      {/* Filete doble interior, ya pegado al troquel. */}
      <path d={semi(166.6, arriba, dy)} strokeWidth="0.7" opacity="0.26" />
      <path d={semi(162.6, arriba, dy)} strokeWidth="1.5" opacity="0.5" />
    </g>
  );
}

/** Rombo de imprenta: cierra la línea curva de abajo por los dos lados. */
function Rombo({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M ${x},${y - 4.4} L ${x + 3.2},${y} L ${x},${y + 4.4} L ${x - 3.2},${y} Z`}
      fill="currentColor"
      opacity="0.6"
    />
  );
}

type MitadProps = {
  arriba: boolean;
  /** Prefijo de los ids del SVG: dos mitades en la misma página no pueden
      compartir id (gradiente y arco de texto). */
  uid: string;
  texto: string;
  /** Tracking del texto curvo: el arco de abajo lleva menos letras y necesita
      más aire para ocupar un trozo de circunferencia comparable. */
  tracking: number;
  className: string;
  children?: React.ReactNode;
};

function Mitad({ arriba, uid, texto, tracking, className, children }: MitadProps) {
  const papel = `${uid}-papel`;
  const arco = `${uid}-arco`;

  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      // El texto del anillo es la marca, y ya vive en el wordmark y en el pie;
      // aquí sólo sería ruido letra a letra para un lector de pantalla.
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        {/* userSpaceOnUse y no el bounding box por defecto: cada mitad tiene su
            propia caja y con coordenadas relativas la luz se reiniciaba en el
            diámetro — se veía un escalón de tono justo en la costura. */}
        <linearGradient
          id={papel}
          gradientUnits="userSpaceOnUse"
          x1="60"
          y1="10"
          x2="330"
          y2="380"
        >
          <stop offset="0" stopColor="#FFFDF7" />
          <stop offset="0.52" stopColor="#F7F1E4" />
          <stop offset="1" stopColor="#EFE7D6" />
        </linearGradient>
        <path id={arco} d={semi(arriba ? RT_SUP : RT_INF, arriba, 0)} fill="none" />
      </defs>

      <path d={corona(arriba)} fill={`url(#${papel})`} />
      <path
        d={semi(RO, arriba, arriba ? SOLAPE : -SOLAPE)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.28"
      />
      <Grabados arriba={arriba} />

      <text className={s.arcoTexto} fontSize="12.6" letterSpacing={tracking} opacity="0.92">
        <textPath href={`#${arco}`} startOffset="50%" textAnchor="middle">
          {texto}
        </textPath>
      </text>

      {children}
    </svg>
  );
}

export function MitadSuperior() {
  return (
    <Mitad
      arriba
      uid="crd-medallon-sup"
      texto="CONOCERD ✶ DESCUBRE LO NUESTRO"
      tracking={3.6}
      className={`${s.mitad} ${s.mitadSup}`}
    />
  );
}

export function MitadInferior() {
  return (
    <Mitad
      arriba={false}
      uid="crd-medallon-inf"
      texto="REPÚBLICA DOMINICANA"
      tracking={5.4}
      className={`${s.mitad} ${s.mitadInf}`}
    >
      {/* r ≈ 178, a 47° del eje vertical: justo fuera de donde acaba la frase. */}
      <Rombo x={C - 121.3} y={C + 130.1} />
      <Rombo x={C + 121.3} y={C + 130.1} />
    </Mitad>
  );
}
