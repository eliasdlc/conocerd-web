"use client";

// Red de seguridad de ruta (audit 5.1): cualquier error de render que antes
// dejaba la página en blanco cae aquí, con marca y en español. Sin iconos de
// Material a propósito — una página de error no debe depender de recursos
// externos.

import { useEffect } from "react";
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
      <span
        aria-hidden="true"
        className="mb-6 block size-3.5 rounded-full border-[2.5px] border-white bg-coral shadow-[0_0_0_6px_rgba(247,108,77,0.25)]"
      />
      <p className="m-0 font-mono text-mini font-bold uppercase tracking-[.16em] text-coral-ink">
        Error inesperado
      </p>
      <h1 className="mb-3 mt-2 font-display text-[clamp(26px,5vw,40px)] font-bold leading-[1.1] tracking-[-.012em] text-ink-2">
        Algo se salió de la ruta
      </h1>
      <p className="m-0 max-w-[420px] text-body leading-[1.6] text-muted">
        No fue tu culpa: algo falló de nuestro lado. Prueba a reintentar y, si
        sigue pasando, vuelve al inicio.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="crd-button inline-flex h-12 cursor-pointer items-center rounded-full bg-mango px-6 text-body font-bold text-ink-2 crd-sticker transition-[transform,box-shadow] duration-200"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-full border-2 border-ink px-6 text-body font-bold text-ink no-underline"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
