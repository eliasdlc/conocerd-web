// ADN visual compartido de todo lo que se clava en el mapa (audit §3,
// movimiento 6).
//
// CategoryPin ya lo tenía —borde crema y sombra de contacto corta, como el pin
// del logo—, pero las escenas de Negocios, Equipo y Destinos dibujaban sus
// propios círculos con un halo de color del mismo tono del relleno. Sobre la
// cartografía clara ese halo se leía como neón y, escena a escena, el mapa
// parecía de tres proyectos distintos. Aquí vive el tratamiento único.

/** Borde crema del pin: lo despega de la cartografía sin taparla. */
export const PIN_BORDER = "2px solid rgba(253,248,240,.95)";

/** Sombra de contacto: corta y neutra, nunca del color del relleno. */
export const PIN_SHADOW = "0 2px 5px rgba(0,0,0,.28)";

/** Clases Tailwind equivalentes, para los pines que se escriben inline. */
export const PIN_CHROME = "border-2 border-cream/95 shadow-[0_2px_5px_rgba(0,0,0,.28)]";
