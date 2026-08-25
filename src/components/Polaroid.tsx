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
 *  `crd-tape` le pega la cinta adhesiva del ::before: la polaroid deja de ser
 *  una card blanca con foto y pasa a ser una foto pegada al papel.
 *
 *  El radio 6 (y el 3 de la foto) es el artefacto y NO entra en la escala de
 *  radios del sistema: una polaroid a radio 22 deja de ser una polaroid y pasa
 *  a ser una card. El papel es `#FFFDF7` literal, papel fotográfico, no la
 *  superficie `paper` del tema. Una sola sombra, e1.
 *
 *  Sin `relative` aquí: la pila de Destinos añade su propio `absolute` y las
 *  dos utilidades escriben la misma propiedad, así que gana la que Tailwind
 *  emita después —no la que se escriba después en el className— y las cartas
 *  se salían del posicionamiento. Cada consumidor declara su posición; lo que
 *  el papel garantiza es que haya una (la cinta se ancla a ella).*/
export const POLAROID_PAPER =
  "crd-tape rounded-[6px] border border-line bg-[#FFFDF7] px-3 pb-0 pt-3 shadow-e1";

export function PolaroidMedia({
  image,
  alt,
  sizes,
  icon,
  chip,
  action,
  className = "",
  overlayClassName = "",
}: {
  image: string;
  alt: string;
  sizes: string;
  icon: IconName;
  /** La pila de Destinos puede no traer tagline para una carta. */
  chip?: string;
  /** Affordance opcional en la esquina opuesta al chip (p. ej. "ver más →"). */
  action?: React.ReactNode;
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
      {/* Sobre la foto sólo el chip y la flecha, los dos en cristal. El velo
          murió con el rediseño: el chip de cristal ya se separa de la imagen
          por sí solo, y el velo oscurecía la foto sin que nada lo necesitara.
          La descripción vive en el papel, nunca sobre la foto. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 px-2.5 pb-2.5 ${overlayClassName}`}
      >
        <CategoryChip icon={icon}>{chip}</CategoryChip>
        {action}
      </div>
    </div>
  );
}

/** El pie va en la tinta literal `#0F1A2E` y no en `text-ink`: la polaroid es
 *  una sola pieza en las tres plataformas y el papel fotográfico es literal,
 *  así que el texto que se apoya en él también se mide una vez y vale para
 *  todas. Sobre el papel rinde 17.39:1.
 *
 *  El nombre deja la manuscrita: Caveat baja a un solo uso en todo el producto,
 *  la firma del dorso de la polaroid del equipo. Aquí manda el titular. */
export function PolaroidCaption({ name, meta }: { name: string; meta?: string }) {
  return (
    <>
      <div className="font-display text-lg font-bold leading-tight tracking-[-.02em] text-[#0F1A2E]">
        {name}
      </div>
      <div className="mt-[3px] text-[11.5px] text-muted">{meta}</div>
    </>
  );
}
