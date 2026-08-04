// Superficies flotantes sobre el mapa. El mismo concepto estaba escrito de tres
// formas distintas entre escenas consecutivas —20px cream/92, 22px white/96 y
// 16px cream/88— con tres radios y tres fondos (audit 4.1).
//
// Son dos variantes de verdad, no una:
//
//  - GLASS: crema translúcido con blur. Es el panel por defecto sobre el mapa.
//  - SOLID: opaco. Fase A lo hizo así a propósito en Negocios (audit 1.6): con
//    fondo translúcido, las etiquetas de ciudad del mapa se leían a través del
//    texto de la tarjeta. No revertir a glass.
//
// El radio y la elevación sí se unifican vía tokens (rounded-panel, shadow-*).

/** Panel translúcido sobre el mapa. */
export const PANEL_GLASS = "border border-line bg-cream/92 backdrop-blur-[16px]";

/** Panel opaco: obligatorio cuando hay texto largo sobre la toponimia del mapa. */
export const PANEL_SOLID = "border border-line/96 bg-white";
