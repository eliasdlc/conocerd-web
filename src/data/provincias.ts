// ─────────────────────────────────────────────────────────────────────────────
//  Las 32 unidades de primer nivel de República Dominicana: 31 provincias y el
//  Distrito Nacional, con el punto donde va su nombre.
//
//  GENERADO POR `pnpm provincias` (scripts/hornear-provincias.mjs). No editar
//  a mano: el punto es el polo de inaccesibilidad del polígono real, no una
//  coordenada puesta a ojo.
//
//  Fuente: Oficina Nacional de Estadística, vía geoBoundaries (gbHumanitarian
//  DOM ADM2, datos de 2017), licencia CC BY 3.0 IGO. La atribución es
//  obligatoria y vive en el pie del sitio.
//
//  Aquí no hay geometría de límites: ésa la dibuja `boundary_state` del propio
//  estilo de Carto, que a este zoom ya son las provincias dominicanas
//  (lib/mapaLigero · pintarProvincias).
//
//  Orden: de mayor a menor superficie. El índice es la prioridad cuando dos
//  nombres se pisan, que es lo que descongestiona el Cibao sin una escalera de
//  zoom escrita a mano.
// ─────────────────────────────────────────────────────────────────────────────

export interface Provincia {
  readonly nombre: string;
  readonly punto: readonly [number, number];
}

export const PROVINCIAS: readonly Provincia[] = [
  { nombre: "San Juan", punto: [-71.2744, 18.8714] },
  { nombre: "La Altagracia", punto: [-68.6381, 18.5883] },
  { nombre: "Santiago", punto: [-71.0085, 19.2589] },
  { nombre: "Azua", punto: [-70.8587, 18.6377] },
  { nombre: "Monte Plata", punto: [-69.7268, 18.8341] },
  { nombre: "La Vega", punto: [-70.6934, 19.0193] },
  { nombre: "Pedernales", punto: [-71.5668, 18.0593] },
  { nombre: "Monte Cristi", punto: [-71.3915, 19.7071] },
  { nombre: "Puerto Plata", punto: [-70.8908, 19.781] },
  { nombre: "El Seibo", punto: [-69.0574, 18.7874] },
  { nombre: "Independencia", punto: [-71.5191, 18.3196] },
  { nombre: "Barahona", punto: [-71.2423, 18.1254] },
  { nombre: "Duarte", punto: [-70.2152, 19.2892] },
  { nombre: "Elías Piña", punto: [-71.5397, 19.1748] },
  { nombre: "Hato Mayor", punto: [-69.3242, 18.7368] },
  { nombre: "Santo Domingo", punto: [-69.9072, 18.6074] },
  { nombre: "Baoruco", punto: [-71.2324, 18.5071] },
  { nombre: "San Pedro de Macorís", punto: [-69.48, 18.562] },
  { nombre: "San Cristóbal", punto: [-70.2563, 18.6308] },
  { nombre: "María Trinidad Sánchez", punto: [-70.0072, 19.5127] },
  { nombre: "Sánchez Ramírez", punto: [-70.1544, 19.0173] },
  { nombre: "Santiago Rodríguez", punto: [-71.335, 19.4244] },
  { nombre: "Dajabón", punto: [-71.5766, 19.4885] },
  { nombre: "Monseñor Nouel", punto: [-70.4349, 18.8948] },
  { nombre: "Samaná", punto: [-69.4179, 19.2548] },
  { nombre: "San José de Ocoa", punto: [-70.4934, 18.6213] },
  { nombre: "Espaillat", punto: [-70.5097, 19.4333] },
  { nombre: "Valverde", punto: [-71.0518, 19.5912] },
  { nombre: "Peravia", punto: [-70.3812, 18.3397] },
  { nombre: "La Romana", punto: [-68.9616, 18.5045] },
  { nombre: "Hermanas Mirabal", punto: [-70.3587, 19.4514] },
  { nombre: "Distrito Nacional", punto: [-69.9357, 18.4809] },
];
