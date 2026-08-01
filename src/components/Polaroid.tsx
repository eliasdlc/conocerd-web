// Piezas compartidas de la polaroid. El sitio la dibuja en dos escenas —la pila
// apilada de Destinos y el deck deslizable del finale— y estaban duplicadas
// carácter por carácter, ya con drift real entre copias (audit 4.2).
//
// Se comparte lo que es la polaroid en sí: el papel, el recorte de la foto, el
// velo inferior y el pie manuscrito. NO se comparte el contenedor: la pila usa
// <figure> con transform, z-index y entrada escalonada por carta; el deck usa
// <div> dentro de una fila que hace scroll. Forzar un solo componente para
// ambos obligaría a pasar media docena de props de layout.

import Image from "next/image";
import CategoryChip from "@/components/CategoryChip";
import type { IconName } from "@/components/Icon";

/** Papel de la polaroid: fondo, márgenes desiguales (más aire abajo) y sombra.
 *  `crd-tape` le pega la cinta adhesiva del ::before (audit §3, movimiento 5):
 *  la polaroid deja de ser una card blanca con foto y pasa a ser una foto
 *  pegada al papel.
 *
 *  Sin `relative` aquí: la pila de Destinos añade su propio `absolute` y las
 *  dos utilidades escriben la misma propiedad, así que gana la que Tailwind
 *  emita después —no la que se escriba después en el className— y las cartas
 *  se salían del posicionamiento. Cada consumidor declara su posición; lo que
 *  el papel garantiza es que haya una (la cinta se ancla a ella).*/
export const POLAROID_PAPER = "crd-tape rounded-md bg-white px-3 pb-0 pt-3 shadow-panel";

export function PolaroidMedia({
  image,
  alt,
  sizes,
  icon,
  chip,
  desc,
  className = "",
  overlayClassName = "",
}: {
  image: string;
  alt: string;
  sizes: string;
  icon: IconName;
  /** La pila de Destinos puede no traer tagline para una carta. */
  chip?: string;
  desc: string;
  /** Alto del recorte: fijo en la pila, fluido en el deck. */
  className?: string;
  /** La pila sólo revela el texto de la carta del frente. */
  overlayClassName?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-[3px] bg-cream-2 ${className}`}>
      {/* Grade cálido común: las fotos vienen de fuentes distintas y cada una
          traía su propia temperatura. Un pelo de saturación, contraste y sepia
          las mete a todas en el mismo revelado (audit §3, movimiento 5). */}
      <Image
        src={image}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover [filter:saturate(1.06)_contrast(1.03)_sepia(.07)]"
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 bg-[linear-gradient(transparent,rgba(38,70,83,.55)_35%,rgba(38,70,83,.94))] px-3 pb-3 pt-3.5 ${overlayClassName}`}
      >
        <CategoryChip icon={icon}>{chip}</CategoryChip>
        <p className="m-0 text-xs leading-[1.4] text-white/92">{desc}</p>
      </div>
    </div>
  );
}

export function PolaroidCaption({ name, meta }: { name: string; meta?: string }) {
  return (
    <>
      <div className="font-hand text-2xl font-bold leading-none text-ink">{name}</div>
      <div className="mt-[3px] font-mono text-mini text-muted">{meta}</div>
    </>
  );
}
