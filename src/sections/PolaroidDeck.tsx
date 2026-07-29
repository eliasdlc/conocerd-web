"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import CategoryChip from "@/components/CategoryChip";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CATEGORY_META, type Destination } from "@/data/destinations";

// ─────────────────────────────────────────────────────────────────────────────
//  PolaroidDeck (#7) — la pila de polaroids se vuelve un deck interactivo.
//  Desktop: click en la carta de enfrente → se va hacia atrás y las demás
//  avanzan, cicla. Mobile: degrada a fila horizontal scrolleable.
// ─────────────────────────────────────────────────────────────────────────────

// El ancho de carta se comparte entre la carta y el contenedor del deck, así que
// vive como constante y no como utilidad repetida.
const CARD_W = "w-[clamp(220px,18vw,300px)]";

function PolaroidCard({ d }: { d: Destination }) {
  const meta = CATEGORY_META[d.category];
  return (
    <div className={`${CARD_W} rounded-md bg-white px-3 pb-0 pt-3 shadow-[0_14px_34px_rgba(38,70,83,.24)]`}>
      <div className="relative h-[clamp(190px,15vw,240px)] w-full overflow-hidden rounded-[3px] bg-cream-2">
        <Image
          src={d.image}
          alt={d.name}
          fill
          sizes="(max-width: 640px) 220px, (max-width: 1440px) 18vw, 300px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 bg-[linear-gradient(transparent,rgba(38,70,83,.55)_35%,rgba(38,70,83,.94))] px-3 pb-3 pt-3.5">
          <CategoryChip icon={meta.icon}>{d.tagline ?? meta.label}</CategoryChip>
          <p className="m-0 text-xs leading-[1.4] text-white/92">{d.desc}</p>
        </div>
      </div>
      <div className="px-1 pb-3.5 pt-3">
        <div className="font-hand text-2xl font-bold leading-none text-ink">{d.name}</div>
        <div className="mt-[3px] font-mono text-[11px] text-muted">{d.meta ?? d.province}</div>
      </div>
    </div>
  );
}

export default function PolaroidDeck({ items }: { items: Destination[] }) {
  // 640 y no MOBILE_BREAKPOINT: aquí no es un ajuste de estilo, es otro
  // componente (fila scrolleable vs deck con estado y spring), así que la rama
  // sigue en JS.
  const mobile = useIsMobile(640);
  const reduceMotion = useReducedMotion();
  // `order` = ids en orden de profundidad; order[0] = carta de enfrente.
  const [order, setOrder] = useState<string[]>(() => items.map((d) => d.id));

  // ── Mobile: fila horizontal scrolleable ────────────────────────────────────
  if (mobile) {
    return (
      <div className="crd-polaroid-deck-mobile absolute inset-x-0 bottom-[4%] flex touch-pan-x gap-3.5 overflow-x-auto px-4 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none]">
        {items.map((d) => (
          <div key={d.id} className="flex-none">
            <PolaroidCard d={d} />
          </div>
        ))}
      </div>
    );
  }

  // ── Desktop: deck apilado, click cicla la carta de enfrente al fondo ────────
  const cycle = () => setOrder((prev) => [...prev.slice(1), prev[0]]);

  return (
    <div className={`crd-polaroid-deck absolute bottom-[12%] left-[6%] h-80 ${CARD_W}`}>
      {order.map((id, depth) => {
        const d = items.find((x) => x.id === id)!;
        const isFront = depth === 0;
        return (
          <motion.button
            key={id}
            type="button"
            disabled={!isFront}
            aria-hidden={!isFront}
            aria-label={isFront ? `Ver el próximo destino. Ahora: ${d.name}` : undefined}
            onClick={isFront ? cycle : undefined}
            className={`absolute left-0 top-0 origin-bottom appearance-none border-0 bg-transparent p-0 text-left text-[inherit] ${
              isFront ? "cursor-pointer" : "cursor-default"
            }`}
            initial={false}
            animate={{
              x: depth * 16,
              y: depth * -10,
              scale: 1 - depth * 0.05,
              rotate: depth * 2.5,
              zIndex: order.length - depth,
              opacity: depth > 4 ? 0.5 : 1,
            }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 30 }
            }
            whileHover={isFront && !reduceMotion ? { y: -18, scale: 1.02 } : undefined}
          >
            <PolaroidCard d={d} />
            {isFront && (
              <div className="pointer-events-none absolute right-3.5 top-3.5 rounded-full bg-ink/[0.82] px-2 py-1 font-display text-[10px] font-bold tracking-[.06em] text-white">
                Click para ver más →
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
