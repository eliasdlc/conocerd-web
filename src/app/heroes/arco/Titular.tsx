import s from "./estilos.module.css";

const TEXTO_ACCESIBLE = "Todo esto está aquí abajo.";

/**
 * El titular, sobre la curvatura del planeta.
 *
 * Es un SVG cuadrado del tamaño del globo más un margen (`--aro`), centrado en
 * el centro del globo y desplazado con él. El texto corre por un arco de
 * radio 500 en un viewBox de 1000: como el SVG mide `2·aro` en pantalla, el
 * cuerpo del texto escala con el globo (unos 60px en escritorio, 28 en un
 * teléfono) y el arco coincide con el limbo en cualquier viewport.
 *
 * El h1 lleva el texto en un span sólo para lectores de pantalla y el SVG va
 * oculto al árbol de accesibilidad: lo que se ve y lo que se lee es lo mismo.
 */
export default function Titular() {
  return (
    <h1 className={s.titular}>
      <span className="sr-only">{TEXTO_ACCESIBLE}</span>
      <svg viewBox="0 0 1000 1000" className={s.aro} aria-hidden="true">
        <defs>
          {/* De izquierda a derecha pasando por arriba: el texto se lee en su
              sentido natural, coronando el planeta. */}
          <path id="arco-titular" d="M 0 500 A 500 500 0 0 1 1000 500" fill="none" />
        </defs>
        <text className={s.aroTexto}>
          <textPath href="#arco-titular" startOffset="50%" textAnchor="middle">
            Todo esto está <tspan className={s.aroAcento}>aquí abajo</tspan>.
          </textPath>
        </text>
      </svg>
    </h1>
  );
}
