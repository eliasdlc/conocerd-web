import e from "../_espacio/espacio.module.css";
import s from "./estilos.module.css";

const TEXTO = "Hecha por gente de aquí.";

/**
 * La línea sobre la curvatura del planeta.
 *
 * Un SVG cuadrado del tamaño del globo más un margen (`--aro`), centrado en el
 * centro del globo y desplazado con él. El texto corre por un arco de radio
 * 500 en un viewBox de 1000: como el SVG mide `2·aro` en pantalla, el cuerpo
 * escala con el globo (unos 46px en escritorio, 22 en un teléfono) y el arco
 * coincide con el limbo en cualquier viewport.
 */
export default function Titular() {
  return (
    <p className={s.corona} aria-label={TEXTO}>
      <svg viewBox="0 0 1000 1000" className={`${e.entra} ${s.aro}`} aria-hidden="true" style={{ animationDelay: "600ms" }}>
        <defs>
          {/* De izquierda a derecha pasando por arriba: se lee en su sentido. */}
          <path id="corona-arco" d="M 0 500 A 500 500 0 0 1 1000 500" fill="none" />
        </defs>
        <text className={s.aroTexto}>
          <textPath href="#corona-arco" startOffset="50%" textAnchor="middle">
            Hecha por <tspan className={s.aroAcento}>gente de aquí</tspan>.
          </textPath>
        </text>
      </svg>
    </p>
  );
}
