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
  ref?: string;
  consentAt: Date;
};

/** `created` = correo nuevo. `already_subscribed` = ya estaba (perfil actualizado). */
export type SaveResult = "created" | "already_subscribed";

export interface WaitlistStore {
  readonly kind: "neon" | "local";
  save(input: SubscriberInput): Promise<SaveResult>;
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

function createNeonStore(databaseUrl: string): WaitlistStore {
  // Import perezoso: el driver sólo se carga si de verdad hay base de datos.
  let ready: Promise<NeonQueryFunction<false, false>> | null = null;

  async function sql() {
    if (!ready) {
      ready = (async () => {
        const { neon } = await import("@neondatabase/serverless");
        const client = neon(databaseUrl);
        await client.query(CREATE_TABLE);
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
          (email, audience, name, business_name, business_type, whatsapp, ref, consent_at)
        values (
          ${input.email}, ${input.audience}, ${input.name ?? null},
          ${input.businessName ?? null}, ${input.businessType ?? null},
          ${input.whatsapp ?? null}, ${input.ref ?? null}, ${input.consentAt.toISOString()}
        )
        on conflict (email) do update set
          audience      = excluded.audience,
          name          = coalesce(excluded.name, waitlist_subscribers.name),
          business_name = coalesce(excluded.business_name, waitlist_subscribers.business_name),
          business_type = coalesce(excluded.business_type, waitlist_subscribers.business_type),
          whatsapp      = coalesce(excluded.whatsapp, waitlist_subscribers.whatsapp),
          ref           = coalesce(waitlist_subscribers.ref, excluded.ref),
          updated_at    = now()
        returning (xmax = 0) as inserted
      `;
      return rows[0]?.inserted ? "created" : "already_subscribed";
    },
  };
}

// ─── Archivo local (desarrollo) ───────────────────────────────────────────────

type LocalRow = Omit<SubscriberInput, "consentAt"> & {
  consentAt: string;
  createdAt: string;
  updatedAt: string;
};

function createLocalStore(): WaitlistStore {
  // Serializa las escrituras: sin esto, dos envíos simultáneos leen el mismo
  // archivo y el segundo pisa al primero.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    kind: "local",
    save(input) {
      const run = queue.then(async (): Promise<SaveResult> => {
        const fs = await import("node:fs/promises");
        const nodePath = await import("node:path");
        const dir = nodePath.join(process.cwd(), ".waitlist");
        const file = nodePath.join(dir, "subscribers.json");
        let rows: LocalRow[] = [];
        try {
          rows = JSON.parse(await fs.readFile(file, "utf8")) as LocalRow[];
        } catch {
          // Primer registro: el archivo aún no existe.
        }
        const now = new Date().toISOString();
        const existing = rows.findIndex((r) => r.email === input.email);
        const row: LocalRow = {
          ...input,
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
        return existing >= 0 ? "already_subscribed" : "created";
      });
      queue = run.catch(() => {});
      return run;
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
