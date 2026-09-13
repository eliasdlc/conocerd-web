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
//  Propuesta "Portada de revista": primera pantalla alternativa.
//
//  Dos superficies y una costura: papel crema a la izquierda con la cabecera
//  editorial, foto a sangre a la derecha. El pliegue que las separa hace de
//  índice: cinco muescas, una por categoría, y la de la portada visible crece
//  y se entinta.
//
//  La pieza viva son los chips. Elegir una categoría cambia tres cosas a la
//  vez (la foto, el acento de la edición y la línea de sumario) y nada más:
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
          {/* El wordmark es la marca: SVG plano, sin pasar por el optimizador
              (no hay nada que optimizar y sí que romper). El filete debajo es
              la cabecera de la revista. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={668}
            height={211}
            className={`${s.marca} block h-auto w-[clamp(124px,13.5vw,200px)]`}
          />
          <div aria-hidden="true" className="mt-3 h-px w-full bg-ink/15" />
        </header>

        <div className={s.medio}>
          <h1
            className={`${s.entra} ${s.titular} m-0 max-w-[17ch] font-display text-[clamp(31px,4.1vw,58px)] font-extrabold leading-[1.02] tracking-[-.03em] text-ink [text-wrap:balance] desk:max-w-[13ch]`}
            style={{ animationDelay: "120ms", fontVariationSettings: '"opsz" 96' }}
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
            className={`${s.entra} m-0 -mb-1.5 mt-1 font-label text-micro font-extrabold uppercase tracking-[.14em] text-muted max-desk:hidden`}
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
              variant="ghost"
              size="lg"
              icon="storefront"
              className="max-desk:h-11 max-desk:w-full"
              onClick={() => {}}
            >
              Soy un negocio
            </Button>
          </div>

        </div>

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
          className="absolute right-[clamp(16px,2.2vw,34px)] top-[clamp(16px,3vh,34px)] z-[7] max-desk:hidden"
        />

        {destino.imageCredit && (
          <p
            className={`${s.credito} z-[7] m-0 text-micro font-medium text-white/80`}
          >
            Foto: {destino.imageCredit}
          </p>
        )}

        <figcaption
          key={activa}
          className={`${s.ficha} ${s.cambia} z-[7] rounded-block border border-line bg-cream px-4 py-3.5 shadow-e1`}
        >
          <span
            className="flex items-center gap-1.5 font-label text-micro font-extrabold uppercase tracking-[.14em]"
            style={{ color: "var(--crd-rev-tinta)" }}
          >
            <Icon name={info.icon} className="text-[13px]" aria-hidden="true" />
            {info.label}
          </span>
          <p className="m-0 mt-1.5 font-display text-feature font-bold leading-[1.1] tracking-[-.02em] text-ink">
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
                className="text-[13px] text-mango-ink"
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
