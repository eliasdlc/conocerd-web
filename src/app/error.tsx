"use client";

// Red de seguridad de ruta: cualquier error de render que antes dejaba la
// página en blanco cae aquí, con marca y en español.
//
// Sin el set de iconos y sin una sola pieza del producto, a propósito: si lo
// que falló fue el bundle, una página de error que importa medio sitio falla
// con él. Lo único que entra es el wordmark, que es un SVG estático servido
// por next/image, ya presente en el bundle de cualquier ruta.

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
      {/* El punto coral con halo murió: el acento no decora, y un halo del
          color del relleno era el cliché que el sistema quitó de todo el
          sitio. La marca la pone el wordmark. */}
      <Image
        src="/assets/wordmark.svg"
        alt="ConoceRD"
        width={101}
        height={32}
        className="mb-6 h-8 w-auto"
      />
      <h1 className="mb-3 font-display text-[clamp(26px,5vw,34px)] font-extrabold leading-[1.1] tracking-[-.03em] text-ink">
        Algo se salió de <em className="crd-accent">la ruta</em>
      </h1>
      <p className="m-0 max-w-[420px] text-lead leading-[1.6] text-muted">
        No fue tu culpa: algo falló de nuestro lado. Prueba a reintentar y, si
        sigue pasando, vuelve al inicio.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {/* La primaria del sistema: 54 con la etiqueta a 19/700, que es el
            cuerpo desde el que blanco sobre coral pasa AA (3.81:1). */}
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="crd-button inline-flex h-[54px] cursor-pointer items-center rounded-full bg-coral px-[26px] font-label text-[19px] font-bold text-white shadow-e2 transition-[transform,box-shadow] duration-200"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-[54px] items-center rounded-full border-[1.5px] border-line-strong px-[26px] font-label text-[19px] font-bold text-ink no-underline"
        >
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
