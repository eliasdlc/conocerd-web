import { describe, expect, it } from "vitest";

import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_GROUPS,
  businessTypeLabel,
  resolveBusinessType,
  searchBusinessTypes,
} from "./business-types";

describe("catálogo", () => {
  // Un slug repetido rompe el índice en silencio y un sinónimo repetido hace
  // que `resolveBusinessType` devuelva un tipo u otro según el orden.
  it("no repite slugs ni claves de búsqueda entre tipos", () => {
    const keys = new Map<string, string>();
    const collisions: string[] = [];

    for (const group of BUSINESS_TYPE_GROUPS) {
      for (const type of group.types) {
        for (const key of [type.slug, type.label.toLowerCase(), ...type.aliases]) {
          const owner = keys.get(key);
          if (owner && owner !== type.slug) collisions.push(`${key}: ${owner} / ${type.slug}`);
          keys.set(key, type.slug);
        }
      }
    }

    expect(collisions).toEqual([]);
    expect(new Set(BUSINESS_TYPES).size).toBe(BUSINESS_TYPES.length);
  });
});

describe("resolveBusinessType", () => {
  it("resuelve la etiqueta sin importar acentos, mayúsculas ni espacios", () => {
    expect(resolveBusinessType("  CAFETERIA ")).toBe("cafeteria");
    expect(resolveBusinessType("Cafetería")).toBe("cafeteria");
  });

  it("resuelve por sinónimo dominicano y por slug heredado", () => {
    expect(resolveBusinessType("salto")).toBe("cascada");
    expect(resolveBusinessType("colmadon")).toBe(undefined);
    expect(resolveBusinessType("hospedaje")).toBe("hotel");
  });

  it("no resuelve lo que sólo contiene un sinónimo", () => {
    expect(resolveBusinessType("cafe de la esquina")).toBe(undefined);
  });
});

describe("searchBusinessTypes", () => {
  it("devuelve el catálogo entero cuando no hay consulta", () => {
    const total = searchBusinessTypes("").flatMap((g) => g.matches);
    expect(total).toHaveLength(BUSINESS_TYPES.length);
  });

  it("dice qué sinónimo produjo la coincidencia", () => {
    const [group] = searchBusinessTypes("salto");
    expect(group.matches).toEqual([{ slug: "cascada", label: "Cascada", alias: "salto" }]);
  });

  it("no devuelve nada para un tipo que dejamos fuera del catálogo", () => {
    expect(searchBusinessTypes("gasolinera")).toEqual([]);
  });

  it("coincide por inicio de palabra, no por subcadena suelta", () => {
    const slugs = searchBusinessTypes("ca").flatMap((g) => g.matches.map((m) => m.slug));
    expect(slugs).toContain("cafeteria");
    expect(slugs).toContain("cascada");
    // "pica pollo" contiene "ca" pero no empieza ninguna palabra con ella.
    expect(slugs).not.toContain("restaurante");
    // "pollo" sí empieza la segunda palabra de "pica pollo".
    expect(searchBusinessTypes("pollo").flatMap((g) => g.matches.map((m) => m.slug))).toEqual([
      "restaurante",
    ]);
  });
});

describe("businessTypeLabel", () => {
  it("etiqueta los tipos del catálogo, los heredados y los desconocidos", () => {
    expect(businessTypeLabel("puesto_carretera")).toBe("Puesto de carretera");
    expect(businessTypeLabel("hospedaje")).toBe("Hospedaje");
    expect(businessTypeLabel("gasolinera")).toBe("gasolinera");
  });
});
