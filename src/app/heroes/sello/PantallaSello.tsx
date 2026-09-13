"use client";

import Image from "next/image";
import StampCRD from "@/components/StampCRD";
import PaseDeAbordar from "./PaseDeAbordar";
import SelloTinta from "./SelloTinta";
import s from "./estilos.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Propuesta "Sello de entrada": la primera pantalla como portada de un
//  documento de viaje.
//
//  La jerarquía es tipográfica, no fotográfica: manda el titular en la familia
//  de titulares a cuerpo de portada, y todo lo demás (cuños, troqueles y el
//  pase de abordar) es el aparato del pasaporte que lo enmarca. La única foto
//  entra como estampilla pegada con cinta, nunca como fondo.
//
//  Guion de entrada (una sola pasada, disparada por la carga):
//    0.05 s  cabecera
//    0.15 s  el titular sube línea a línea (+90 ms por línea)
//    0.62 s  el pase de abordar se asienta
//    0.70 s  caen los cuños y la estampilla
//  Después de ~1,3 s la pantalla está completamente quieta.
// ─────────────────────────────────────────────────────────────────────────────

/** Líneas del titular. La última se entinta en coral (.crd-accent). */
const TITULAR = ["Conoce la", "República", "Dominicana", "auténtica"];

export default function PantallaSello() {
  return (
    <main className={`${s.pantalla} flex flex-col`}>
      <div className={s.marco} aria-hidden />

      <div
        // El pb móvil (60px) es la franja que el conmutador de propuestas ocupa
        // abajo al centro: 12px de separación + 40px de píldora + aire.
        className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-5 pb-[calc(60px+env(safe-area-inset-bottom))] pt-3.5
          desk:px-[clamp(28px,4.4vw,60px)] desk:pb-[70px] desk:pt-[26px]"
      >
        {/* ── Cabecera del documento ────────────────────────────────────── */}
        {/* El filete bajo la cabecera es lo que ata el logotipo a la página,
            como el encabezado de una hoja de pasaporte. En móvil no cabe: ahí
            manda el titular. */}
        <header
          className={`${s.sube} flex items-start justify-between gap-4 desk:border-b desk:border-line desk:pb-5`}
          style={{ "--d": ".05s" } as React.CSSProperties}
        >
          <Image
            src="/assets/logo.svg"
            alt="ConoceRD, descubre lo nuestro"
            width={1296}
            height={595}
            priority
            unoptimized
            className="block h-auto w-[118px] desk:w-[196px]"
          />

          {/* Móvil: el cuño ocupa la esquina de la cabecera. */}
          <div
            className={`${s.cae} shrink-0 desk:hidden`}
            style={{ "--giro": "-11deg", "--d": ".7s" } as React.CSSProperties}
          >
            <StampCRD size={74} rotate={0} />
          </div>
        </header>

        {/* ── Cuerpo: editorial + pase ──────────────────────────────────── */}
        {/* En móvil el reparto es vertical y el pase cae al fondo; en desktop es
            una rejilla de dos columnas separadas por el troquel del talón. */}
        <div className="relative flex flex-1 flex-col gap-3 pt-4 desk:grid desk:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)] desk:items-center desk:gap-[clamp(30px,4.6vw,66px)] desk:pt-0">
          {/* Columna editorial */}
          <div className="min-w-0 max-desk:order-1">
            <h1 className={`${s.titular} mt-1 desk:mt-4`} style={{ fontVariationSettings: '"opsz" 96' }}>
              <span className="sr-only">ConoceRD, descubre lo nuestro. </span>
              {TITULAR.map((linea, i) => (
                <span key={linea} className={s.linea}>
                  <span
                    className={`${s.lineaTexto} ${i === TITULAR.length - 1 ? "crd-accent" : ""}`}
                    style={{ "--d": `${0.15 + i * 0.09}s` } as React.CSSProperties}
                  >
                    {linea}
                  </span>
                </span>
              ))}
            </h1>

            <p
              className={`${s.sube} m-0 mt-3.5 max-w-[44ch] text-[clamp(15px,1.25vw,18px)] leading-[1.5] text-ink desk:mt-5`}
              style={{ "--d": ".48s" } as React.CSSProperties}
            >
              Rutas, playas y comedores que solo saben los de aquí. Todo junto en una app.
            </p>

            {/* Pie del bloque editorial: la estampilla y el cuño de aduana, el
                collage pegado al pie de la página. */}
            <div className="mt-3.5 flex flex-wrap items-center gap-4 desk:mt-7 desk:gap-6">
              <figure
                className={`${s.cae} relative m-0 hidden w-[118px] shrink-0 desk:block`}
                style={{ "--giro": "-6deg", "--d": ".82s" } as React.CSSProperties}
              >
                <div className={`${s.estampillaSombra} crd-tape relative`}>
                  <div className={s.estampilla}>
                    <Image
                      src="/assets/destino-zona-colonial.webp"
                      alt="Calle empedrada de la Zona Colonial de Santo Domingo"
                      width={420}
                      height={480}
                      sizes="118px"
                      className="block h-[104px] w-full rounded-[2px] object-cover"
                    />
                  </div>
                </div>
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-[7px] text-center font-label text-[9px] font-bold uppercase tracking-[.1em] text-muted">
                  Zona Colonial
                </figcaption>
              </figure>

              <SelloTinta titulo="Entrada aprobada" sub="Sin trampa para turistas" giro={-6} retardo={0.74} />
            </div>
          </div>

          {/* Columna del pase, con el cuño de marca sobre el talón */}
          <div className={`${s.troquelGutter} relative max-desk:order-3 max-desk:mt-auto desk:pb-4`}>
            <PaseDeAbordar retardo={0.62} />

            {/* Cuño de marca sobre la esquina del talón. */}
            <div
              className={`${s.cae} pointer-events-none absolute -bottom-[26px] -right-[26px] z-[3] hidden desk:block`}
              style={{ "--giro": "-13deg", "--d": ".7s" } as React.CSSProperties}
            >
              <StampCRD size={118} rotate={0} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
