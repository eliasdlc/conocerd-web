// ─────────────────────────────────────────────────────────────────────────────
//  Persistencia de la lista de espera.
//
//  Una sola interfaz, dos implementaciones: Neon Postgres cuando existe
//  `DATABASE_URL`, y un archivo local (`.waitlist/subscribers.json`) cuando no.
//  Así F1–F4 se desarrollan y se prueban sin aprovisionar nada, y conectar Neon
//  es únicamente añadir la variable de entorno — el código de producto no cambia.
// ─────────────────────────────────────────────────────────────────────────────

import type { Audience } from "./constants";
import type { BusinessType } from "./business-types";

export type SubscriberInput = {
  email: string;
  audience: Audience;
  name?: string;
  businessName?: string;
  businessType?: BusinessType;
  /** Texto libre que acompaña a `otro`: el tipo que el catálogo no tiene. */
  businessTypeOther?: string;
  whatsapp?: string;
  instagram?: string;
  ref?: string;
  consentAt: Date;
};

/** `created` = correo nuevo. `already_subscribed` = ya estaba (perfil actualizado). */
export type SaveResult = "created" | "already_subscribed";

/** Lo que devuelve un guardado: el estado y el número de fundador. El número
 *  es cuántas personas se habían registrado cuando entró esa, más una: lo
 *  reparte un contador atómico (ver `SQL_NUMERO`), es único por constraint y
 *  no cambia aunque la persona vuelva a registrarse. */
export type SaveOutcome = { status: SaveResult; numero: number };

/** Una fila tal como la lee el panel interno. Fechas en ISO: cruzan el límite servidor→cliente. */
export type Subscriber = {
  email: string;
  audience: Audience;
  name: string | null;
  businessName: string | null;
  businessType: BusinessType | null;
  businessTypeOther: string | null;
  whatsapp: string | null;
  instagram: string | null;
  ref: string | null;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
};

export interface WaitlistStore {
  readonly kind: "neon" | "local";
  save(input: SubscriberInput): Promise<SaveOutcome>;
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
    business_type_other text,
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
// ─── El número de fundador ───────────────────────────────────────────────────
//
// No sirve el `id`: `bigserial` deja huecos (un upsert que cae en conflicto
// consume el número igual), y el número tiene que ser "cuántos había antes,
// más uno". Se reparte con un contador de una sola fila: la fila queda
// bloqueada mientras dura la sentencia, así que diez registros a la vez se
// serializan y salen consecutivos. `numero` lleva UNIQUE como garantía dura de
// que dos personas nunca comparten uno, pase lo que pase con el contador.
//
// El reparto y la escritura van en UNA sentencia: si el proceso muere a mitad,
// no hay número consumido sin dueño. Y sólo corre para filas sin número, así
// que quien vuelve a registrarse no mueve el contador.
const MIGRATIONS = [
  `alter table waitlist_subscribers add column if not exists instagram text`,
  `alter table waitlist_subscribers add column if not exists business_type_other text`,
  `alter table waitlist_subscribers add column if not exists numero bigint unique`,
  `create table if not exists waitlist_contador (
    id smallint primary key check (id = 1),
    n  bigint not null
  )`,
  `insert into waitlist_contador (id, n) values (1, 0) on conflict (id) do nothing`,
  // Quien se registró antes de existir el número lo recibe por orden de
  // llegada. Idempotente: sólo toca filas sin número, y el contador nunca
  // baja del mayor número repartido.
  `with ordenados as (
     select email, row_number() over (order by created_at, id)
            + (select n from waitlist_contador where id = 1) as n
     from waitlist_subscribers where numero is null
   )
   update waitlist_subscribers s set numero = o.n from ordenados o where s.email = o.email`,
  `update waitlist_contador c
     set n = greatest(c.n, (select coalesce(max(numero), 0) from waitlist_subscribers))
   where id = 1`,
];

/** Reparte el siguiente número al correo dado, sólo si aún no tiene. Una sola
 *  sentencia: el contador se bloquea, sube y se escribe en la fila en el
 *  mismo instante. Devuelve una fila con `numero` si repartió, ninguna si no. */
export const SQL_NUMERO = `
  with reparto as (
    update waitlist_contador c
       set n = c.n + 1
      from waitlist_subscribers s
     where c.id = 1 and s.email = $1 and s.numero is null
    returning c.n
  )
  update waitlist_subscribers s
     set numero = reparto.n
    from reparto
   where s.email = $1 and s.numero is null
  returning s.numero
`;

/** Cualquier cliente Postgres que ejecute texto con parámetros y devuelva
 *  filas: el driver de Neon en producción, PGlite en las pruebas. */
export type QueryFn = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/** El upsert por correo. Los campos nuevos sólo pisan si vienen con valor:
 *  quien se apuntó como viajero y luego registra su negocio conserva lo
 *  anterior. `xmax = 0` distingue INSERT de UPDATE sin un SELECT previo. */
export const SQL_GUARDAR = `
  insert into waitlist_subscribers
    (email, audience, name, business_name, business_type, business_type_other,
     whatsapp, instagram, ref, consent_at)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  on conflict (email) do update set
    audience      = excluded.audience,
    name          = coalesce(excluded.name, waitlist_subscribers.name),
    business_name = coalesce(excluded.business_name, waitlist_subscribers.business_name),
    business_type = coalesce(excluded.business_type, waitlist_subscribers.business_type),
    business_type_other = coalesce(excluded.business_type_other, waitlist_subscribers.business_type_other),
    whatsapp      = coalesce(excluded.whatsapp, waitlist_subscribers.whatsapp),
    instagram     = coalesce(excluded.instagram, waitlist_subscribers.instagram),
    ref           = coalesce(waitlist_subscribers.ref, excluded.ref),
    updated_at    = now()
  returning (xmax = 0) as inserted, numero
`;

export const SQL_LISTAR = `
  select email, audience, name, business_name, business_type,
         business_type_other, whatsapp, instagram, ref, consent_at,
         created_at, updated_at
  from waitlist_subscribers
  order by created_at desc
`;

/** Crea la tabla y aplica las migraciones, en orden. Idempotente. */
export async function prepararEsquema(query: QueryFn): Promise<void> {
  await query(CREATE_TABLE);
  for (const migration of MIGRATIONS) await query(migration);
}

/** El almacén sobre Postgres, con el esquema ya preparado. */
export function createSqlStore(query: QueryFn): WaitlistStore {
  return {
    kind: "neon",
    async save(input) {
      const rows = await query(SQL_GUARDAR, [
        input.email,
        input.audience,
        input.name ?? null,
        input.businessName ?? null,
        input.businessType ?? null,
        input.businessTypeOther ?? null,
        input.whatsapp ?? null,
        input.instagram ?? null,
        input.ref ?? null,
        input.consentAt.toISOString(),
      ]);
      const status: SaveResult = rows[0]?.inserted ? "created" : "already_subscribed";
      // Alta nueva, o una fila antigua que se quedó sin número: se reparte.
      // Si ya lo tenía, la sentencia no devuelve nada y vale el que había.
      let numero = rows[0]?.numero == null ? null : Number(rows[0].numero);
      if (numero === null) {
        const repartido = await query(SQL_NUMERO, [input.email]);
        numero = Number(repartido[0]?.numero ?? 0);
      }
      return { status, numero };
    },

    async list() {
      const rows = await query(SQL_LISTAR);
      return rows.map(
        (r): Subscriber => ({
          email: r.email as string,
          audience: r.audience as Audience,
          name: (r.name as string) ?? null,
          businessName: (r.business_name as string) ?? null,
          businessType: (r.business_type as BusinessType) ?? null,
          businessTypeOther: (r.business_type_other as string) ?? null,
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

function createNeonStore(databaseUrl: string): WaitlistStore {
  // Import perezoso: el driver sólo se carga si de verdad hay base de datos.
  let ready: Promise<WaitlistStore> | null = null;
  const store = () => {
    if (!ready) {
      ready = (async () => {
        const { neon } = await import("@neondatabase/serverless");
        const client = neon(databaseUrl);
        const query: QueryFn = (text, params) =>
          client.query(text, params) as Promise<Record<string, unknown>[]>;
        await prepararEsquema(query);
        return createSqlStore(query);
      })();
    }
    return ready;
  };
  return {
    kind: "neon",
    save: async (input) => (await store()).save(input),
    list: async () => (await store()).list(),
  };
}

/** El driver devuelve `Date` para timestamptz; el panel sólo maneja ISO. */
function isoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

// ─── Archivo local (desarrollo) ───────────────────────────────────────────────

type LocalRow = Omit<SubscriberInput, "consentAt"> & {
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  /** Falta en filas anteriores al número; se reparte al siguiente guardado. */
  numero?: number;
};

export function createLocalStore(): WaitlistStore {
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
      const run = queue.then(async (): Promise<SaveOutcome> => {
        const fs = await import("node:fs/promises");
        const nodePath = await import("node:path");
        const dir = nodePath.join(process.cwd(), ".waitlist");
        const file = nodePath.join(dir, "subscribers.json");
        const rows = await readRows();
        const now = new Date().toISOString();
        const existing = rows.findIndex((r) => r.email === input.email);
        const row: LocalRow = {
          ...input,
          consentAt: input.consentAt.toISOString(),
          createdAt: existing >= 0 ? rows[existing].createdAt : now,
          updatedAt: now,
        };
        // El mismo contrato que Postgres: el siguiente al mayor repartido,
        // sólo para quien no tiene. La cola de escrituras serializa.
        const siguiente = rows.reduce((m, r) => Math.max(m, r.numero ?? 0), 0) + 1;
        if (existing >= 0) {
          const previo = rows[existing];
          rows[existing] = {
            ...previo,
            ...row,
            ref: previo.ref ?? row.ref,
            numero: previo.numero ?? siguiente,
          };
        } else {
          rows.push({ ...row, numero: siguiente });
        }
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8");
        const numero = existing >= 0 ? rows[existing].numero! : siguiente;
        return existing >= 0 ? { status: "already_subscribed", numero } : { status: "created", numero };
      });
      queue = run.catch(() => {});
      return run;
    },

    async list() {
      const rows = await readRows();
      return rows
        .map(
          (r): Subscriber => ({
            email: r.email,
            audience: r.audience,
            name: r.name ?? null,
            businessName: r.businessName ?? null,
            businessType: r.businessType ?? null,
            businessTypeOther: r.businessTypeOther ?? null,
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
