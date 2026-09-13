import type { Metadata } from "next";
import Image from "next/image";

import BrandPin from "@/components/BrandPin";
import Button from "@/components/Button";

import s from "./estilos.module.css";
import { PARADAS } from "./paradas";
import {
  COLA,
  OVALO_CTA,
  PARADA_T_DESK,
  PARADA_T_MOVIL,
  TRAZO_DESK,
  TRAZO_MOVIL,
} from "./trazos";

export const metadata: Metadata = {
  title: "Ruta trazada",
  robots: { index: false, follow: false },
};

// ─────────────────────────────────────────────────────────────────────────────
//  Propuesta de primera pantalla: "Ruta trazada".
//
//  La pantalla no ILUSTRA un itinerario: es uno. Un trazo a mano cruza el papel
//  uniendo cuatro paradas reales (tres en móvil), pasa por debajo del titular
//  (cruza la palabra "ruta") y termina en el CTA, que es el destino. Más allá
//  del CTA el trazo continúa punteado fuera de pantalla: esa es la pista de que
//  la página sigue bajando.
//
//  Al cargar, la línea se DIBUJA y cada nodo entra justo cuando el trazo lo
//  alcanza (el retardo sale de la fracción de recorrido calculada en trazos.ts).
//  Cuando termina, todo queda quieto: no hay una sola animación en bucle.
//  Con `prefers-reduced-motion` la ruta aparece ya trazada.
//
//  Toda la maquetación vive en el CSS Module: no hay hooks ni matchMedia, así
//  que el primer frame ya sale con el reparto correcto.
// ─────────────────────────────────────────────────────────────────────────────

// Compás del dibujado (segundos). Móvil va más rápido: el trazo es más corto y
// el visitante de teléfono no espera dos segundos por una línea.
const INICIO = 0.5;
const DUR_DESK = 2.0;
const DUR_MOVIL = 1.45;

/** Retardo de un nodo = cuándo la punta del trazo pasa por encima de él. */
const retardo = (t: number, dur: number) => `${(INICIO + dur * t - 0.1).toFixed(2)}s`;

const vars = (o: Record<string, string | number>) => o as React.CSSProperties;

/** Sombra del trazo y trazo: el mismo path dos veces, tinta debajo y mango encima. */
function Trazo({ d, dur, sombraOpacidad, sombraAncho, ancho, sombraDesplazamiento }: {
  d: string;
  dur: number;
  sombraOpacidad: number;
  sombraAncho: number;
  ancho: number;
  sombraDesplazamiento: string;
}) {
  const estilo = vars({ "--dur": `${dur}s`, "--ini": `${INICIO}s` });
  return (
    <>
      <path
        d={d}
        pathLength={1}
        className={s.linea}
        style={estilo}
        stroke="var(--color-ink)"
        strokeOpacity={sombraOpacidad}
        strokeWidth={sombraAncho}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={sombraDesplazamiento}
      />
      <path
        d={d}
        pathLength={1}
        className={s.linea}
        style={estilo}
        stroke="var(--color-mango)"
        strokeWidth={ancho}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

export default function RutaTrazada() {
  return (
    <main className={s.hoja}>
      {/* ── Marca ─────────────────────────────────────────────────────────── */}
      <header className={`${s.cabecera} ${s.entra}`}>
        <Image
          src="/assets/logo.svg"
          alt="ConoceRD, descubre lo nuestro"
          width={1296}
          height={595}
          priority
          unoptimized
          className="block h-auto w-[134px] desk:w-[178px]"
        />
      </header>

      {/* ── Titular ──────────────────────────────────────────────────────── */}
      <h1
        className={`${s.titular} ${s.halo} ${s.entra} font-display text-[clamp(34px,5.2vw,74px)] font-extrabold leading-[1.03] tracking-[-.03em] text-ink`}
        style={{ ...vars({ "--d": "0.08s" }), fontVariationSettings: '"opsz" 96' }}
      >
        Un país entero
        <br />
        en una sola <em className="crd-accent">ruta</em>
      </h1>

      <p
        className={`${s.bajada} ${s.halo} ${s.entra} text-[clamp(15px,1.25vw,17.5px)] leading-[1.55] text-ink`}
        style={vars({ "--d": "0.2s" })}
      >
        Destinos reales, negocios de la zona y el camino que va de uno al otro.
        <span className="max-desk:hidden">
          {" "}
          Nosotros te armamos el recorrido; tú decides dónde te quedas.
        </span>
      </p>

      {/* ── El trazo y sus paradas ───────────────────────────────────────── */}
      <div className={s.lienzo}>
        {/* Móvil: serpentea en vertical y arranca por detrás de la bajada. */}
        <svg
          className={s.svgMovil}
          viewBox="0 0 340 300"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <Trazo
            d={TRAZO_MOVIL}
            dur={DUR_MOVIL}
            sombraOpacidad={0.12}
            sombraAncho={5}
            ancho={3.2}
            sombraDesplazamiento="translate(1.5 3)"
          />
        </svg>

        {/* Desktop: cruza el papel de lado a lado, por debajo del titular. */}
        <svg
          className={s.svgDesk}
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <Trazo
            d={TRAZO_DESK}
            dur={DUR_DESK}
            sombraOpacidad={0.085}
            sombraAncho={5.6}
            ancho={3.6}
            sombraDesplazamiento="translate(1.5 3.5)"
          />
        </svg>

        {/* Paradas. `soloDesk` cae en móvil: tres nodos respiran, cuatro no. */}
        {PARADAS.map((p, i) => {
          // El trazo móvil tiene su propia numeración de paradas: la que cae
          // no consume posición.
          const iMovil = PARADAS.slice(0, i).filter((x) => !x.soloDesk).length;
          const tMovil = p.soloDesk ? 0 : (PARADA_T_MOVIL[iMovil] ?? 0);
          return (
            <div
              key={p.destino.id}
              className={`${s.nodo} ${p.soloDesk ? s.soloDesk : ""}`}
              style={vars({
                "--dx": `${p.desk.x}%`,
                "--dy": `${p.desk.y}%`,
                "--mx": `${p.movil?.x ?? 0}%`,
                "--my": `${p.movil?.y ?? 0}%`,
                "--dd": retardo(PARADA_T_DESK[i], DUR_DESK),
                "--dm": retardo(tMovil, DUR_MOVIL),
              })}
            >
              <span className={s.pin}>
                <BrandPin size={30} color={p.color} />
              </span>

              <div
                className={`${s.etiqueta} ${s.halo}`}
                style={vars({
                  "--lx": `${p.etiqueta.x}px`,
                  "--ly": `${p.etiqueta.y}px`,
                  "--lw": `${p.etiqueta.ancho}px`,
                })}
              >
                {/* El número es información: las paradas van en orden de
                    viaje, de suroeste a nordeste. */}
                <span className="flex items-baseline gap-2 font-label text-micro font-extrabold uppercase tracking-[.14em] text-muted">
                  <span className="text-ink">
                    {p.numeroMovil ? (
                      <>
                        <span className="desk:hidden">{p.numeroMovil}</span>
                        <span className="hidden desk:inline">{p.numero}</span>
                      </>
                    ) : (
                      p.numero
                    )}
                  </span>
                  {p.destino.province}
                </span>
                <span className="mt-[3px] block font-display text-[17px] font-bold leading-[1.15] tracking-[-.02em] text-ink desk:text-[19px]">
                  {p.destino.name}
                </span>
                <span className="mt-[2px] block text-[13.5px] font-medium leading-[1.3] text-mint-ink desk:text-[14px]">
                  {p.nota}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── El destino: donde termina el trazo empiezan las acciones ─────── */}
      <div className={`${s.destino} ${s.entra}`} style={vars({ "--d": "1s" })}>
        <p
          className={`m-0 mb-3 font-display text-[clamp(20px,1.7vw,26px)] font-bold leading-[1.1] tracking-[-.02em] text-coral-ink ${s.halo}`}
        >
          Y desde aquí, sigues tú
        </p>

        <div className={s.botones}>
          <span className={s.envoltura}>
            <Button variant="primary" size="lg" icon="download">
              Descargar la app
            </Button>
            {/* El gesto de rodear el destino en un mapa impreso: se traza al
                final, cuando la línea ya llegó. */}
            <svg
              className={s.ovalo}
              viewBox="0 0 240 84"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
            >
              <path
                d={OVALO_CTA}
                pathLength={1}
                className={`${s.linea} ${s.ovaloLinea}`}
                stroke="var(--color-coral-ink)"
                strokeOpacity={0.72}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <Button variant="ghost" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      {/* ── La página continúa: el trazo se va punteado fuera de pantalla ── */}
      <div className={`${s.cola} ${s.entra}`} style={vars({ "--d": "2.3s" })} aria-hidden="true">
        {/* Sin dibujado: el patrón de puntos ya ocupa el stroke-dasharray, así
            que esta pieza entra con el fade del bloque, no trazándose. */}
        <svg viewBox="0 0 60 150" fill="none" className="h-[44px] w-[24px] desk:h-[88px] desk:w-[38px]">
          <path
            d={COLA}
            pathLength={1}
            stroke="var(--color-mango)"
            strokeOpacity={0.8}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray="0.014 0.05"
          />
        </svg>
      </div>
    </main>
  );
}
