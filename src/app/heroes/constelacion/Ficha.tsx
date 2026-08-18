"use client";

import { useRef } from "react";
import Image from "next/image";
import { CATEGORY_META } from "@/data/destinations";
import type { NodoConstelacion } from "./datos";
import { useConstelacion } from "./estado";
import s from "./estilos.module.css";

// Ficha de destino: foto real, nombre, provincia y chip con el color de su
// categoría. Es un botón de verdad —conmuta el destaque— porque en táctil no
// hay hover: tocar tiene que hacer lo mismo que pasar el ratón, y con teclado
// el foco lo enciende igual.
//
// El puntero se distingue a propósito. Al tocar, el navegador emula la
// secuencia del ratón —pointerenter, focus y recién entonces click— así que
// cuando llega el click la ficha YA está encendida: un `onClick` que conmutara
// a secas la apagaba en el mismo gesto y en móvil no pasaba nada. Por eso el
// gesto se recuerda desde `pointerdown`, que es lo último que ocurre antes de
// que nada haya cambiado. Con ratón y teclado el clic solo confirma; apagar es
// salir de la ficha o perder el foco.

export default function Ficha({ nodo }: { nodo: NodoConstelacion }) {
  const { activo, setActivo } = useConstelacion();
  // Estado del gesto en curso, capturado en pointerdown: si vino de un dedo y
  // si la ficha ya estaba encendida ANTES de tocarla.
  const gesto = useRef({ tactil: false, estaba: false });
  const d = nodo.destino;
  const meta = CATEGORY_META[d.category];
  const ancla = nodo.ficha;
  if (!ancla) return null;

  const encendido = activo === d.id;

  return (
    <div
      className={s.ficha}
      data-on={encendido ? "1" : undefined}
      data-lado={ancla.lado}
      data-solo-ancho={nodo.soloAncho ? "1" : undefined}
      data-solo-desk={nodo.soloDesk ? "1" : undefined}
      style={
        {
          "--nx": `${ancla.dx}px`,
          "--ny": `${ancla.dy}px`,
          "--ancla": ancla.lado === "der" ? "-100%" : "0%",
          "--fx": ancla.lado === "der" ? "-96px" : "96px",
          "--fy": ancla.dy < 0 ? "-44px" : "44px",
          "--sal": String(ancla.salida),
          "--tono": meta.color,
          "--tono-ink": meta.ink,
          "--tono-suave": `${meta.color}24`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className={s.fichaBoton}
        aria-pressed={encendido}
        aria-label={`${d.name}, ${d.province}. ${meta.label}. Señalar en el globo`}
        onPointerDown={(e) => {
          gesto.current = { tactil: e.pointerType !== "mouse", estaba: encendido };
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setActivo(d.id);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setActivo(null);
        }}
        onFocus={() => setActivo(d.id)}
        onBlur={() => setActivo(null)}
        onClick={() =>
          setActivo(gesto.current.tactil && gesto.current.estaba ? null : d.id)
        }
      >
        <span className={s.fichaFoto}>
          <Image src={d.image} alt="" width={124} height={124} sizes="124px" />
        </span>
        <span className={s.fichaCuerpo}>
          <span className={s.fichaNombre}>{d.name}</span>
          <span className={s.fichaProvincia}>{d.province}</span>
          <span className={s.chip}>
            <span className={s.chipPunto} aria-hidden="true" />
            {meta.label}
          </span>
        </span>
      </button>
      <span className={s.nodo} data-nodo={d.id} aria-hidden="true" />
    </div>
  );
}
