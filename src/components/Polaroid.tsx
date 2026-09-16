// Las piezas de la polaroid: el papel, el recorte de la foto y el pie. Su único
// consumidor es el par de Destinos, que las dibuja en las seis escenas de
// destino y en el finale. Nacieron aquí porque estaban duplicadas carácter por
// carácter entre dos escenas, ya con drift real entre copias (audit 4.2).
//
// NO se comparte el contenedor. El par declara su propio <figure> con transform
// y z-index, porque la posición de cada carta sale del puesto que le toca en la
// mesa y eso no cabe en una prop.

import Image from "next/image";
import CategoryChip from "@/components/CategoryChip";
import Icon, { type IconName } from "@/components/Icon";
import { cieloDeWMO, grados } from "@/lib/clima/etiquetas";

/** Papel de la polaroid, con la geometría de una Polaroid 600 de verdad.
 *
 *  La carta mide 3,483 x 4,233 pulgadas y su ventana 3,108 x 3,024: de ahí
 *  salen los tres números que la hacen reconocible de lejos y que aquí son
 *  proporciones y no píxeles, para que valga a cualquier ancho.
 *
 *    carta      1 : 1,215
 *    márgenes   5,4 % del ancho arriba y a los lados
 *    papel      29 % del ancho abajo, que es lo que sobra de la cuenta
 *
 *  Antes el alto de la ventana estaba fijado en píxeles y el texto empujaba la
 *  carta hacia abajo: la proporción salía 1 : 1,55 y la polaroid se leía como
 *  una card blanca con una foto encima.
 *
 *  `crd-tape` le pega la cinta adhesiva del ::before, una por carta. La cinta
 *  larga cruzando las dos cartas del par quedó descartada el 15 sep 2026; el
 *  porqué vive en el bloque de `.crd-tape`, que es donde está la pieza.
 *
 *  El radio 6 (y el 3 de la foto) es el artefacto y NO entra en la escala de
 *  radios del sistema: una polaroid a radio 22 deja de ser una polaroid y pasa
 *  a ser una card. El papel es `#FFFDF7` literal, papel fotográfico, no la
 *  superficie `paper` del tema. Una sola sombra, e1.
 *
 *  Sin `relative` aquí: el par de Destinos añade su propio `absolute` y las
 *  dos utilidades escriben la misma propiedad, así que gana la que Tailwind
 *  emita después, no la que se escriba después en el className, y las cartas
 *  se salían del posicionamiento. Cada consumidor declara su posición; lo que
 *  el papel garantiza es que haya una (la cinta se ancla a ella).*/
export const POLAROID_PAPER =
  "crd-tape @container flex flex-col aspect-[1/1.215] rounded-[6px] border border-line bg-[#FFFDF7] px-[5.4%] pb-0 pt-[5.4%] shadow-e1";

export function PolaroidMedia({
  image,
  alt,
  sizes,
  icon,
  chip,
}: {
  image: string;
  alt: string;
  sizes: string;
  icon: IconName;
  /** El par de Destinos puede no traer tagline para una carta. */
  chip?: string;
}) {
  return (
    // `aspect` y no alto: la ventana manda sobre la foto, que entra recortada
    // desde el centro. Era al revés, y por eso cada foto decidía la forma de
    // su carta.
    <div className="relative aspect-[1.028/1] w-full flex-none overflow-hidden rounded-[3px] bg-cream-2">
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
      {/* Sobre la foto sólo el chip, en cristal. El velo murió con el rediseño:
          el chip de cristal ya se separa de la imagen por sí solo, y el velo
          oscurecía la foto sin que nada lo necesitara. La descripción vive en
          el papel, nunca sobre la foto. */}
      <div className="absolute inset-x-0 bottom-0 flex items-end px-2.5 pb-2.5">
        <CategoryChip icon={icon}>{chip}</CategoryChip>
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
      <div className="font-display text-[7cqw] font-bold leading-tight tracking-[-.02em] text-[#0F1A2E]">
        {name}
      </div>
      <div className="mt-[1.2cqw] text-[4.6cqw] leading-tight text-muted">{meta}</div>
    </>
  );
}

/** El clima de ahora mismo en ese lugar, bajo el pie.
 *
 *  Todo el pie mide en `cqw`, o sea en porcentaje del ancho de la CARTA, y no
 *  en píxeles. El papel de abajo es el 29 % de ese ancho: 71 px en escritorio
 *  pero 57 en el teléfono, y con tamaños fijos el chip se salía del papel en la
 *  carta pequeña. Midiendo en cqw el pie encoge con la carta y la proporción de
 *  la 600 se sostiene en los dos.
 * Tinte mint con el cielo
 *  abierto y azul con el cielo cubierto o mojado; el glifo y la palabra llevan
 *  el significado, el color sólo acompaña. El azul es un par de tinte propio
 *  del tiempo, no un rol del tema: no hay nada más en el sitio que lo use. */
export function PolaroidVivo({ temp, codigo }: { temp: number; codigo: number }) {
  const cielo = cieloDeWMO(codigo);
  const tono =
    cielo.tono === "calido" ? "bg-mint-soft text-mint-ink" : "bg-[#E4ECF7] text-[#2B4C7E]";
  return (
    <span
      className={`mt-[2cqw] inline-flex items-center gap-[1cqw] rounded-full px-[3.2cqw] py-[1.4cqw] font-label text-[4.3cqw] font-bold leading-none ${tono}`}
    >
      <Icon name={cielo.icono} className="text-[5cqw]" />
      Ahora {grados(temp)}, {cielo.etiqueta}
    </span>
  );
}
