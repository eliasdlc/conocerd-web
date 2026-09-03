"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import Button from "@/components/Button";
import Icon from "@/components/Icon";
import StampCRD from "@/components/StampCRD";
import { CATEGORY_META, type Category } from "@/data/destinations";

import { PIEZAS, PIEZA_INICIAL, type Pieza } from "./datos";
import s from "./estilos.module.css";

// ─────────────────────────────────────────────────────────────────────────────
//  Propuesta "Portada de revista" — primera pantalla alternativa.
//
//  Dos superficies y una costura: papel crema a la izquierda con la cabecera
//  editorial, foto a sangre a la derecha. El pliegue que las separa hace de
//  índice: cinco muescas, una por categoría, y la de la portada visible crece
//  y se entinta.
//
//  La pieza viva son los chips. Elegir una categoría cambia tres cosas a la
//  vez —la foto, el acento de la edición y la línea de sumario— y nada más:
//  no hay rotación automática, no hay carrusel. El visitante manda.
//
//  Cruce de fotos sin parpadeo: las capas ya mostradas se quedan opacas debajo
//  y la entrante sube por encima al 100% sólo cuando su bitmap está decodificado.
//  Así nunca se ve el fondo entre dos portadas, ni siquiera con la red lenta de
//  un teléfono en la carretera.
// ─────────────────────────────────────────────────────────────────────────────

const MS_CRUCE = 700;

function formatearNota(n: number) {
  return n.toFixed(1).replace(".", ",");
}

/** Todas las capas de foto, apiladas por orden de uso. */
function Capas({
  montadas,
  pila,
  cargadas,
  mostradas,
  activa,
  alCargar,
}: {
  montadas: Category[];
  pila: Category[];
  cargadas: Category[];
  mostradas: Category[];
  activa: Category;
  alCargar: (c: Category) => void;
}) {
  return (
    <>
      {PIEZAS.filter((p) => montadas.includes(p.categoria)).map((p) => {
        const lista = cargadas.includes(p.categoria);
        const visible =
          lista && (p.categoria === activa || mostradas.includes(p.categoria));
        const z = pila.indexOf(p.categoria);

        return (
          <div
            key={p.categoria}
            aria-hidden={p.categoria !== activa}
            className={`${s.capa} ${visible ? s.capaVisible : ""}`}
            style={{ zIndex: z < 0 ? 0 : z + 1 }}
          >
            <Image
              src={p.destino.image}
              alt={`${p.destino.name}, ${p.destino.province}`}
              fill
              // La foto de portada es el elemento más grande de la pantalla:
              // es la LCP y la única que se precarga. Las otras cuatro se
              // montan cuando el visitante las pide (o las roza con el cursor).
              priority={p.categoria === PIEZA_INICIAL.categoria}
              sizes="(max-width: 899px) 100vw, 58vw"
              style={{ objectPosition: p.encuadre }}
              onLoad={() => alCargar(p.categoria)}
            />
          </div>
        );
      })}
    </>
  );
}

export default function Portada() {
  const [activa, setActiva] = useState<Category>(PIEZA_INICIAL.categoria);
  /** Orden de uso: define el apilado (la última elegida va arriba). */
  const [pila, setPila] = useState<Category[]>([PIEZA_INICIAL.categoria]);
  /** Montadas en el DOM (incluye las precargadas al pasar el cursor). */
  const [montadas, setMontadas] = useState<Category[]>([
    PIEZA_INICIAL.categoria,
  ]);
  /** Con el bitmap ya decodificado. */
  const [cargadas, setCargadas] = useState<Category[]>([]);
  /** Ya cruzaron del todo: se quedan opacas debajo y no vuelven a parpadear. */
  const [mostradas, setMostradas] = useState<Category[]>([]);

  const pieza: Pieza =
    PIEZAS.find((p) => p.categoria === activa) ?? PIEZA_INICIAL;
  const info = CATEGORY_META[activa];
  const destino = pieza.destino;

  const montar = (c: Category) =>
    setMontadas((prev) => (prev.includes(c) ? prev : [...prev, c]));

  const elegir = (c: Category) => {
    if (c === activa) return;
    montar(c);
    setPila((prev) => [...prev.filter((x) => x !== c), c]);
    setActiva(c);
  };

  useEffect(() => {
    if (!cargadas.includes(activa) || mostradas.includes(activa)) return;
    const t = window.setTimeout(
      () =>
        setMostradas((prev) =>
          prev.includes(activa) ? prev : [...prev, activa],
        ),
      MS_CRUCE,
    );
    return () => window.clearTimeout(t);
  }, [activa, cargadas, mostradas]);

  const indice = PIEZAS.findIndex((p) => p.categoria === activa);

  return (
    <main
      className={s.hoja}
      style={
        {
          "--crd-rev-acento": info.color,
          "--crd-rev-tinta": info.ink,
        } as React.CSSProperties
      }
    >
      {/* ── Columna editorial ────────────────────────────────────────────── */}
      <div className={s.columna}>
        <header className={s.entra} style={{ animationDelay: "40ms" }}>
          <div className="flex items-baseline justify-between gap-3 font-mono text-micro font-bold uppercase tracking-[.18em]">
            <span className="text-muted">Guía de viaje · RD</span>
            <span style={{ color: "var(--crd-rev-tinta)" }}>
              N.º 01 · Ago 2026
            </span>
          </div>
          <div aria-hidden="true" className="mt-2 h-px w-full bg-ink/15" />
          {/* El wordmark es la marca: SVG plano, sin pasar por el optimizador
              (no hay nada que optimizar y sí que romper). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={668}
            height={211}
            className={`${s.marca} mt-3 block h-auto w-[clamp(124px,13.5vw,200px)]`}
          />
        </header>

        <div className={s.medio}>
          <h1
            className={`${s.entra} ${s.titular} m-0 max-w-[17ch] font-display text-[clamp(31px,4.3vw,62px)] font-bold leading-[1.02] tracking-[-.022em] text-ink-2 [text-wrap:balance] desk:max-w-[13ch]`}
            style={{ animationDelay: "120ms" }}
          >
            {/* El acento no se parte nunca: "no" arriba y "cabe" abajo mata la
                broma y deja una viuda en itálica. */}
            La isla que <em className="crd-accent whitespace-nowrap">no cabe</em> en un folleto
          </h1>

          <p
            className={`${s.entra} ${s.bajada} m-0 max-w-[46ch] text-[clamp(14.5px,1.15vw,17px)] leading-[1.55] text-muted`}
            style={{ animationDelay: "180ms" }}
          >
            ConoceRD te lleva a lo que la gente de aquí recomienda de verdad:
            rutas armadas, precios claros y cero trampa para turista.
          </p>

          <p
            className={`${s.entra} m-0 -mb-1.5 mt-1 font-mono text-micro font-bold uppercase tracking-[.16em] text-muted-2 max-desk:hidden`}
            style={{ animationDelay: "230ms" }}
            id="crd-rev-sumario"
          >
            Escoge la portada
          </p>

          <div
            role="group"
            aria-labelledby="crd-rev-sumario"
            aria-label="Escoge la portada por categoría"
            className={`${s.chips} ${s.entra}`}
            style={{ animationDelay: "260ms" }}
          >
            {PIEZAS.map((p) => {
              const m = CATEGORY_META[p.categoria];
              const esta = p.categoria === activa;
              return (
                <button
                  key={p.categoria}
                  type="button"
                  aria-pressed={esta}
                  aria-label={`Portada de ${m.label}: ${p.destino.name}`}
                  data-activa={esta}
                  className={s.chip}
                  style={
                    {
                      "--chip": m.color,
                      "--chip-ink": m.ink,
                    } as React.CSSProperties
                  }
                  onClick={() => elegir(p.categoria)}
                  // Rozarlo o tabular hasta él ya baja la foto: cuando se hace
                  // clic, el cruce ya tiene el bitmap listo.
                  onPointerEnter={() => montar(p.categoria)}
                  onFocus={() => montar(p.categoria)}
                >
                  <Icon
                    name={m.icon}
                    className="text-base"
                    aria-hidden="true"
                  />
                  <span className={s.chipTexto}>{m.label}</span>
                </button>
              );
            })}
          </div>

          <div
            aria-live="polite"
            className={`${s.entra} mt-0.5`}
            style={{ animationDelay: "300ms" }}
          >
            <p
              key={activa}
              className={`${s.linea} ${s.cambia} m-0 min-h-[3em] max-w-[44ch] pl-3.5 text-[clamp(14px,1.05vw,15.5px)] leading-[1.5] text-ink`}
            >
              {pieza.linea}
            </p>
          </div>

          <div
            className={`${s.entra} ${s.acciones} mt-1 flex flex-wrap items-center gap-3 max-desk:mt-0.5 max-desk:gap-2.5`}
            style={{ animationDelay: "350ms" }}
          >
            {/* Maqueta: los CTA no navegan a ningún sitio todavía. */}
            <Button
              variant="primary"
              size="lg"
              icon="download"
              className="max-desk:h-12 max-desk:w-full"
              onClick={() => {}}
            >
              Descargar la app
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon="storefront"
              className="max-desk:h-11 max-desk:w-full"
              onClick={() => {}}
            >
              Soy un negocio
            </Button>
          </div>

          <p
            className={`${s.entra} ${s.gratis} m-0 font-mono text-mini text-muted-2 max-desk:mt-0.5 max-desk:text-micro`}
            style={{ animationDelay: "380ms" }}
          >
            Gratis · iOS y Android · pronto en las tiendas
          </p>
        </div>

        <footer
          className={`${s.entra} mt-auto pt-3`}
          style={{ animationDelay: "430ms" }}
        >
          {/* Sumario de portada: las tres líneas de cubierta. En columna, como
              en una revista, y no en fila: apiladas ocupan el pie de la página
              en vez de dejarlo vacío. */}
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 font-mono text-mini text-muted-2 max-desk:hidden">
            {[
              "Rutas listas para el fin de semana",
              "Negocios locales verificados uno por uno",
              "Mapa que funciona sin datos",
            ].map((t, i) => (
              <li key={t} className="flex items-center gap-2">
                <b style={{ color: "var(--crd-rev-tinta)" }}>0{i + 1}</b>
                <span aria-hidden="true" className="h-px w-4 bg-ink/15" />
                {t}
              </li>
            ))}
          </ul>
          {/* Pista de que esto es un recorrido y sigue hacia abajo. No es un
              botón: no llevaría a ninguna parte en una maqueta, y una flecha
              que parece pulsable y no responde es peor que ninguna. */}
          <p className="m-0 mt-3 flex items-center gap-2 font-mono text-micro font-bold uppercase tracking-[.16em] text-muted max-desk:mt-2">
            <Icon
              name="arrow_downward"
              className="text-sm"
              aria-hidden="true"
            />
            El recorrido sigue abajo
          </p>
        </footer>
      </div>

      {/* ── Foto de portada ──────────────────────────────────────────────── */}
      <figure className={`${s.panel} m-0`}>
        <Capas
          montadas={montadas}
          pila={pila}
          cargadas={cargadas}
          mostradas={mostradas}
          activa={activa}
          alCargar={(c) =>
            setCargadas((prev) => (prev.includes(c) ? prev : [...prev, c]))
          }
        />

        <div aria-hidden="true" className={s.veloLomo} style={{ zIndex: 6 }} />
        <div aria-hidden="true" className={s.veloAlto} style={{ zIndex: 6 }} />
        <div aria-hidden="true" className={s.veloPie} style={{ zIndex: 6 }} />

        <StampCRD
          size={118}
          rotate={-9}
          line1="EDICIÓN 01"
          line2="· AGO 2026 ·"
          className="absolute right-[clamp(16px,2.2vw,34px)] top-[clamp(16px,3vh,34px)] z-[7] max-desk:hidden"
        />

        {destino.imageCredit && (
          <p
            className={`${s.credito} z-[7] m-0 font-mono text-micro font-medium text-white/80`}
          >
            Foto: {destino.imageCredit}
          </p>
        )}

        <figcaption
          key={activa}
          className={`${s.ficha} ${s.cambia} z-[7] rounded-card border border-line bg-cream px-4 py-3.5 shadow-panel`}
        >
          <span
            className="flex items-center gap-2 font-mono text-micro font-bold uppercase tracking-[.14em]"
            style={{ color: "var(--crd-rev-tinta)" }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: "var(--crd-rev-acento)" }}
            />
            {info.label} · Portada
          </span>
          <p className="m-0 mt-1.5 font-display text-feature font-bold leading-[1.1] text-ink-2">
            {destino.name}
          </p>
          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-tiny text-muted">
            <span>{destino.province}</span>
            <span aria-hidden="true" className="opacity-40">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon
                name="star"
                className="text-[13px] text-mango"
                aria-hidden="true"
              />
              <span className="tabular-nums">
                {formatearNota(destino.rating)}
              </span>
              <span className="sr-only">de 5 según viajeros</span>
            </span>
          </p>
          <p
            className={`${s.fichaDesc} m-0 mt-1.5 text-copy leading-[1.45] text-muted`}
          >
            {destino.desc}
          </p>
        </figcaption>
      </figure>

      {/* Pliegue: la costura entre papel y foto, con el índice de portadas. */}
      <div className={s.pliegue} aria-hidden="true">
        {PIEZAS.map((p, i) => (
          <span
            key={p.categoria}
            className={`${s.muesca} ${i === indice ? s.muescaActiva : ""}`}
            style={{ top: `${22 + i * 13}%` }}
          />
        ))}
      </div>
    </main>
  );
}
