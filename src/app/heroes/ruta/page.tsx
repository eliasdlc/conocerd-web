import type { Metadata } from "next";
import Image from "next/image";

import BrandPin from "@/components/BrandPin";
import Button from "@/components/Button";
import Icon from "@/components/Icon";

import s from "./estilos.module.css";
import { PARADAS } from "./paradas";
import {
  COLA,
  OVALO_CTA,
  ROSA_CIRCULO,
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
//  Propuesta de primera pantalla — "Ruta trazada".
//
//  La pantalla no ILUSTRA un itinerario: es uno. Un trazo a mano cruza el papel
//  uniendo cuatro paradas reales (tres en móvil), pasa por debajo del titular
//  —cruza la palabra "ruta"— y termina en el CTA, que es el destino. Más allá
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

export default function RutaTrazada() {
  return (
    <main className={s.hoja}>
      {/* ── Marca + hoja de ruta ─────────────────────────────────────────── */}
      <header className={`${s.cabecera} ${s.entra}`}>
        <Image
          src="/assets/logo.png"
          alt="ConoceRD — Descubre Lo Nuestro"
          width={760}
          height={363}
          priority
          sizes="(max-width: 899px) 134px, 178px"
          className="block h-auto w-[134px] desk:w-[178px]"
        />
        <p
          className={`m-0 text-right font-mono text-micro font-bold uppercase leading-[1.75] tracking-[.16em] text-muted-2 ${s.halo}`}
        >
          Itinerario n.º 01
          <br />
          <span className="text-muted">De Pedernales a Samaná</span>
        </p>
      </header>

      {/* ── Titular ──────────────────────────────────────────────────────── */}
      <h1
        className={`${s.titular} ${s.halo} ${s.entra} font-display text-[clamp(34px,5.4vw,78px)] font-bold leading-[1.03] tracking-[-.02em] text-ink-2`}
        style={vars({ "--d": "0.08s" })}
      >
        Un país entero
        <br />
        en una sola <em className="crd-accent">ruta</em>
      </h1>

      <p
        className={`${s.bajada} ${s.halo} ${s.entra} text-[clamp(15px,1.25vw,17.5px)] leading-[1.55] text-muted`}
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
          <path
            d={TRAZO_MOVIL}
            pathLength={1}
            className={s.linea}
            style={vars({ "--dur": `${DUR_MOVIL}s`, "--ini": `${INICIO}s` })}
            stroke="#264653"
            strokeOpacity={0.12}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1.5 3)"
          />
          <path
            d={TRAZO_MOVIL}
            pathLength={1}
            className={s.linea}
            style={vars({ "--dur": `${DUR_MOVIL}s`, "--ini": `${INICIO}s` })}
            stroke="#FF8D16"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
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
          <path
            d={TRAZO_DESK}
            pathLength={1}
            className={s.linea}
            style={vars({ "--dur": `${DUR_DESK}s`, "--ini": `${INICIO}s` })}
            stroke="#264653"
            strokeOpacity={0.085}
            strokeWidth={5.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(1.5 3.5)"
          />
          <path
            d={TRAZO_DESK}
            pathLength={1}
            className={s.linea}
            style={vars({ "--dur": `${DUR_DESK}s`, "--ini": `${INICIO}s` })}
            stroke="#FF8D16"
            strokeWidth={3.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Rosa de los vientos: el instrumento que acompaña a toda carta
            dibujada. Llena el hueco que abraza el arco de la ruta. */}
        <svg className={s.rosa} viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <path d={ROSA_CIRCULO} stroke="#264653" strokeWidth={1.4} strokeLinecap="round" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path
              key={a}
              d={`M50 8.6 V${a % 90 === 0 ? 15.5 : 12.4}`}
              stroke="#264653"
              strokeWidth={a % 90 === 0 ? 1.5 : 1}
              strokeLinecap="round"
              transform={`rotate(${a} 50 50)`}
            />
          ))}
          {/* Aguja: rombo largo norte-sur, con el norte entintado en coral. */}
          <path d="M50 18 L57.5 48 L50 82 L42.5 48 Z" stroke="#264653" strokeWidth={1.2} strokeLinejoin="round" />
          <path d="M50 18 L57.5 48 L50 48 Z" fill="#F76C4D" fillOpacity={0.85} />
          <path d="M20 50 L47 45.5 L80 50 L47 54.5 Z" stroke="#264653" strokeWidth={1} strokeLinejoin="round" opacity={0.45} />
          <text
            x="50"
            y="5.6"
            textAnchor="middle"
            fontFamily="var(--font-mono), ui-monospace, monospace"
            fontSize="9"
            fontWeight="700"
            fill="#264653"
          >
            N
          </text>
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
                <span className="block font-mono text-micro font-bold uppercase tracking-[.14em] text-muted-2">
                  {p.numeroMovil ? (
                    <>
                      <span className="desk:hidden">{p.numeroMovil}</span>
                      <span className="hidden desk:inline">{p.numero}</span>
                    </>
                  ) : (
                    p.numero
                  )}
                  <span aria-hidden="true" className="px-1 opacity-45">
                    ·
                  </span>
                  {p.destino.province}
                </span>
                <span className="mt-[3px] block text-[15px] font-semibold leading-[1.15] text-ink desk:text-[16.5px]">
                  {p.destino.name}
                </span>
                <span className="mt-[1px] block font-hand text-[19px] font-bold leading-[1.15] text-mint-ink desk:text-[21px]">
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
          className={`m-0 mb-2.5 font-hand text-[clamp(23px,2vw,31px)] font-bold leading-[1.1] text-coral-ink ${s.halo}`}
        >
          y desde aquí, sigues tú
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
                stroke="#B23410"
                strokeOpacity={0.72}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <Button variant="outline" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      {/* Pie de lámina: ocupa el margen inferior izquierdo que el trazo deja
          libre y firma la hoja. */}
      <p
        className={`${s.margen} ${s.entra} m-0 font-mono text-micro font-bold uppercase leading-[1.6] tracking-[.16em] text-muted-2`}
        style={vars({ "--d": "1.5s" })}
      >
        Trazado a mano
        <br />
        <span className="opacity-70">desde Santiago de los Caballeros</span>
      </p>

      {/* ── La página continúa: el trazo se va punteado fuera de pantalla ── */}
      <div className={`${s.cola} ${s.entra}`} style={vars({ "--d": "2.3s" })}>
        {/* Sin dibujado: el patrón de puntos ya ocupa el stroke-dasharray, así
            que esta pieza entra con el fade del bloque, no trazándose. */}
        <svg
          viewBox="0 0 60 150"
          fill="none"
          aria-hidden="true"
          className="h-[44px] w-[24px] desk:h-[88px] desk:w-[38px]"
        >
          <path
            d={COLA}
            pathLength={1}
            stroke="#FF8D16"
            strokeOpacity={0.8}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray="0.014 0.05"
          />
        </svg>
        <span className="inline-flex items-center gap-1.5 font-mono text-micro font-bold uppercase tracking-[.16em] text-muted-2">
          El recorrido sigue
          <Icon name="arrow_downward" className="text-[13px] text-coral-ink" />
        </span>
      </div>
    </main>
  );
}
