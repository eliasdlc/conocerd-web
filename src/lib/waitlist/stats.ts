// ─────────────────────────────────────────────────────────────────────────────
//  Métricas derivadas de la lista de espera.
//
//  Se calculan en JS sobre todas las filas en vez de en SQL a propósito: el
//  volumen es de cientos de registros, y así el panel funciona igual contra Neon
//  que contra el archivo local de desarrollo, sin escribir dos veces cada
//  consulta. Si esto llegara a decenas de miles de filas, hay que mover los
//  agregados a la base — no antes.
// ─────────────────────────────────────────────────────────────────────────────

import { BUSINESS_TYPE_LABELS, type Audience, type BusinessType } from "./schema";
import type { Subscriber } from "./store";

/**
 * República Dominicana es UTC-4 todo el año (no aplica horario de verano), así
 * que "hoy" se puede resolver con un desplazamiento fijo. Sin esto, un registro
 * de las 9 de la noche cae en el día siguiente al agrupar por fecha UTC.
 */
const RD_OFFSET_MINUTES = -4 * 60;

/** Fecha local de RD en formato `YYYY-MM-DD`. */
export function rdDayKey(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t + RD_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

export type Bucket = { key: string; label: string; count: number };

export type WaitlistStats = {
  total: number;
  byAudience: Record<Audience, number>;
  /** Altas en las últimas 24 h y en los últimos 7 días. */
  last24h: number;
  last7d: number;
  /** Negocios con datos de contacto extra, para saber si vale la pena pedirlos. */
  businessesWithWhatsapp: number;
  businessesWithInstagram: number;
  byBusinessType: Bucket[];
  byRef: Bucket[];
  /** Últimos 14 días naturales de RD, del más antiguo al más reciente. */
  daily: Bucket[];
};

function tally(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

const DAY_LABEL = new Intl.DateTimeFormat("es-DO", { day: "numeric", month: "short" });

function dayLabel(key: string): string {
  // Mediodía UTC para que el formateo no se corra de día por la zona horaria
  // de quien esté mirando el panel.
  return DAY_LABEL.format(new Date(`${key}T12:00:00Z`));
}

export function computeStats(rows: Subscriber[], now = Date.now()): WaitlistStats {
  const businesses = rows.filter((r) => r.audience === "negocio");

  const byBusinessType = [...tally(businesses.map((r) => r.businessType ?? "otro"))]
    .map(([key, count]) => ({
      key,
      label: BUSINESS_TYPE_LABELS[key as BusinessType] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const byRef = [...tally(rows.map((r) => r.ref ?? "directo"))]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);

  // Serie completa de 14 días: los días sin registros tienen que aparecer en
  // cero, o el gráfico miente sobre el ritmo de altas.
  const perDay = tally(rows.map((r) => rdDayKey(r.createdAt)));
  const daily: Bucket[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = rdDayKey(new Date(now - i * 86_400_000).toISOString());
    daily.push({ key, label: dayLabel(key), count: perDay.get(key) ?? 0 });
  }

  const since = (ms: number) => rows.filter((r) => now - new Date(r.createdAt).getTime() <= ms).length;

  return {
    total: rows.length,
    byAudience: {
      viajero: rows.filter((r) => r.audience === "viajero").length,
      negocio: businesses.length,
    },
    last24h: since(86_400_000),
    last7d: since(7 * 86_400_000),
    businessesWithWhatsapp: businesses.filter((r) => r.whatsapp).length,
    businessesWithInstagram: businesses.filter((r) => r.instagram).length,
    byBusinessType,
    byRef,
    daily,
  };
}

// ─── Exportación ──────────────────────────────────────────────────────────────

/**
 * Una fila con lo que no está guardado: el código de fundador se deriva en el
 * servidor (ver `waitlist/founder.ts`), así que llega desde fuera en vez de
 * calcularse aquí — este módulo también lo usa el panel, que corre en el
 * navegador y no tiene el secreto ni `node:crypto`.
 */
export type CsvRow = Subscriber & { founderCode?: string | null };

const CSV_COLUMNS = [
  ["id", "N.º de fundador"],
  ["founderCode", "Código de fundador"],
  ["email", "Correo"],
  ["audience", "Audiencia"],
  ["name", "Nombre"],
  ["businessName", "Negocio"],
  ["businessType", "Tipo"],
  ["whatsapp", "WhatsApp"],
  ["instagram", "Instagram"],
  ["ref", "Origen"],
  ["consentAt", "Consentimiento"],
  ["createdAt", "Registro"],
] as const satisfies ReadonlyArray<readonly [keyof CsvRow, string]>;

/**
 * Un valor que empieza por `=`, `+`, `-` o `@` lo ejecuta Excel como fórmula al
 * abrir el CSV. Se prefija con comilla simple para neutralizarlo (CSV injection).
 */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: CsvRow[]): string {
  const header = CSV_COLUMNS.map(([, label]) => csvCell(label)).join(",");
  const body = rows.map((row) =>
    CSV_COLUMNS.map(([field]) => csvCell(String(row[field] ?? ""))).join(",")
  );
  // BOM para que Excel abra los acentos correctamente.
  return `﻿${[header, ...body].join("\r\n")}\r\n`;
}
