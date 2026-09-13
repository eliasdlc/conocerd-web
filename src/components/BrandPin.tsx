// El pin del logo, reducido a glifo reutilizable. Lo usan la píldora del nav
// (marca en pantalla durante todo el journey), el pin de RD sobre el globo del
// hero y el 404 (el pin que se cayó del mapa). Va inline y no como <img>:
// hereda el color por prop y la ventana deja pasar el fondo de quien lo monte.
//
// La geometría se exporta porque no hay dos siluetas en el producto: el pin de
// meta (GoalPin) es este mismo pin con la ventana ocupada por el damero en vez
// de por la flor.

/** La silueta sin la ventana: anillo con cola de gota que se funde en el aro
 *  con un latigazo en S, y la punta afinada saliendo vertical. Ojo: la punta
 *  NO es simétrica, y eso es a propósito. */
export const PIN_SILHOUETTE =
  "M150 303.5C150 294 149 276.5 133.5 256C118.5 233 110 241.5 87.5 222C52.5 196 40 160 40 130C40 64 88 20 150 20C212 20 260 64 260 130C260 160 247.5 196 212.5 222C190 241.5 181.5 233 166.5 256C151 276.5 150 294 150 303.5Z";

/** El dibujo mide 240 × 300, así que `size` es el ancho y el alto sale solo. */
export const PIN_VIEWBOX = "30 10 240 300";
export const PIN_ASPECT = 300 / 240;

/** La ventana del pin: centro y radio del disco grande. */
export const PIN_WINDOW = { cx: 150, cy: 130, r: 102 } as const;

/** Las dos ventanas. Son huecos de verdad, restados de la silueta por
 *  `fill-rule="evenodd"`, y no un círculo crema pintado encima: sobre
 *  cualquier fondo que no fuera crema, el disco pintado se delataba. */
const WINDOW_LARGE = "M48 130a102 102 0 1 0 204 0a102 102 0 1 0 -204 0Z";
const WINDOW_SMALL = "M92 130a58 58 0 1 0 116 0a58 58 0 1 0 -116 0Z";

/** Los cinco pétalos de la flor de Bayahíbe, girados de 72 en 72 sobre el
 *  centro de la ventana. */
const PETAL_ROTATIONS = [0, 72, 144, 216, 288];

/** Umbral de los dos niveles: desde 28 el pin lleva la flor sobre la ventana
 *  grande; por debajo la flor se empasta, así que se va y la ventana baja a
 *  r58 para que el anillo no desaparezca. */
const FLOWER_MIN_SIZE = 28;

export default function BrandPin({
  size = 22,
  color = "#FF8D16",
  fondoVentana,
  className = "",
}: {
  /** Ancho en px. El alto es 1.25 veces esto, y decide el nivel de detalle. */
  size?: number;
  /** Tinta de la silueta y de la flor. La ventana no se pinta: es un hueco. */
  color?: string;
  /**
   * Disco pintado detrás de la flor, del radio de la ventana activa. Sin él la
   * ventana es un hueco de verdad y deja ver lo que haya debajo, que es lo que
   * quieren la píldora y el 404; sobre el globo del hero el mapa se colaba por
   * la ventana y la flor flotaba, así que ahí se pinta.
   */
  fondoVentana?: string;
  className?: string;
}) {
  const withFlower = size >= FLOWER_MIN_SIZE;
  return (
    <svg
      viewBox={PIN_VIEWBOX}
      width={size}
      height={size * PIN_ASPECT}
      className={className}
      aria-hidden="true"
    >
      {fondoVentana && (
        <circle
          cx={PIN_WINDOW.cx}
          cy={PIN_WINDOW.cy}
          r={withFlower ? PIN_WINDOW.r : 58}
          fill={fondoVentana}
        />
      )}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill={color}
        d={`${PIN_SILHOUETTE}${withFlower ? WINDOW_LARGE : WINDOW_SMALL}`}
      />
      {withFlower && (
        <g fill={color} transform={`translate(${PIN_WINDOW.cx} ${PIN_WINDOW.cy})`}>
          {PETAL_ROTATIONS.map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-41"
              rx="20"
              ry="33"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle r="14.5" />
        </g>
      )}
    </svg>
  );
}
