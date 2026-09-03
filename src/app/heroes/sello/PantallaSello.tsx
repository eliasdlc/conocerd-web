"use client";

import Image from "next/image";
import StampCRD from "@/components/StampCRD";
import PaseDeAbordar from "./PaseDeAbordar";
import SelloTinta from "./SelloTinta";
import s from "./estilos.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Propuesta "Sello de entrada" — la primera pantalla como portada de un
//  documento de viaje.
//
//  La jerarquía es tipográfica, no fotográfica: manda un titular Fraunces a
//  cuerpo de portada, y todo lo demás —campos monoespaciados, cuños, troqueles
//  y el pase de abordar— es el aparato del pasaporte que lo enmarca. La única
//  foto entra como estampilla pegada con cinta, nunca como fondo.
//
//  Guion de entrada (una sola pasada, disparada por la carga):
//    0.05 s  cabecera y campos del documento
//    0.15 s  el titular sube línea a línea (+90 ms por línea)
//    0.62 s  el pase de abordar se asienta
//    0.70 s  caen los cuños y la estampilla
//  Después de ~1,3 s la pantalla está completamente quieta.
// ─────────────────────────────────────────────────────────────────────────────

/** Líneas del titular. La última se entinta en coral itálico (.crd-accent). */
const TITULAR = ["Conoce la", "República", "Dominicana", "auténtica"];

/** Campos del documento, arriba a la derecha (sólo desktop). */
const CAMPOS = [
  { etiqueta: "Tipo", valor: "P / RD" },
  { etiqueta: "Emisión", valor: "2026" },
  { etiqueta: "Válido en", valor: "Toda la isla" },
];

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
        {/* El filete bajo la cabecera es lo que ata logotipo y campos en una
            sola banda de datos, como el encabezado de una página de pasaporte.
            En móvil no cabe: ahí manda el titular. */}
        <header
          className={`${s.sube} flex items-start justify-between gap-4 desk:border-b desk:border-line desk:pb-5`}
          style={{ "--d": ".05s" } as React.CSSProperties}
        >
          <Image
            src="/assets/logo.png"
            alt="ConoceRD — Descubre Lo Nuestro"
            width={760}
            height={363}
            priority
            sizes="(max-width: 899px) 120px, 196px"
            className="block h-auto w-[118px] desk:w-[196px]"
          />

          <div className="hidden items-stretch gap-5 desk:flex">
            {CAMPOS.map((c) => (
              <div key={c.etiqueta} className="border-l border-line pl-5 first:border-l-0 first:pl-0">
                <div className="font-mono text-micro font-bold uppercase leading-none tracking-[.18em] text-muted">
                  {c.etiqueta}
                </div>
                <div className="mt-1.5 font-mono text-copy font-bold leading-none text-ink">{c.valor}</div>
              </div>
            ))}
          </div>

          {/* Móvil: el cuño ocupa el sitio de los campos. */}
          <div
            className={`${s.cae} shrink-0 desk:hidden`}
            style={{ "--giro": "-11deg", "--d": ".7s" } as React.CSSProperties}
          >
            <StampCRD size={74} rotate={0} line1="EST. 2026" line2="· HECHO EN RD ·" />
          </div>
        </header>

        {/* ── Cuerpo: editorial + pase ──────────────────────────────────── */}
        {/* En móvil el reparto es vertical y el pase cae al fondo (mt-auto en la
            pista de scroll empuja todo lo que va detrás); en desktop es una
            rejilla de dos columnas y la pista se ancla al pie de la página. */}
        <div className="relative flex flex-1 flex-col gap-3 pt-4 desk:grid desk:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)] desk:items-center desk:gap-[clamp(30px,4.6vw,66px)] desk:pt-0">
          {/* Columna editorial */}
          <div className="min-w-0 max-desk:order-1">
            <p
              className={`${s.sube} m-0 font-mono text-micro font-bold uppercase leading-none tracking-[.22em] text-coral-ink desk:text-mini`}
              style={{ "--d": ".1s" } as React.CSSProperties}
            >
              Documento de viaje · N.º 001
            </p>

            <h1 className={`${s.titular} mt-3 desk:mt-4`}>
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

            {/* Pie del bloque editorial: la estampilla, el cuño de aduana y las
                coordenadas — el collage pegado al pie de la página. */}
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
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-[9px] text-center font-mono text-[8px] font-bold uppercase tracking-[.12em] text-muted">
                  Zona Colonial · SD
                </figcaption>
              </figure>

              <SelloTinta titulo="Entrada aprobada" sub="Sin trampa para turistas" giro={-6} retardo={0.74} />

              <div
                className={`${s.sube} font-mono text-mini font-bold uppercase leading-[1.5] tracking-[.14em] text-muted`}
                style={{ "--d": ".56s" } as React.CSSProperties}
              >
                18°28′N 69°53′O
                <span className="hidden desk:block">Punto de partida</span>
              </div>
            </div>
          </div>

          {/* ── Pista de que el recorrido sigue abajo ─────────────────────── */}
          <div
            className={`${s.sube} pointer-events-none flex items-center gap-3 max-desk:order-2 max-desk:mt-auto max-desk:pt-4 desk:absolute desk:bottom-[-38px] desk:left-0`}
            style={{ "--d": ".9s" } as React.CSSProperties}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-ink/25">
              <svg viewBox="0 0 24 24" aria-hidden className="size-[15px]">
                <polyline
                  points="5,8 12,16 19,8"
                  fill="none"
                  stroke="#B23410"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-mono text-micro font-bold uppercase tracking-[.18em] text-muted desk:text-mini">
              Sigue bajando<span className="hidden desk:inline"> — el recorrido empieza aquí</span>
            </span>
          </div>

          {/* Columna del pase, con el cuño de marca sobre el talón */}
          <div className={`${s.troquelGutter} relative max-desk:order-3 desk:pb-4`}>
            <PaseDeAbordar retardo={0.62} />

            {/* Cuño de marca sobre la esquina del talón. */}
            <div
              className={`${s.cae} pointer-events-none absolute -bottom-[26px] -right-[26px] z-[3] hidden desk:block`}
              style={{ "--giro": "-13deg", "--d": ".7s" } as React.CSSProperties}
            >
              <StampCRD size={118} rotate={0} line1="EST. 2026" line2="· HECHO EN RD ·" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
