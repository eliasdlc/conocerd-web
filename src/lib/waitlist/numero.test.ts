import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLocalStore } from "./store";

// El almacén local escribe en `.waitlist/` del directorio de trabajo: cada
// prueba corre en un temporal propio y lo borra al salir.
let dir: string;
let cwd: string;

beforeEach(async () => {
  cwd = process.cwd();
  dir = await mkdtemp(join(tmpdir(), "crd-lista-"));
  process.chdir(dir);
});

afterEach(async () => {
  process.chdir(cwd);
  await rm(dir, { recursive: true, force: true });
});

const alta = (email: string) => ({ email, audience: "viajero" as const, consentAt: new Date() });

describe("número de fundador", () => {
  it("sube de uno en uno con cada alta nueva", async () => {
    const store = createLocalStore();
    expect(await store.save(alta("ana@ejemplo.com"))).toEqual({ status: "created", numero: 1 });
    expect(await store.save(alta("beto@ejemplo.com"))).toEqual({ status: "created", numero: 2 });
    expect(await store.save(alta("cira@ejemplo.com"))).toEqual({ status: "created", numero: 3 });
  });

  it("se repite para quien ya estaba, sin moverle el número a nadie", async () => {
    const store = createLocalStore();
    await store.save(alta("ana@ejemplo.com"));
    await store.save(alta("beto@ejemplo.com"));
    expect(await store.save(alta("ana@ejemplo.com"))).toEqual({ status: "already_subscribed", numero: 1 });
    expect(await store.save(alta("dora@ejemplo.com"))).toEqual({ status: "created", numero: 3 });
  });
});
