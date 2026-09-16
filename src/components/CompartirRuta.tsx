"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { trackRouteShare } from "@/lib/analytics";
import { contarParadas, nombreDeRuta, slugDeRuta } from "@/lib/ruta/slug";
import { SITE_URL } from "@/lib/site";

// "Compartir mi ruta": la URL propia de la ruta armada (/ruta/<slug>), por el
// share nativo del teléfono o al portapapeles donde no lo hay. El botón mismo
// confirma la copia durante dos segundos; no hay toast. Con menos de dos
// paradas no existe: no hay ruta que compartir.
export default function CompartirRuta({ stops }: { stops: readonly string[] }) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    },
    []
  );

  const slug = slugDeRuta(stops);
  if (!slug) return null;
  const url = `${SITE_URL}/ruta/${slug}`;
  const title = `${nombreDeRuta(stops)}: ${contarParadas(stops.length)} por RD`;

  async function compartir() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title });
        trackRouteShare({ stops: stops.length, method: "share" });
      } catch {
        // Cancelado por la persona: no es un error ni un evento.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    trackRouteShare({ stops: stops.length, method: "copy" });
    setCopiado(true);
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={compartir}
      aria-live="polite"
      className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line bg-paper font-label text-tiny font-bold text-ink transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
    >
      <Icon name={copiado ? "check" : "share"} className="text-sm" />
      {copiado ? "Enlace copiado" : "Compartir mi ruta"}
    </button>
  );
}
