import { DESTINATIONS, type Destination } from "@/data/destinations";

// ─── Las piezas del mosaico ───────────────────────────────────────────────────
// Destinos reales de la fuente de verdad (@/data/destinations). El orden es el
// del DOM: en desktop cada pieza recibe su celda por `nth-child` desde el CSS
// Module; en móvil ese mismo orden es el del carrusel, así que la primera es la
// que se ve completa al cargar.

type Pieza = Destination & {
  /** Fracción de viewport que ocupa la foto en cada breakpoint (next/image). */
  sizes: string;
};

const ORDEN = [
  // La ancha de arriba: la foto insignia, y el elemento LCP en ambos anchos.
  { id: "aguilas", sizes: "(max-width: 899px) 68vw, 50vw" },
  { id: "zona-colonial", sizes: "(max-width: 899px) 68vw, 18vw" },
  { id: "constanza", sizes: "(max-width: 899px) 68vw, 18vw" },
  { id: "duarte", sizes: "(max-width: 899px) 68vw, 34vw" },
  { id: "haitises", sizes: "(max-width: 899px) 68vw, 18vw" },
  { id: "santiago", sizes: "(max-width: 899px) 68vw, 18vw" },
] as const;

export const PIEZAS: Pieza[] = ORDEN.map(({ id, sizes }) => {
  const destino = DESTINATIONS.find((d) => d.id === id);
  if (!destino) throw new Error(`Destino inexistente en el mosaico: ${id}`);
  return { ...destino, sizes };
});

/** Cifras del kicker: se derivan del dato real para no prometer de más. */
export const TOTAL_LUGARES = DESTINATIONS.length;
export const TOTAL_PROVINCIAS = new Set(DESTINATIONS.map((d) => d.province)).size;
