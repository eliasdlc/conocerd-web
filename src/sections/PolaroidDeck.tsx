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

const CARD_W = "clamp(220px,18vw,300px)";

function PolaroidCard({ d }: { d: Destination }) {
  const meta = CATEGORY_META[d.category];
  return (
    <div
      style={{
        width: CARD_W,
        background: "#fff",
        padding: "12px 12px 0",
        borderRadius: 6,
        boxShadow: "0 14px 34px rgba(38,70,83,.24)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "clamp(190px,15vw,240px)",
          borderRadius: 3,
          overflow: "hidden",
          background: "#F5EFE2",
        }}
      >
        <Image
          src={d.image}
          alt={d.name}
          fill
          sizes="(max-width: 640px) 220px, (max-width: 1440px) 18vw, 300px"
          style={{ objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "14px 12px 12px",
            background: "linear-gradient(transparent,rgba(38,70,83,.55) 35%,rgba(38,70,83,.94))",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <CategoryChip icon={meta.icon}>{d.tagline ?? meta.label}</CategoryChip>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.92)", lineHeight: 1.4 }}>
            {d.desc}
          </p>
        </div>
      </div>
      <div style={{ padding: "12px 4px 14px" }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 24, lineHeight: 1, color: "#264653" }}>
          {d.name}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5B6B72", marginTop: 3 }}>
          {d.meta ?? d.province}
        </div>
      </div>
    </div>
  );
}

export default function PolaroidDeck({ items }: { items: Destination[] }) {
  const mobile = useIsMobile(640);
  const reduceMotion = useReducedMotion();
  // `order` = ids en orden de profundidad; order[0] = carta de enfrente.
  const [order, setOrder] = useState<string[]>(() => items.map((d) => d.id));

  // ── Mobile: fila horizontal scrolleable ────────────────────────────────────
  if (mobile) {
    return (
      <div
        className="crd-polaroid-deck-mobile"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "4%",
          display: "flex",
          gap: 14,
          overflowX: "auto",
          padding: "0 16px 8px",
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {items.map((d) => (
          <div key={d.id} style={{ flex: "0 0 auto" }}>
            <PolaroidCard d={d} />
          </div>
        ))}
      </div>
    );
  }

  // ── Desktop: deck apilado, click cicla la carta de enfrente al fondo ────────
  const cycle = () => setOrder((prev) => [...prev.slice(1), prev[0]]);

  return (
    <div
      className="crd-polaroid-deck"
      style={{
        position: "absolute",
        left: "6%",
        bottom: "12%",
        width: CARD_W,
        height: 320,
      }}
    >
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
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              cursor: isFront ? "pointer" : "default",
              transformOrigin: "bottom center",
              appearance: "none",
              border: 0,
              padding: 0,
              background: "transparent",
              color: "inherit",
              textAlign: "left",
            }}
            whileHover={isFront && !reduceMotion ? { y: -18, scale: 1.02 } : undefined}
          >
            <PolaroidCard d={d} />
            {isFront && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "rgba(38,70,83,0.82)",
                  color: "#fff",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: ".06em",
                  padding: "4px 8px",
                  borderRadius: 999,
                  pointerEvents: "none",
                }}
              >
                Click para ver más →
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
