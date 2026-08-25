// Superficies flotantes sobre el mapa. El mismo concepto estaba escrito de tres
// formas distintas entre escenas consecutivas —20px cream/92, 22px white/96 y
// 16px cream/88— con tres radios y tres fondos, y ninguna de las tres era la
// receta del sistema.
//
// Son dos variantes de verdad, no una:
//
//  - GLASS: el cristal del tema. Crema al 84 % con blur 24 y saturación 1.8,
//    hairline de cristal. Es el panel por defecto sobre el mapa. Puede bajar
//    del 92 al 84 sin perder nada porque el texto ink encima, con lo más
//    oscuro del mapa debajo, sigue dando 14.89:1.
//  - SOLID: opaco. Obligatorio cuando hay texto largo sobre la toponimia: con
//    fondo translúcido, las etiquetas de ciudad se leen a través del texto.
//    No revertir a glass.
//
// Una sola sombra por superficie (e1). El radio lo pone `rounded-surface`.

/** Panel de cristal sobre el mapa: poco texto, mucha materia. */
export const PANEL_GLASS =
  "border border-[var(--crd-glass-line)] bg-[var(--crd-glass)] backdrop-blur-[24px] backdrop-saturate-[1.8]";

/** Panel opaco: obligatorio cuando hay texto largo sobre la toponimia del mapa. */
export const PANEL_SOLID = "border border-line bg-paper";
