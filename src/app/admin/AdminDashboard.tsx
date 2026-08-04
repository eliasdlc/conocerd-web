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
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";

import Icon from "@/components/Icon";
import { BUSINESS_TYPE_LABELS, type Audience, type BusinessType } from "@/lib/waitlist/schema";
import type { Subscriber } from "@/lib/waitlist/store";
import type { Bucket, WaitlistStats } from "@/lib/waitlist/stats";
import { logout } from "./actions";

const INK = "#1D3A45";
const TEXT = "#264653";
const MUTED = "#5B6B72";
const BORDER = "#EBE6D9";
const TEAL = "#0C6A60";
const ORANGE = "#B23410";

const CARD: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: "16px 18px",
};

const HEADING: React.CSSProperties = {
  margin: "0 0 12px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: "-.01em",
  color: INK,
};

const DATE_TIME = new Intl.DateTimeFormat("es-DO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santo_Domingo",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE_TIME.format(d);
}

// ─── Piezas ───────────────────────────────────────────────────────────────────

function Kpi({ label, value, hint, color }: { label: string; value: number; hint?: string; color: string }) {
  return (
    <div style={CARD}>
      <div style={{ color: MUTED, fontSize: 12, fontWeight: 600, letterSpacing: ".02em" }}>{label}</div>
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: 34,
          lineHeight: 1.1,
          letterSpacing: "-.03em",
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

/** Barras horizontales: comparan categorías con etiquetas largas mejor que un pastel. */
function BarList({ buckets, total, empty }: { buckets: Bucket[]; total: number; empty: string }) {
  if (buckets.length === 0) {
    return <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>{empty}</p>;
  }
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 9 }}>
      {buckets.map((b) => (
        <li key={b.key}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, color: TEXT }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</span>
            <span style={{ color: MUTED, flexShrink: 0 }}>
              {b.count}
              {total > 0 && ` · ${Math.round((b.count / total) * 100)}%`}
            </span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "#F5EFE2", marginTop: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${(b.count / max) * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg,#25CCB8,#0C6A60)",
              }}
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
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 92 }}>
        {daily.map((d) => (
          <div
            key={d.key}
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, minHeight: 14 }}>
              {d.count || ""}
            </span>
            <div
              title={`${d.label}: ${d.count}`}
              style={{
                width: "100%",
                // Altura mínima visible: una barra de 0 px no se distingue de un
                // hueco, y hay que poder ver que ese día existió y quedó vacío.
                height: `${Math.max((d.count / max) * 60, 3)}px`,
                borderRadius: 4,
                background: d.count ? "linear-gradient(180deg,#25CCB8,#0C6A60)" : "#EBE6D9",
              }}
            />
            <span style={{ fontSize: 10, color: MUTED }}>{Number(d.key.slice(8))}</span>
          </div>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 11.5 }}>
        {daily[0]?.label} — {daily[daily.length - 1]?.label} (hora de RD)
      </p>
    </>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "teal" | "orange" }) {
  const c = tone === "teal" ? { bg: "#C6F3EB", fg: TEAL } : { bg: "#FFE6C8", fg: "#985409" };
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        borderRadius: 999,
        padding: "3px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const TH: React.CSSProperties = {
  textAlign: "left",
  padding: "9px 12px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 700,
  fontSize: 11.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: MUTED,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${BORDER}`,
};

const TD: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: TEXT,
  borderBottom: `1px solid #F3EEE3`,
  verticalAlign: "top",
};

const LINK: React.CSSProperties = { color: TEAL, textDecoration: "none" };

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
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg,#FDF8F0 0%,#F5EFE2 100%)",
        padding: "28px clamp(14px,4vw,32px) 56px",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        {/* ── Cabecera ── */}
        <header
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: "1 1 240px" }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(24px,4vw,32px)",
                letterSpacing: "-.028em",
                color: INK,
              }}
            >
              Lista de espera
            </h1>
            <p style={{ margin: "3px 0 0", color: MUTED, fontSize: 13.5 }}>
              Registros de /lista ·{" "}
              {storeKind === "neon" ? "base de datos Neon" : "archivo local de desarrollo"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href="/api/admin/export"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                background: "#fff",
                border: `1px solid ${BORDER}`,
                color: TEXT,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 13.5,
                textDecoration: "none",
              }}
            >
              <Icon name="download" style={{ fontSize: 18 }} />
              Exportar CSV
            </a>
            <form action={logout}>
              <button
                type="submit"
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  background: "#fff",
                  border: `1px solid ${BORDER}`,
                  color: MUTED,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                }}
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        {/* ── Totales ── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <Kpi label="Total registrados" value={stats.total} color={INK} />
          <Kpi label="Viajeros" value={stats.byAudience.viajero} color={TEAL} />
          <Kpi label="Negocios" value={stats.byAudience.negocio} color={ORANGE} />
          <Kpi
            label="Últimas 24 h"
            value={stats.last24h}
            hint={`${stats.last7d} en los últimos 7 días`}
            color={INK}
          />
        </section>

        {/* ── Ritmo ── */}
        <section style={{ ...CARD, marginBottom: 14 }}>
          <h2 style={HEADING}>Altas por día (últimos 14 días)</h2>
          <DailyChart daily={stats.daily} />
        </section>

        {/* ── Composición ── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={CARD}>
            <h2 style={HEADING}>Negocios por tipo</h2>
            <BarList
              buckets={stats.byBusinessType}
              total={stats.byAudience.negocio}
              empty="Todavía no se ha registrado ningún negocio."
            />
          </div>

          <div style={CARD}>
            <h2 style={HEADING}>De dónde vinieron</h2>
            <BarList buckets={stats.byRef} total={stats.total} empty="Sin registros todavía." />
          </div>

          <div style={CARD}>
            <h2 style={HEADING}>Contacto de los negocios</h2>
            {stats.byAudience.negocio === 0 ? (
              <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
                Sin negocios registrados todavía.
              </p>
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
        <section style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              padding: "14px 16px",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ display: "flex", gap: 4, padding: 4, background: "#F5EFE2", borderRadius: 999 }}>
              {FILTERS.map((f) => {
                const active = f.key === filter;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    aria-pressed={active}
                    style={{
                      height: 32,
                      padding: "0 14px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      background: active ? TEXT : "transparent",
                      color: active ? "#fff" : MUTED,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por correo, negocio, Instagram…"
              aria-label="Buscar registros"
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: "#fff",
                color: TEXT,
                fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
                fontSize: 14,
                outline: "none",
              }}
            />

            <span style={{ color: MUTED, fontSize: 13, whiteSpace: "nowrap" }}>
              {visible.length} de {rows.length}
            </span>
          </div>

          {/* La tabla no cabe en un móvil: scrollea ella, no la página. */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={TH}>Contacto</th>
                  <th style={TH}>Tipo</th>
                  <th style={TH}>Negocio</th>
                  <th style={TH}>Instagram</th>
                  <th style={TH}>WhatsApp</th>
                  <th style={TH}>Origen</th>
                  <th style={TH}>Registro</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.email}>
                    <td style={TD}>
                      <a href={`mailto:${r.email}`} style={LINK}>
                        {r.email}
                      </a>
                      {r.name && <div style={{ color: MUTED, fontSize: 12 }}>{r.name}</div>}
                    </td>
                    <td style={TD}>
                      <Pill tone={r.audience === "negocio" ? "orange" : "teal"}>{r.audience}</Pill>
                    </td>
                    <td style={TD}>
                      {r.businessName ?? <span style={{ color: "#B9C1C4" }}>—</span>}
                      {r.businessType && (
                        <div style={{ color: MUTED, fontSize: 12 }}>
                          {BUSINESS_TYPE_LABELS[r.businessType as BusinessType] ?? r.businessType}
                        </div>
                      )}
                    </td>
                    <td style={TD}>
                      {r.instagram ? (
                        <a
                          href={`https://instagram.com/${r.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={LINK}
                        >
                          @{r.instagram}
                        </a>
                      ) : (
                        <span style={{ color: "#B9C1C4" }}>—</span>
                      )}
                    </td>
                    <td style={TD}>
                      {r.whatsapp ? (
                        <a
                          href={`https://wa.me/${r.whatsapp.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={LINK}
                        >
                          {r.whatsapp}
                        </a>
                      ) : (
                        <span style={{ color: "#B9C1C4" }}>—</span>
                      )}
                    </td>
                    <td style={TD}>
                      <span style={{ color: MUTED }}>{r.ref ?? "directo"}</span>
                    </td>
                    <td style={{ ...TD, whiteSpace: "nowrap", color: MUTED }}>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p style={{ margin: 0, padding: "28px 16px", textAlign: "center", color: MUTED, fontSize: 14 }}>
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
