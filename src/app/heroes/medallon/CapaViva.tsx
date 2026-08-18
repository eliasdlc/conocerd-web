"use client";

import { useDescenso } from "../_components/GloboHero";
import s from "./estilos.module.css";

// El copy se desvanece con `--descenso` en CSS puro, pero un bloque invisible
// sigue siendo tabulable y sigue existiendo para un lector de pantalla. Este
// envoltorio es lo único que necesita JS de toda la propuesta: apagar la franja
// para el teclado y la accesibilidad en cuanto deja de verse.
//
// Los hijos llegan ya renderizados desde el servidor, así que el titular y los
// CTA están en el HTML inicial y no dependen de la hidratación.
export default function CapaViva({
  zona,
  children,
}: {
  zona: "sup" | "inf";
  children: React.ReactNode;
}) {
  const { t } = useDescenso();
  const fuera = t > 0.28;

  return (
    <div
      className={`${s.franja} ${zona === "sup" ? s.zonaSup : s.zonaInf}`}
      inert={fuera}
      aria-hidden={fuera || undefined}
    >
      {children}
    </div>
  );
}
