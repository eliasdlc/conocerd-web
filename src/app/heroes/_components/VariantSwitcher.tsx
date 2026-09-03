"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { findVariant, variantesDe } from "../_lib/variants";

// Conmutador flotante: permite saltar entre propuestas sin volver al índice ni
// tocar la URL. Vive en el layout de /heroes, así que ninguna variante tiene
// que acordarse de incluirlo.
//
// Es deliberadamente pequeño y de tinta neutra: forma parte del andamiaje de
// revisión, no de los diseños, y no debe competir con ellos. Se puede plegar
// (y el estado sobrevive a la navegación vía sessionStorage) para juzgar una
// pantalla completamente limpia.
export default function VariantSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(true);

  const slug = pathname?.split("/")[2] ?? "";
  // Las flechas se mueven DENTRO de la tanda: comparar entre sí las cinco
  // propuestas comparables es el gesto útil; saltar de una tanda a otra a
  // ciegas, no. Para cambiar de tanda se pasa por el índice.
  const variante = findVariant(slug);
  const grupo = variante?.grupo;
  const tanda = useMemo(() => (grupo ? variantesDe(grupo) : []), [grupo]);
  const indice = variante ? tanda.findIndex((v) => v.slug === slug) : -1;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAbierto(sessionStorage.getItem("crd-switcher") !== "0");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (indice < 0) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        router.push(`/heroes/${tanda[(indice + 1) % tanda.length].slug}`);
      } else if (e.key === "ArrowLeft") {
        router.push(`/heroes/${tanda[(indice - 1 + tanda.length) % tanda.length].slug}`);
      } else if (e.key === "Escape") {
        router.push("/heroes");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [indice, router, tanda]);

  // El índice no se conmuta a sí mismo.
  if (indice < 0) return null;

  const actual = tanda[indice];
  const anterior = tanda[(indice - 1 + tanda.length) % tanda.length];
  const siguiente = tanda[(indice + 1) % tanda.length];

  const plegar = (v: boolean) => {
    setAbierto(v);
    sessionStorage.setItem("crd-switcher", v ? "1" : "0");
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => plegar(true)}
        aria-label="Mostrar el conmutador de propuestas"
        className="fixed bottom-3 left-3 z-[999] grid size-9 cursor-pointer place-items-center rounded-full border border-white/25 bg-ink-2/85 font-mono text-mini font-bold text-white shadow-panel backdrop-blur-md"
      >
        {indice + 1}
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-[999] flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-ink-2/88 p-1 pl-1.5 text-white shadow-panel backdrop-blur-md">
      <Link
        href={`/heroes/${anterior.slug}`}
        aria-label={`Anterior: ${anterior.nombre}`}
        className="grid size-8 place-items-center rounded-full text-base leading-none transition-colors hover:bg-white/15"
      >
        ‹
      </Link>

      <Link
        href="/heroes"
        className="flex min-w-0 items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/15"
        title="Volver al índice (Esc)"
      >
        <span className="font-mono text-micro font-bold tabular-nums text-white/55">
          {indice + 1}/{tanda.length}
        </span>
        <span className="truncate text-tiny font-semibold">{actual.nombre}</span>
      </Link>

      <Link
        href={`/heroes/${siguiente.slug}`}
        aria-label={`Siguiente: ${siguiente.nombre}`}
        className="grid size-8 place-items-center rounded-full text-base leading-none transition-colors hover:bg-white/15"
      >
        ›
      </Link>

      <button
        type="button"
        onClick={() => plegar(false)}
        aria-label="Ocultar el conmutador"
        className="grid size-8 cursor-pointer place-items-center rounded-full text-mini text-white/60 transition-colors hover:bg-white/15 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
