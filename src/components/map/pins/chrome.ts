// ADN visual compartido de todo lo que se clava en el mapa.
//
// Las escenas de Negocios, Equipo y Destinos dibujaban sus propios círculos con
// un halo del mismo tono del relleno. Sobre la cartografía clara ese halo se
// leía como neón y, escena a escena, el mapa parecía de tres proyectos
// distintos. Aquí vive el tratamiento único.
//
// El borde crema al 95 % murió con el rediseño: contra el suelo del mapa rendía
// 1.09:1 y no separaba nada. Lo que da canto al pin de día es un anillo
// INTERIOR en la tinta del propio relleno (ver CategoryPin), y lo que lo
// despega del papel es esta sombra, que nunca se tiñe del color del pin.

/** Sombra de contacto: neutra, nunca del color del relleno. */
export const PIN_SHADOW = "0 3px 7px rgba(0,0,0,.30)";

/** Clases Tailwind equivalentes, para los pines que se escriben inline. */
export const PIN_CHROME = "shadow-[0_3px_7px_rgba(0,0,0,.30)]";
