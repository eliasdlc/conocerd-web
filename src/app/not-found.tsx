// 404 con marca (audit 5.1): el de Next por defecto salía en inglés y sin
// identidad. Mismo lenguaje visual del sitio — pin perdido, "esta ruta no
// existe" — y sin dependencias externas.

import Link from "next/link";
import BrandPin from "@/components/BrandPin";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
      {/* El pin que se cayó del mapa: la misma gota del logo, volcada 18°. Va
          en mango y no en coral: es una ilustración, no una acción, y el acento
          del sitio se reserva a las acciones. */}
      <BrandPin size={64} color="#FF8D16" className="mb-5 rotate-[18deg] [filter:drop-shadow(0_5px_6px_rgba(38,70,83,.22))]" />
      <p className="m-0 font-label text-mini font-extrabold uppercase tracking-[.16em] text-muted">
        404 · Esta ruta no existe
      </p>
      <h1 className="mb-3 mt-2 font-display text-[clamp(26px,5vw,34px)] font-extrabold leading-[1.1] tracking-[-.03em] text-ink">
        Este lugar no está <em className="crd-accent">en el mapa</em>
      </h1>
      <p className="m-0 max-w-[420px] text-lead leading-[1.6] text-muted">
        La página que buscas no existe o cambió de lugar. Lo bueno de perderse:
        siempre hay un camino de vuelta.
      </p>
      <Link
        href="/"
        // Una sola acción: dos salidas en una página de error obligan a elegir
        // justo cuando el visitante ya se perdió.
        className="mt-7 inline-flex h-12 items-center rounded-full bg-selected px-6 font-label text-body font-bold text-on-selected no-underline"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
