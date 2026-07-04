"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import CategoryChip from "@/components/CategoryChip";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CATEGORY_META, type Destination } from "@/data/destinations";

// ─────────────────────────────────────────────────────────────────────────────
//  PolaroidDeck (#7) — UNA sola pila que se construye con el scroll y luego se
//  vuelve interactiva EN SU SITIO. Antes había dos componentes (la pila que
//  aparecía al scrollear y un deck que la reemplazaba en el finale) ⇒ el "swap"
//  que se sentía raro. Ahora es la misma pila: las cartas llegan una a una
//  (visibleCount), quedan apiladas algo desordenadas y, al completarse, la de
//  enfrente se puede tocar para ciclar entre ellas.
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = 230;

// Dispersión por profundidad (pila "algo desordenada"). depth 0 = enfrente.
const SCATTER = [
  { x: 0, y: 0, r: -3 },
  { x: 22, y: -10, r: 3 },
  { x: -16, y: -16, r: -5 },
  { x: 28, y: -8, r: 5 },
  { x: -8, y: -22, r: 1.5 },
  { x: 14, y: -18, r: -2 },
];

function PolaroidCard({ d, showActivities }: { d: Destination; showActivities?: boolean }) {
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
          height: 200,
          borderRadius: 3,
          overflow: "hidden",
          background: "#F5EFE2",
        }}
      >
        <Image src={d.image} alt={d.name} fill sizes="230px" style={{ objectFit: "cover" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "14px 12px 12px",
            // Gradiente más suave (antes llegaba a rgba(38,70,83,.94), casi negro).
            background: "linear-gradient(transparent,rgba(29,58,69,.35) 40%,rgba(29,58,69,.82))",
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
      <figcaption style={{ padding: "12px 4px 14px" }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: 24, lineHeight: 1, color: "#264653" }}>
          {d.name}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#5B6B72", marginTop: 3 }}>
          {d.meta ?? d.province}
        </div>
        {/* La carta de enfrente muestra qué hacer ahí (antes se sentía vacío). */}
        {showActivities && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
            {d.activities.map((a) => (
              <span
                key={a}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: meta.ink,
                  background: `${meta.color}1A`,
                  borderRadius: 7,
                  padding: "3px 8px",
                }}
              >
                <span className="ms" style={{ fontSize: 12 }}>{meta.icon}</span>
                {a}
              </span>
            ))}
          </div>
        )}
      </figcaption>
    </div>
  );
}

export default function PolaroidDeck({
  items,
  visibleCount,
  interactive,
}: {
  items: Destination[];
  /** Cuántas cartas han "llegado" al construirse la pila con el scroll (0..N). */
  visibleCount: number;
  /** En el finale: la carta de enfrente se puede tocar para ciclar. */
  interactive: boolean;
}) {
  const mobile = useIsMobile(640);
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);

  // Al entrar al modo interactivo, siembra el orden (enfrente = última llegada).
  useEffect(() => {
    if (interactive && !manualOrder) {
      setManualOrder([...items].reverse().map((d) => d.id));
    }
  }, [interactive, items, manualOrder]);

  // ── Mobile: fila horizontal scrolleable de las cartas ya llegadas ───────────
  if (mobile) {
    const arrived = items.slice(0, visibleCount);
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "6%",
          display: "flex",
          gap: 14,
          overflowX: "auto",
          padding: "0 16px 8px",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {arrived.map((d) => (
          <div key={d.id} style={{ flex: "0 0 auto" }}>
            <PolaroidCard d={d} showActivities={interactive} />
          </div>
        ))}
      </div>
    );
  }

  // ── Desktop: pila única. Orden derivado del scroll durante la construcción;
  //    orden manual (ciclable) al volverse interactiva. ─────────────────────────
  const arrived = items.slice(0, visibleCount);
  const derived = [...arrived].reverse().map((d) => d.id); // enfrente = última llegada
  const order = interactive && manualOrder ? manualOrder : derived;
  const cycle = () =>
    setManualOrder((prev) => {
      const o = prev ?? derived;
      return [...o.slice(1), o[0]]; // manda la de enfrente al fondo
    });

  return (
    <div style={{ position: "absolute", left: "6%", bottom: "14%", width: CARD_W, height: 360 }}>
      {items.map((d) => {
        const depth = order.indexOf(d.id); // -1 = aún no ha llegado
        const arrivedCard = depth !== -1;
        const isFront = depth === 0;
        const s = SCATTER[Math.min(depth, SCATTER.length - 1)] ?? { x: 0, y: 0, r: 0 };
        return (
          <motion.div
            key={d.id}
            onClick={isFront && interactive ? cycle : undefined}
            initial={false}
            animate={
              arrivedCard
                ? { x: s.x, y: s.y, rotate: s.r, scale: 1 - depth * 0.04, opacity: depth > 4 ? 0.6 : 1, zIndex: 10 - depth }
                : { x: 0, y: -90, rotate: -3, scale: 0.9, opacity: 0, zIndex: 0 }
            }
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transformOrigin: "bottom center",
              cursor: isFront && interactive ? "pointer" : "default",
            }}
            whileHover={isFront && interactive ? { y: s.y - 16, scale: 1.03 } : undefined}
          >
            <PolaroidCard d={d} showActivities={isFront && interactive} />
            {isFront && interactive && (
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "rgba(29,58,69,0.82)",
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
                Toca para ver más →
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
