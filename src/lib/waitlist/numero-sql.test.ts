import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSqlStore, prepararEsquema, type QueryFn } from "./store";

// El mismo SQL que corre en Neon, contra un Postgres de verdad (PGlite, en
// proceso). Lo que no se puede ejercer aquí es la concurrencia entre
// conexiones: PGlite tiene una sola. Lo que la garantiza en Neon es el
// bloqueo de la fila del contador dentro de la sentencia de reparto, más el
// UNIQUE de `numero`.
let db: PGlite;
let query: QueryFn;

beforeAll(async () => {
  db = new PGlite();
  query = async (text, params) => (await db.query(text, params as never[])).rows as Record<string, unknown>[];
  await prepararEsquema(query);
});

afterAll(async () => {
  await db.close();
});

const alta = (email: string) => ({ email, audience: "viajero" as const, consentAt: new Date() });

describe("número de fundador en Postgres", () => {
  it("cuenta a los que ya estaban: cada alta nueva recibe el siguiente", async () => {
    const store = createSqlStore(query);
    expect(await store.save(alta("ana@ejemplo.com"))).toEqual({ status: "created", numero: 1 });
    expect(await store.save(alta("beto@ejemplo.com"))).toEqual({ status: "created", numero: 2 });
    expect(await store.save(alta("ana@ejemplo.com"))).toEqual({ status: "already_subscribed", numero: 1 });
    expect(await store.save(alta("cira@ejemplo.com"))).toEqual({ status: "created", numero: 3 });
    const [{ n }] = await query("select n from waitlist_contador where id = 1");
    expect(Number(n)).toBe(3);
  });

  it("dos personas nunca comparten número: la columna lo prohíbe", async () => {
    await expect(query("update waitlist_subscribers set numero = 1 where email = $1", ["cira@ejemplo.com"])).rejects.toThrow(/unique|duplicate/i);
  });

  it("quien se registró antes de existir el número lo recibe por orden de llegada, una sola vez", async () => {
    // Dos filas viejas, sin número, con fechas anteriores a las de arriba.
    await query(
      `insert into waitlist_subscribers (email, audience, consent_at, created_at)
       values ('vieja-2@ejemplo.com', 'viajero', now(), now() - interval '2 days'),
              ('vieja-1@ejemplo.com', 'viajero', now(), now() - interval '3 days')`
    );
    await prepararEsquema(query);
    const filas = await query("select email, numero from waitlist_subscribers order by numero");
    expect(filas.map((f) => [f.email, Number(f.numero)])).toEqual([
      ["ana@ejemplo.com", 1],
      ["beto@ejemplo.com", 2],
      ["cira@ejemplo.com", 3],
      ["vieja-1@ejemplo.com", 4],
      ["vieja-2@ejemplo.com", 5],
    ]);
    // Repetir las migraciones no mueve nada.
    await prepararEsquema(query);
    const otra = await query("select numero from waitlist_subscribers where email = 'vieja-1@ejemplo.com'");
    expect(Number(otra[0].numero)).toBe(4);
    // Y el siguiente alta sigue la cuenta.
    expect(await createSqlStore(query).save(alta("dora@ejemplo.com"))).toEqual({ status: "created", numero: 6 });
  });

  it("un registro repetido no consume número aunque llegue antes que el reparto", async () => {
    const store = createSqlStore(query);
    const [{ n: antes }] = await query("select n from waitlist_contador where id = 1");
    await store.save(alta("dora@ejemplo.com"));
    await store.save(alta("dora@ejemplo.com"));
    const [{ n: despues }] = await query("select n from waitlist_contador where id = 1");
    expect(Number(despues)).toBe(Number(antes));
  });
});
