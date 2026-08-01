// 404 con marca (audit 5.1): el de Next por defecto salía en inglés y sin
// identidad. Mismo lenguaje visual del sitio — pin perdido, "esta ruta no
// existe" — y sin dependencias externas.

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
      <span
        aria-hidden="true"
        className="mb-6 block size-3.5 rounded-full border-[2.5px] border-white bg-coral shadow-[0_0_0_6px_rgba(247,108,77,0.25)]"
      />
      <p className="m-0 font-mono text-mini font-bold uppercase tracking-[.16em] text-muted">
        404 · Esta ruta no existe
      </p>
      <h1 className="mb-3 mt-2 font-display text-[clamp(26px,5vw,40px)] font-extrabold leading-[1.1] tracking-[-.025em] text-ink-2">
        Este lugar no está en el mapa
      </h1>
      <p className="m-0 max-w-[420px] text-body leading-[1.6] text-muted">
        La página que buscas no existe o cambió de lugar. Lo bueno de perderse:
        siempre hay un camino de vuelta.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex h-12 items-center rounded-full bg-mango px-6 font-display text-body font-bold text-ink-2 no-underline shadow-glow-mango"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
