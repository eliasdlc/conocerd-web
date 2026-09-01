"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Panel interno de la lista de espera.
//
//  Lo lee gente que quiere responder tres preguntas en diez segundos: cuántos
//  somos, de qué tipo, y a quién hay que escribirle. Por eso el orden es
//  totales → ritmo → composición → filas, y no una tabla gigante arriba.
//
//  Los datos llegan ya resueltos desde el servidor; aquí sólo vive el estado de
//  búsqueda y filtro, que no vale una vuelta al servidor.
//
//  Era la única superficie del repo fuera del sistema: estilos en línea, la
//  familia de etiqueta escrita en literal y tres tonos de gris a mano. No
//  inventa nada propio: adopta las piezas del panel de negocios, porque es un
//  panel.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import Image from "next/image";

import Icon from "@/components/Icon";
import type { Audience } from "@/lib/waitlist/constants";
import { businessTypeLabel } from "@/lib/waitlist/business-types";
import type { Subscriber } from "@/lib/waitlist/store";
import type { Bucket, WaitlistStats } from "@/lib/waitlist/stats";
import { logout } from "./actions";

/** Card del panel: superficie apoyada, radio 22, una sola sombra. */
const CARD = "rounded-surface border border-line bg-paper px-[18px] py-4 shadow-e1";
const HEADING = "m-0 mb-3 font-label text-copy font-bold tracking-[-.01em] text-ink";
/** Secundaria del panel: 40 de alto, papel con hairline. */
const ACTION =
  "inline-flex h-10 cursor-pointer items-center gap-[7px] rounded-full border border-line bg-paper px-4 font-label text-copy font-bold text-ink no-underline";
const EMPTY = "m-0 text-copy text-muted";
const LINK = "text-mint-ink no-underline";
const DASH = <span className="text-muted-2">sin dato</span>;

const DATE_TIME = new Intl.DateTimeFormat("es-DO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santo_Domingo",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "sin fecha" : DATE_TIME.format(d);
}

// ─── Piezas ───────────────────────────────────────────────────────────────────

/** La cifra va en la familia de titular: es el dato, no una etiqueta. El tono
 *  dice de qué audiencia habla, y es el mismo del resto del producto: negocio
 *  es mango, no coral. */
function Kpi({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "ink" | "mint" | "mango";
}) {
  const color =
    tone === "mint" ? "text-mint-ink" : tone === "mango" ? "text-mango-ink" : "text-ink";
  return (
    <div className={CARD}>
      <div className="text-tiny font-semibold tracking-[.02em] text-muted">{label}</div>
      <div
        className={`mt-0.5 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-.03em] ${color}`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-tiny text-muted">{hint}</div>}
    </div>
  );
}

/** Barras horizontales: comparan categorías con etiquetas largas mejor que un pastel. */
function BarList({ buckets, total, empty }: { buckets: Bucket[]; total: number; empty: string }) {
  if (buckets.length === 0) return <p className={EMPTY}>{empty}</p>;
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <ul className="m-0 grid list-none gap-[9px] p-0">
      {buckets.map((b) => (
        <li key={b.key}>
          <div className="flex justify-between gap-2.5 text-copy text-ink">
            <span className="truncate">{b.label}</span>
            <span className="flex-none text-muted">
              {b.count}
              {total > 0 && ` · ${Math.round((b.count / total) * 100)}%`}
            </span>
          </div>
          {/* Tono pleno, sin degradado: una barra es un gráfico, y un gráfico
              con degradado dice que el valor cambia a lo largo de la barra. */}
          <div className="mt-1 h-[7px] overflow-hidden rounded-full bg-cream-2">
            <div
              className="h-full rounded-full bg-mint-ink"
              style={{ width: `${(b.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Ritmo de altas de los últimos 14 días. Los ceros importan tanto como los
 * picos, así que cada día tiene su barra aunque esté vacío.
 *
 * El eje sólo lleva el número del día: con la fecha completa bajo cada barra,
 * 14 etiquetas de "15 jul" no bajan de ~640 px y en un móvil de 390 empujaban
 * la página entera a lo ancho. El rango completo va en el pie del gráfico.
 */
function DailyChart({ daily }: { daily: Bucket[] }) {
  const max = Math.max(...daily.map((d) => d.count), 1);
  const hoy = daily[daily.length - 1]?.key;
  return (
    <>
      <div className="flex h-[92px] items-end gap-1">
        {daily.map((d) => (
          <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="min-h-[14px] text-mini font-bold text-mint-ink">{d.count || ""}</span>
            <div
              title={`${d.label}: ${d.count}`}
              className={`w-full rounded-[4px] ${
                d.count === 0
                  ? "bg-line"
                  : d.key === hoy
                    ? "bg-selected"
                    : "bg-mint-ink"
              }`}
              // Altura mínima visible: una barra de 0 px no se distingue de un
              // hueco, y hay que poder ver que ese día existió y quedó vacío.
              style={{ height: `${Math.max((d.count / max) * 60, 3)}px` }}
            />
            <span className="text-micro text-muted">{Number(d.key.slice(8))}</span>
          </div>
        ))}
      </div>
      <p className="m-0 mt-2 text-mini text-muted">
        {daily[0]?.label} a {daily[daily.length - 1]?.label} · zona horaria America/Santo_Domingo
      </p>
    </>
  );
}

/** La audiencia va como par de tono, la misma pareja que en todo el producto. */
function Pill({ audience }: { audience: Audience }) {
  const tone =
    audience === "negocio" ? "bg-mango-soft text-mango-ink" : "bg-mint-soft text-mint-ink";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-[9px] py-[3px] font-label text-mini font-extrabold uppercase tracking-[.04em] ${tone}`}
    >
      {audience}
    </span>
  );
}

const TH =
  "border-b border-line px-3 py-[9px] text-left font-label text-mini font-extrabold uppercase tracking-[.06em] text-muted whitespace-nowrap";
const TD = "border-b border-line px-3 py-2.5 align-top text-copy text-ink";

// ─── Panel ────────────────────────────────────────────────────────────────────

type Filter = "todos" | Audience;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "viajero", label: "Viajeros" },
  { key: "negocio", label: "Negocios" },
];

export default function AdminDashboard({
  rows,
  stats,
  storeKind,
}: {
  rows: Subscriber[];
  stats: WaitlistStats;
  storeKind: "neon" | "local";
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "todos" && r.audience !== filter) return false;
      if (!q) return true;
      return [r.email, r.name, r.businessName, r.instagram, r.whatsapp, r.ref]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,var(--color-cream)_0%,var(--color-cream-2)_100%)] px-[clamp(14px,4vw,32px)] pb-14 pt-7">
      <div className="mx-auto max-w-[1180px]">
        {/* ── Cabecera ── */}
        <header className="mb-5 flex flex-wrap items-end gap-3">
          <div className="flex-[1_1_240px]">
            <Image
              src="/assets/wordmark.svg"
              alt="ConoceRD"
              width={90}
              height={28}
              className="mb-2 h-7 w-auto"
            />
            <h1 className="m-0 font-display text-2xl font-extrabold tracking-[-.028em] text-ink">
              Lista de espera
            </h1>
            <p className="m-0 mt-[3px] text-copy text-muted">
              Registros de /lista ·{" "}
              {storeKind === "neon" ? "base de datos Neon" : "archivo local de desarrollo"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/export" className={ACTION}>
              <Icon name="download" className="text-lg" />
              CSV
            </a>
            <form action={logout}>
              <button type="submit" className={ACTION}>
                Salir
              </button>
            </form>
          </div>
        </header>

        {/* ── Totales ── */}
        <section className="mb-3.5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <Kpi label="Total registrados" value={stats.total} />
          <Kpi label="Viajeros" value={stats.byAudience.viajero} tone="mint" />
          <Kpi label="Negocios" value={stats.byAudience.negocio} tone="mango" />
          <Kpi
            label="Últimas 24 h"
            value={stats.last24h}
            hint={`${stats.last7d} en los últimos 7 días`}
          />
        </section>

        {/* ── Ritmo ── */}
        <section className={`${CARD} mb-3.5`}>
          <h2 className={HEADING}>Altas por día (últimos 14 días)</h2>
          <DailyChart daily={stats.daily} />
        </section>

        {/* ── Composición ── */}
        <section className="mb-3.5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          <div className={CARD}>
            <h2 className={HEADING}>Negocios por tipo</h2>
            <BarList
              buckets={stats.byBusinessType}
              total={stats.byAudience.negocio}
              empty="Todavía no se ha registrado ningún negocio."
            />
          </div>

          <div className={CARD}>
            <h2 className={HEADING}>De dónde vinieron</h2>
            <BarList buckets={stats.byRef} total={stats.total} empty="Sin registros todavía." />
          </div>

          <div className={CARD}>
            <h2 className={HEADING}>Contacto de los negocios</h2>
            {stats.byAudience.negocio === 0 ? (
              <p className={EMPTY}>Sin negocios registrados todavía.</p>
            ) : (
              <BarList
                buckets={[
                  { key: "ig", label: "Dieron Instagram", count: stats.businessesWithInstagram },
                  { key: "wa", label: "Dieron WhatsApp", count: stats.businessesWithWhatsapp },
                ]}
                total={stats.byAudience.negocio}
                empty=""
              />
            )}
          </div>
        </section>

        {/* ── Filas ── */}
        <section className="overflow-hidden rounded-surface border border-line bg-paper shadow-e1">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3.5">
            <div className="flex gap-1 rounded-full bg-cream-2 p-1">
              {FILTERS.map((f) => {
                const active = f.key === filter;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    aria-pressed={active}
                    className={`h-8 cursor-pointer rounded-full border-none px-3.5 font-label text-copy font-bold ${
                      active ? "bg-selected text-on-selected" : "bg-transparent text-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Borde `muted-2`: el gris #98A3A9 de antes daba 2.58:1 contra el
                papel y el buscador no tenía canto. */}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por correo, negocio, Instagram…"
              aria-label="Buscar registros"
              className="h-10 min-w-0 flex-[1_1_200px] rounded-full border border-muted-2 bg-paper px-3.5 font-sans text-[14px] text-ink placeholder:text-muted"
            />

            <span className="whitespace-nowrap text-copy text-muted">
              {visible.length} de {rows.length}
            </span>
          </div>

          {/* La tabla no cabe en un móvil: scrollea ella, no la página. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Contacto</th>
                  <th className={TH}>Tipo</th>
                  <th className={TH}>Negocio</th>
                  <th className={TH}>Instagram</th>
                  <th className={TH}>WhatsApp</th>
                  <th className={TH}>Origen</th>
                  <th className={TH}>Registro</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.email}>
                    <td className={TD}>
                      <a href={`mailto:${r.email}`} className={LINK}>
                        {r.email}
                      </a>
                      {r.name && <div className="text-tiny text-muted">{r.name}</div>}
                    </td>
                    <td className={TD}>
                      <Pill audience={r.audience} />
                    </td>
                    <td className={TD}>
                      {r.businessName ?? DASH}
                      {r.businessType && (
                        <div className="text-tiny text-muted">
                          {businessTypeLabel(r.businessType)}
                          {/* Lo que escribió cuando el catálogo no lo tenía: es
                              el dato que dice qué tipo nos falta. */}
                          {r.businessTypeOther && ` · ${r.businessTypeOther}`}
                        </div>
                      )}
                    </td>
                    <td className={TD}>
                      {r.instagram ? (
                        <a
                          href={`https://instagram.com/${r.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK}
                        >
                          @{r.instagram}
                        </a>
                      ) : (
                        DASH
                      )}
                    </td>
                    <td className={TD}>
                      {r.whatsapp ? (
                        <a
                          href={`https://wa.me/${r.whatsapp.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LINK}
                        >
                          {r.whatsapp}
                        </a>
                      ) : (
                        DASH
                      )}
                    </td>
                    <td className={TD}>
                      <span className="text-muted">{r.ref ?? "directo"}</span>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-muted`}>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className="m-0 px-4 py-7 text-center text-[14px] text-muted">
                {rows.length === 0
                  ? "Todavía no hay registros."
                  : "Ningún registro coincide con la búsqueda."}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
