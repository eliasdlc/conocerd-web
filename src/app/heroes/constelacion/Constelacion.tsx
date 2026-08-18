"use client";

import { useEffect, useMemo, useState } from "react";
import GloboHero from "../_components/GloboHero";
import CapaConstelacion from "./CapaConstelacion";
import { ConstelacionContext } from "./estado";
import Overlay from "./Overlay";
import s from "./estilos.module.css";

const MOVIL = 900;

/**
 * Escala de la constelación por ancho de pantalla. Los radios y las anclas de
 * las fichas están afinados en 1440; sin escalar, a 1000 px los hilos quedan
 * larguísimos y las fichas se salen. Se acota arriba para que en 1920 la
 * constelación no se despegue del globo.
 */
function escalaPara(ancho: number): number {
  const bruto = 0.8 + ((ancho - MOVIL) / 540) * 0.2;
  return Math.max(0.8, Math.min(1.14, bruto));
}

export default function Constelacion() {
  const [activo, setActivo] = useState<string | null>(null);
  const [medida, setMedida] = useState<{ esc: number; movil: boolean } | null>(null);

  useEffect(() => {
    const medir = () => {
      const ancho = window.innerWidth;
      const movil = ancho < MOVIL;
      setMedida((prev) => {
        const esc = movil ? 1 : escalaPara(ancho);
        if (prev && prev.movil === movil && Math.abs(prev.esc - esc) < 0.005) return prev;
        return { esc, movil };
      });
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const valor = useMemo(
    () => ({
      activo,
      setActivo,
      esc: medida?.esc ?? 1,
      movil: medida?.movil ?? false,
      medido: medida !== null,
    }),
    [activo, medida]
  );

  return (
    <ConstelacionContext.Provider value={valor}>
      <main style={{ ["--esc" as string]: String(valor.esc) }}>
        <GloboHero
          // El globo se corre a la derecha lo justo para dejar la columna
          // editorial libre, pero mucho menos que en producción (0.44): la
          // constelación necesita margen a ambos lados del país.
          encuadre={{ padLeft: 0.26, padBottom: 0.52 }}
          // 250 dvh ⇒ ~50 vh de arranque + ~100 vh de vuelo, el mismo reparto
          // que el recorrido real le da al tramo hero → primer destino.
          alturaVh={250}
          className={s.escena}
          capasDelMapa={<CapaConstelacion />}
        >
          <Overlay />
        </GloboHero>
      </main>
    </ConstelacionContext.Provider>
  );
}
