// ─────────────────────────────────────────────────────────────────────────────
//  Persistencia de la lista de espera.
//
//  Una sola interfaz, dos implementaciones: Neon Postgres cuando existe
//  `DATABASE_URL`, y un archivo local (`.waitlist/subscribers.json`) cuando no.
//  Así F1–F4 se desarrollan y se prueban sin aprovisionar nada, y conectar Neon
//  es únicamente añadir la variable de entorno — el código de producto no cambia.
// ─────────────────────────────────────────────────────────────────────────────

import type { NeonQueryFunction } from "@neondatabase/serverless";

import type { Audience, BusinessType } from "./schema";

export type SubscriberInput = {
  email: string;
  audience: Audience;
  name?: string;
  businessName?: string;
  businessType?: BusinessType;
  whatsapp?: string;
  instagram?: string;
  ref?: string;
  consentAt: Date;
};

/** `created` = correo nuevo. `already_subscribed` = ya estaba (perfil actualizado). */
export type SaveStatus = "created" | "already_subscribed";

/**
 * El `id` es el número de fundador: se asigna una vez, al insertar, y no cambia
 * nunca. Sale del alta —y no de un contador aparte— porque cualquier otra
 * cuenta se puede desincronizar, y este número va impreso en un correo que la
 * persona guarda y firmado dentro de su código.
 */
export type SaveResult = { status: SaveStatus; id: number };

/** Una fila tal como la lee el panel interno. Fechas en ISO: cruzan el límite servidor→cliente. */
export type Subscriber = {
  /** Número de fundador. Ver `SaveResult`. */
  id: number;
  email: string;
  audience: Audience;
  name: string | null;
  businessName: string | null;
  businessType: BusinessType | null;
  whatsapp: string | null;
  instagram: string | null;
  ref: string | null;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
};

export interface WaitlistStore {
  readonly kind: "neon" | "local";
  save(input: SubscriberInput): Promise<SaveResult>;
  /** Todos los registros, del más reciente al más antiguo. */
  list(): Promise<Subscriber[]>;
}

// ─── Neon Postgres ────────────────────────────────────────────────────────────

const CREATE_TABLE = `
  create table if not exists waitlist_subscribers (
    id            bigserial primary key,
    email         text        not null unique,
    audience      text        not null,
    name          text,
    business_name text,
    business_type text,
    whatsapp      text,
    ref           text,
    consent_at    timestamptz not null,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
  )
`;

// Migraciones idempotentes para tablas que ya existen en producción. `create
// table if not exists` no toca una tabla creada antes de que el campo existiera,
// así que cada columna añadida después necesita su propio `alter`.
const MIGRATIONS = [
  `alter table waitlist_subscribers add column if not exists instagram text`,
];

function createNeonStore(databaseUrl: string): WaitlistStore {
  // Import perezoso: el driver sólo se carga si de verdad hay base de datos.
  let ready: Promise<NeonQueryFunction<false, false>> | null = null;

  async function sql() {
    if (!ready) {
      ready = (async () => {
        const { neon } = await import("@neondatabase/serverless");
        const client = neon(databaseUrl);
        await client.query(CREATE_TABLE);
        for (const migration of MIGRATIONS) await client.query(migration);
        return client;
      })();
    }
    return ready;
  }

  return {
    kind: "neon",
    async save(input) {
      const q = await sql();
      // `xmax = 0` distingue INSERT de UPDATE en un upsert de Postgres: en una
      // fila recién insertada xmax vale 0. Evita un SELECT previo (y su carrera).
      // Los campos nuevos sólo pisan si vienen con valor: quien se apuntó como
      // viajero y luego registra su negocio conserva lo anterior.
      const rows = await q`
        insert into waitlist_subscribers
          (email, audience, name, business_name, business_type, whatsapp, instagram, ref, consent_at)
        values (
          ${input.email}, ${input.audience}, ${input.name ?? null},
          ${input.businessName ?? null}, ${input.businessType ?? null},
          ${input.whatsapp ?? null}, ${input.instagram ?? null},
          ${input.ref ?? null}, ${input.consentAt.toISOString()}
        )
        on conflict (email) do update set
          audience      = excluded.audience,
          name          = coalesce(excluded.name, waitlist_subscribers.name),
          business_name = coalesce(excluded.business_name, waitlist_subscribers.business_name),
          business_type = coalesce(excluded.business_type, waitlist_subscribers.business_type),
          whatsapp      = coalesce(excluded.whatsapp, waitlist_subscribers.whatsapp),
          instagram     = coalesce(excluded.instagram, waitlist_subscribers.instagram),
          ref           = coalesce(waitlist_subscribers.ref, excluded.ref),
          updated_at    = now()
        returning id, (xmax = 0) as inserted
      `;
      return {
        status: rows[0]?.inserted ? "created" : "already_subscribed",
        id: Number(rows[0]?.id),
      };
    },

    async list() {
      const q = await sql();
      const rows = await q`
        select id, email, audience, name, business_name, business_type, whatsapp,
               instagram, ref, consent_at, created_at, updated_at
        from waitlist_subscribers
        order by created_at desc
      `;
      return (rows as Record<string, unknown>[]).map(
        (r): Subscriber => ({
          id: Number(r.id),
          email: String(r.email),
          audience: r.audience as Audience,
          name: (r.name as string) ?? null,
          businessName: (r.business_name as string) ?? null,
          businessType: (r.business_type as BusinessType) ?? null,
          whatsapp: (r.whatsapp as string) ?? null,
          instagram: (r.instagram as string) ?? null,
          ref: (r.ref as string) ?? null,
          consentAt: isoDate(r.consent_at),
          createdAt: isoDate(r.created_at),
          updatedAt: isoDate(r.updated_at),
        })
      );
    },
  };
}

/** El driver devuelve `Date` para timestamptz; el panel sólo maneja ISO. */
function isoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

// ─── Archivo local (desarrollo) ───────────────────────────────────────────────

type LocalRow = Omit<SubscriberInput, "consentAt"> & {
  /** El equivalente al `bigserial` de Neon. Ver `SaveResult`. */
  id: number;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
};

function createLocalStore(): WaitlistStore {
  // Serializa las escrituras: sin esto, dos envíos simultáneos leen el mismo
  // archivo y el segundo pisa al primero.
  let queue: Promise<unknown> = Promise.resolve();

  async function readRows(): Promise<LocalRow[]> {
    const fs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const file = nodePath.join(process.cwd(), ".waitlist", "subscribers.json");
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as LocalRow[];
    } catch {
      // Aún no hay registros: el archivo no existe.
      return [];
    }
  }

  return {
    kind: "local",
    save(input) {
      const run = queue.then(async (): Promise<SaveResult> => {
        const fs = await import("node:fs/promises");
        const nodePath = await import("node:path");
        const dir = nodePath.join(process.cwd(), ".waitlist");
        const file = nodePath.join(dir, "subscribers.json");
        const rows = await readRows();
        const now = new Date().toISOString();
        const existing = rows.findIndex((r) => r.email === input.email);
        // Como el `bigserial` de Neon: el mayor visto + 1, nunca reutilizado.
        // `rows.length` no vale — borrar una fila repetiría un número.
        const id =
          existing >= 0
            ? rows[existing].id
            : rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1;
        const row: LocalRow = {
          ...input,
          id,
          consentAt: input.consentAt.toISOString(),
          createdAt: existing >= 0 ? rows[existing].createdAt : now,
          updatedAt: now,
        };
        if (existing >= 0) {
          rows[existing] = { ...rows[existing], ...row, ref: rows[existing].ref ?? row.ref };
        } else {
          rows.push(row);
        }
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8");
        return { status: existing >= 0 ? "already_subscribed" : "created", id };
      });
      queue = run.catch(() => {});
      return run;
    },

    async list() {
      const rows = await readRows();
      return rows
        .map(
          (r): Subscriber => ({
            id: r.id,
            email: r.email,
            audience: r.audience,
            name: r.name ?? null,
            businessName: r.businessName ?? null,
            businessType: r.businessType ?? null,
            whatsapp: r.whatsapp ?? null,
            instagram: r.instagram ?? null,
            ref: r.ref ?? null,
            consentAt: r.consentAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          })
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}

// ─── Selección ────────────────────────────────────────────────────────────────

let cached: WaitlistStore | null = null;

export function getWaitlistStore(): WaitlistStore {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    cached = url ? createNeonStore(url) : createLocalStore();
  }
  return cached;
}
