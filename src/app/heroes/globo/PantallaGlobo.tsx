"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import { CATEGORY_META, DESTINATIONS, type Destination } from "@/data/destinations";
import {
  TOTAL_CATEGORIAS,
  TOTAL_DESTINOS,
  TOTAL_PROVINCIAS,
  VISTA_INICIAL,
  grados,
  type Vista,
} from "./datos";
import s from "./estilos.module.css";

// El mapa (y con él MapLibre) llega en diferido: la marca, el titular y los CTA
// existen en el primer HTML, sin esperar al runtime de WebGL. El lienzo pintado
// que va detrás no es un hueco de carga — es el fondo de la pantalla y el plan B
// si el mapa nunca llega.
const CapaMapa = dynamic(() => import("./CapaMapa"), { ssr: false });

const POR_ID: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.id, d])
);

// Es una maqueta: los CTA son botones de verdad (foco, teclado, estados) pero
// todavía no llevan a ningún sitio.
const SIN_DESTINO = () => {};

// ─── Botón ───────────────────────────────────────────────────────────────────
// Propio y no `@/components/Button` porque aquí el papel es oscuro: la variante
// `outline` compartida es tinta sobre tinta, y la sombra de calcomanía (offset
// ink al 18%) no existe sobre un fondo casi negro. Se conservan las clases
// `crd-button` de globals, que son las que dan el despegue al hover y el hundido
// al pulsar.

function BotonGlobo({
  variante,
  icono,
  children,
  onClick,
}: {
  variante: "primario" | "fantasma";
  icono: IconName;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const piel =
    variante === "primario"
      ? "bg-mango text-white shadow-[0_3px_0_rgba(0,0,0,.45)] hover:shadow-[0_5px_0_rgba(0,0,0,.45)] active:shadow-[0_1px_0_rgba(0,0,0,.45)]"
      : "border-2 border-white/45 bg-white/[.06] text-white hover:border-white/80 hover:bg-white/[.14]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`crd-button inline-flex h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-[15px] text-[13.5px] font-bold transition-[transform,box-shadow,background-color,border-color] duration-200 desk:h-14 desk:px-[26px] desk:text-base ${piel}`}
    >
      <Icon name={icono} className="text-lg desk:text-feature" />
      {children}
    </button>
  );
}

// ─── Ficha del destino señalado ──────────────────────────────────────────────

function FichaDestino({ d, compacta }: { d: Destination; compacta?: boolean }) {
  const meta = CATEGORY_META[d.category];

  return (
    <div className="flex items-center gap-3">
      <span
        className={`relative flex-none overflow-hidden rounded-tile bg-white/10 ${
          compacta ? "size-[54px]" : "size-[52px]"
        }`}
      >
        <Image
          src={d.image}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-copy font-bold text-white">{d.name}</span>
          <span className="flex flex-none items-center gap-0.5 font-mono text-mini font-bold text-mango">
            <Icon name="star" className="text-sm" />
            {d.rating.toFixed(1)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-[.1em] text-white/72">
          <span
            aria-hidden="true"
            className="size-[7px] flex-none rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <span className="truncate">
            {d.province} · {meta.label}
          </span>
        </span>
        <span className="mt-1 block truncate font-mono text-micro text-white/65">
          {grados(d.coords[1], d.coords[0])}
        </span>
      </span>
    </div>
  );
}

// ─── Contadores ──────────────────────────────────────────────────────────────

function Contadores() {
  const filas: [string, string][] = [
    [String(TOTAL_DESTINOS), "destinos"],
    [String(TOTAL_PROVINCIAS), "provincias"],
    [String(TOTAL_CATEGORIAS), "categorías"],
  ];

  return (
    <dl className="m-0 grid grid-cols-3 divide-x divide-white/14 border-y border-white/14">
      {filas.map(([n, etiqueta]) => (
        // flex-col-reverse: el número manda visualmente, pero en el DOM el
        // <dt> tiene que ir antes que su <dd>.
        <div key={etiqueta} className="flex flex-col-reverse gap-0.5 py-2 pl-3 first:pl-0">
          <dt className="font-mono text-micro font-bold uppercase tracking-[.12em] text-white/65">
            {etiqueta}
          </dt>
          <dd className="m-0 font-mono text-[21px] font-bold leading-none text-white desk:text-[24px]">
            {n}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Pantalla ────────────────────────────────────────────────────────────────

export default function PantallaGlobo() {
  const [activo, setActivo] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);

  // Estables: se los pasamos al mapa, que los usa dentro de efectos.
  const alActivo = useCallback((id: string | null) => setActivo(id), []);
  const alVista = useCallback((v: Vista) => setVista(v), []);

  const destino = activo ? POR_ID[activo] : null;
  const coordenadas = useMemo(() => grados(vista.lat, vista.lng), [vista]);

  return (
    <main className={`${s.pantalla} relative min-h-dvh w-full overflow-hidden bg-ink-2`}>
      {/* Lienzo pintado: fondo real de la pantalla y plan B del mapa. */}
      <div aria-hidden="true" className={s.lienzo} />

      {/* El país a sangre completa. */}
      <div className="absolute inset-0">
        <CapaMapa activo={activo} onActivo={alActivo} onVista={alVista} />
      </div>

      {/* Viñeta + caída de luz hacia el panel. */}
      <div aria-hidden="true" className={s.velo} />

      {/* ── Instrumento de a bordo: dónde está la cámara, en vivo ─────────── */}
      <div
        className={`${s.instrumento} animate-slide-up absolute right-[clamp(20px,4vw,64px)] top-[clamp(16px,3vh,30px)] z-20 rounded-chip px-3 py-2 max-desk:left-3 max-desk:right-auto max-desk:top-[calc(env(safe-area-inset-top)+12px)] max-desk:px-2.5 max-desk:py-1.5`}
        style={{ animationDelay: ".5s" }}
      >
        <p className="m-0 font-mono text-micro font-bold uppercase tracking-[.14em] text-white/65">
          Centro del mapa
        </p>
        <p className="m-0 mt-1 font-mono text-tiny font-bold tabular-nums text-white max-desk:text-mini">
          {coordenadas}
        </p>
        <p className="m-0 mt-0.5 font-mono text-micro text-white/65 max-desk:hidden">
          z {vista.zoom.toFixed(2)} · arrastra el país
        </p>
      </div>

      {/* ── Panel de cristal ───────────────────────────────────────────────── */}
      <section
        className={`${s.panel} absolute left-[clamp(20px,4vw,64px)] top-1/2 z-20 w-[min(452px,40vw)] -translate-y-1/2 rounded-panel p-[22px]
          max-desk:inset-x-0 max-desk:bottom-0 max-desk:top-auto max-desk:w-auto max-desk:translate-y-0 max-desk:rounded-b-none max-desk:px-5 max-desk:pb-[calc(56px+env(safe-area-inset-bottom))] max-desk:pt-[18px]`}
      >
        {/* Móvil: la ficha del destino tocado flota justo encima de la hoja.
            En desktop vive dentro del panel, más abajo. */}
        {destino && (
          <div
            className={`${s.panel} animate-slide-up absolute inset-x-3 bottom-full mb-3 rounded-panel p-3 desk:hidden`}
          >
            <FichaDestino d={destino} compacta />
            <button
              type="button"
              onClick={() => setActivo(null)}
              aria-label="Cerrar el detalle del destino"
              className="absolute right-2 top-2 grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-white/10 p-0 text-white/72 transition-colors hover:bg-white/20 hover:text-white"
            >
              <Icon name="close" className="text-base" />
            </button>
          </div>
        )}

        <div
          className="animate-slide-up flex flex-wrap items-center gap-x-3.5 gap-y-2.5"
          style={{ animationDelay: ".04s" }}
        >
          {/* La letra del logo es tinta oscura: sobre el cristal necesita su
              propio papel crema. */}
          <span className={`${s.chipLogo} block rounded-tile p-2.5 max-desk:p-[7px]`}>
            <Image
              src="/assets/logo.png"
              alt="ConoceRD — Descubre Lo Nuestro"
              width={760}
              height={363}
              priority
              sizes="(max-width: 899px) 112px, 164px"
              className="block h-auto w-[112px] desk:w-[164px]"
            />
          </span>
          <Kicker icon="explore" tone="on-ink">
            República Dominicana
          </Kicker>
        </div>

        <h1
          className="animate-slide-up m-0 mt-4 font-display text-[clamp(28px,7.2vw,33px)] font-bold leading-[1.04] tracking-[-.015em] text-white desk:mt-4 desk:text-[clamp(33px,3.05vw,43px)]"
          style={{ animationDelay: ".1s" }}
        >
          El país entero,{" "}
          {/* En móvil el <em> pasa a bloque: fuerza el corte exactamente aquí y
              evita el "parada" huérfano en la tercera línea. */}
          <em className="crd-accent-on-ink max-desk:block">parada por parada</em>
        </h1>

        <p
          className="animate-slide-up m-0 mt-2.5 text-[14px] leading-[1.45] text-white/80 desk:mt-3 desk:text-lead desk:leading-[1.5]"
          style={{ animationDelay: ".16s" }}
        >
          Playas sin gente, montañas frías y comida de la buena. Toca un pin y
          arma tu ruta con kilómetros de verdad.
        </p>

        <div
          className="animate-slide-up mt-4 flex flex-wrap gap-2.5 desk:mt-5 desk:gap-3"
          style={{ animationDelay: ".22s" }}
        >
          <BotonGlobo variante="primario" icono="download" onClick={SIN_DESTINO}>
            Descargar la app
          </BotonGlobo>
          <BotonGlobo variante="fantasma" icono="storefront" onClick={SIN_DESTINO}>
            Soy un negocio
          </BotonGlobo>
        </div>

        <div className="animate-slide-up mt-4 desk:mt-5" style={{ animationDelay: ".28s" }}>
          <Contadores />
        </div>

        {/* Desktop: la ficha del pin señalado. Alto fijo para que señalar un pin
            no mueva ni un píxel del resto del panel. */}
        <div
          className={`${s.instrumento} animate-slide-up mt-4 hidden h-[72px] items-center rounded-card px-3.5 desk:flex`}
          style={{ animationDelay: ".34s" }}
        >
          {destino ? (
            <div className="w-full">
              <FichaDestino d={destino} />
            </div>
          ) : (
            <p className="m-0 flex items-center gap-2.5 text-copy leading-[1.45] text-white/72">
              <Icon name="location_on" className="flex-none text-feature text-mint" />
              Pasa por un pin del mapa y te cuento qué hay ahí.
            </p>
          )}
        </div>

        {/* Pista de que la página continúa: el sitio es un recorrido. */}
        <div className="mt-3.5 flex items-end justify-between gap-3 desk:mt-4">
          <button
            type="button"
            onClick={SIN_DESTINO}
            className="group flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
          >
            <span className="font-mono text-micro font-bold uppercase tracking-[.14em] text-white/72 transition-colors group-hover:text-white">
              El recorrido sigue abajo
            </span>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-[18px] flex-none transition-transform duration-200 group-hover:translate-y-1"
            >
              <polyline
                points="5,8 12,16 19,8"
                fill="none"
                stroke="#FF8D16"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="sr-only">Bajar al primer capítulo del recorrido</span>
          </button>

          <p className="m-0 flex-none font-mono text-[9.5px] leading-none text-white/55">
            © OpenStreetMap · CARTO
          </p>
        </div>
      </section>
    </main>
  );
}
