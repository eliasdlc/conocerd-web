"use client";

import { useEffect, useState } from "react";

/**
 * `true` mientras cualquier parte del pie de página está dentro del viewport.
 *
 * El cromo flotante del recorrido (el riel de capítulos) sólo tiene sentido
 * mientras hay recorrido: sobre el pie no informa de nada y se queda encima de
 * su contenido. Es un observador y no un listener de scroll porque el pie
 * aparece y desaparece del flujo en móvil, y `IntersectionObserver` ya lo
 * contempla sin recalcular por gesto.
 */
export function usePieALaVista(): boolean {
  const [aLaVista, setALaVista] = useState(false);

  useEffect(() => {
    const pie = document.querySelector("footer");
    if (!pie) return;
    const obs = new IntersectionObserver(([e]) => setALaVista(e.isIntersecting));
    obs.observe(pie);
    return () => obs.disconnect();
  }, []);

  return aLaVista;
}
