"use client";

import { useDescenso } from "../_components/GloboHero";
import s from "./estilos.module.css";

// Envoltura del overlay. Sólo existe para retirar el contenido del foco y del
// árbol de accesibilidad cuando el descenso ya lo dejó invisible: la opacidad
// y el desplazamiento los gobierna el CSS con `--descenso`, sin JS.
export default function CapaHero({ children }: { children: React.ReactNode }) {
  const { t } = useDescenso();
  const oculto = t > 0.4;

  return (
    <div className={s.capa} aria-hidden={oculto || undefined} inert={oculto}>
      {children}
    </div>
  );
}
