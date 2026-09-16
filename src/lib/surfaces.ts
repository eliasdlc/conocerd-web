// Superficies flotantes sobre el mapa. El mismo concepto estaba escrito de tres
// formas distintas entre escenas consecutivas (20px cream/92, 22px white/96 y
// 16px cream/88) con tres radios y tres fondos, y ninguna de las tres era la
// receta del sistema.
//
// Son dos variantes de verdad, no una:
//
//  - GLASS: cristal líquido, el mismo material del panel de pasos y de la
//    píldora del nav. Es el panel por defecto sobre el mapa. La crema al 84 %
//    del cristal del tema tapaba el mapa en vez de dejarlo pasar; aquí el
//    cuerpo lo pone la óptica (blur largo, saturación y realce de brillo) y el
//    texto ink encima sigue por encima de 9:1 con la ladera más oscura debajo.
//  - SOLID: opaco. Obligatorio cuando hay texto largo sobre la toponimia: con
//    fondo translúcido, las etiquetas de ciudad se leen a través del texto.
//    No revertir a glass.
//
// Una sola sombra por superficie (e1). El radio lo pone `rounded-surface`.

/** Panel de cristal sobre el mapa: poco texto, mucha materia. El material
 *  entero (fondo, canto, sombra) viene de la clase; aquí no va ni un color. */
export const PANEL_GLASS = "crd-cristal-liquido border";

/** Panel opaco: obligatorio cuando hay texto largo sobre la toponimia del mapa. */
export const PANEL_SOLID = "border border-line bg-paper";
