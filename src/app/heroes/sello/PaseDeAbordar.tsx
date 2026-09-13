"use client";

import BrandPin from "@/components/BrandPin";
import Button from "@/components/Button";
import s from "./estilos.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  El CTA compuesto como pase de abordar: cuerpo con los campos del viaje,
//  línea de troquel con sus dos muescas y talón con los botones y el código.
//
//  Es la misma pieza en las dos anchuras: en desktop es una tarjeta ligeramente
//  girada dentro de la columna derecha; en móvil pierde el giro, se pega al
//  borde inferior y se convierte en la franja de acción. Reparto por variantes
//  `desk:`, nunca por matchMedia, para que el primer frame ya salga bien.
// ─────────────────────────────────────────────────────────────────────────────

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <div className="font-label text-micro font-extrabold uppercase leading-none tracking-[.14em] text-muted">
        {etiqueta}
      </div>
      <div className="mt-1.5 truncate font-label text-copy font-bold leading-none text-ink">{valor}</div>
    </div>
  );
}

export default function PaseDeAbordar({ retardo = 0 }: { retardo?: number }) {
  return (
    <article
      // El giro sólo existe en desktop: en la franja inferior del teléfono una
      // tarjeta torcida deja cuñas de fondo en las esquinas y se lee como error.
      className={`${s.pase} ${s.pegado} relative w-full rounded-surface shadow-e1 desk:max-w-[440px] desk:[--giro:1.1deg]`}
      style={{ "--d": `${retardo}s` } as React.CSSProperties}
      aria-label="Pase de abordar: descarga de ConoceRD"
    >
      {/* ── Cuerpo ── */}
      <div className="px-4 pb-3 pt-3 desk:px-6 desk:pb-5 desk:pt-5">
        <span className="font-label text-micro font-extrabold uppercase tracking-[.16em] text-coral-ink">
          Pase de abordar
        </span>

        {/* Ruta: de donde estés a la isla. El pin de marca es la escala. */}
        <div className="mt-2.5 flex items-center gap-3 desk:mt-4 desk:gap-4">
          <span className="font-display text-[clamp(26px,7vw,40px)] font-extrabold leading-none tracking-[-.02em] text-ink">
            TÚ
          </span>
          <span className={s.riel} aria-hidden />
          <BrandPin size={22} color="var(--color-coral)" fondoVentana="#FFFDF6" />
          <span className={s.riel} aria-hidden />
          <span className="font-display text-[clamp(26px,7vw,40px)] font-extrabold leading-none tracking-[-.02em] text-coral-ink">
            RD
          </span>
        </div>

        {/* Campos del pase. En móvil son dos: el resto ya lo dice el titular. */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3.5 desk:mt-5 desk:gap-y-4">
          <Campo etiqueta="Pasajero" valor="Tú y quien quieras" />
          <Campo etiqueta="Salida" valor="Cuando tú digas" />
          <div className="max-desk:hidden">
            <Campo etiqueta="Puerta" valor="La isla entera" />
          </div>
          <div className="max-desk:hidden">
            <Campo etiqueta="Equipaje" valor="Ganas, na' más" />
          </div>
        </div>
      </div>

      <div className={s.perforacion} aria-hidden />

      {/* ── Talón: la acción ── */}
      <div className="flex flex-col gap-2 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3 desk:gap-3 desk:px-6 desk:pb-5 desk:pt-5">
        <Button variant="primary" size="lg" icon="download" className="w-full max-desk:h-[52px]">
          Descargar la app
        </Button>
        <Button variant="ghost" size="lg" icon="storefront" className="w-full max-desk:h-[52px]">
          Soy un negocio
        </Button>

        {/* El código va a la izquierda y las barras se estiran a la derecha: el
            cuño de marca cae sobre esa esquina y sólo puede permitirse tapar
            textura, nunca un dato legible. En teléfonos cortos (Safari con sus
            barras, 748 de alto) la fila cae bajo el cromo flotante y se retira. */}
        <div className="mt-0.5 flex items-end gap-3 desk:mt-1 [@media(max-width:899px)_and_(max-height:760px)]:hidden">
          <span className="shrink-0 font-label text-micro font-extrabold uppercase tracking-[.14em] text-muted">
            ConoceRD 2026
          </span>
          <div className={`${s.codigo} min-w-0 flex-1 max-desk:h-[18px]`} aria-hidden />
        </div>
      </div>
    </article>
  );
}
