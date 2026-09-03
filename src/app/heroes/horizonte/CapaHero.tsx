"use client";

import { useDescenso } from "../_components/GloboHero";
import s from "./estilos.module.css";

/**
 * Envoltura del overlay. Sólo existe para una cosa: retirar el contenido del
 * foco y del árbol de accesibilidad cuando el descenso ya lo dejó invisible
 * (opacidad y desplazamiento los gobierna el CSS con `--descenso`, sin JS).
 *
 * El contenido llega como `children` desde un componente de servidor, así que
 * este cliente puede re-renderizar en cada frame de scroll sin volver a
 * renderizar el árbol de dentro — React reutiliza los mismos elementos.
 */
export default function CapaHero({ children }: { children: React.ReactNode }) {
  const { t } = useDescenso();
  const oculto = t > 0.42;

  return (
    <div className={s.capa} aria-hidden={oculto || undefined} inert={oculto}>
      {children}
    </div>
  );
}
