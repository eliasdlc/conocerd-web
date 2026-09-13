import { describe, expect, it } from "vitest";
import { capaDeReferencia, ponerRelieve, RELIEVE_CAPA, RELIEVE_FUENTE, RELIEVE_MINZOOM } from "./relieve";

type Capa = { id: string; type: string };

// Un mapa de mentira con lo justo: el estilo, y memoria de lo que se le añade.
function mapaFalso(capas: Capa[]) {
  const fuentes = new Map<string, unknown>();
  const añadidas: { capa: { id: string; minzoom?: number }; antesDe?: string }[] = [];
  return {
    añadidas,
    fuentes,
    getStyle: () => ({ layers: capas }),
    getSource: (id: string) => fuentes.get(id),
    addSource: (id: string, spec: unknown) => {
      fuentes.set(id, spec);
    },
    addLayer: (capa: { id: string; minzoom?: number }, antesDe?: string) => {
      añadidas.push({ capa, antesDe });
    },
  } as unknown as Parameters<typeof ponerRelieve>[0] & {
    añadidas: typeof añadidas;
    fuentes: typeof fuentes;
  };
}

const POSITRON: Capa[] = [
  { id: "background", type: "background" },
  { id: "landcover", type: "fill" },
  { id: "waterway", type: "line" },
  { id: "water", type: "fill" },
  { id: "road_pri", type: "line" },
  { id: "place_city", type: "symbol" },
];

describe("capaDeReferencia", () => {
  it("elige el primer río de Positron, para quedar bajo el agua y las carreteras", () => {
    expect(capaDeReferencia(mapaFalso(POSITRON))).toBe("waterway");
  });

  it("sin ríos, cae bajo el primer símbolo: nunca encima de un nombre", () => {
    const sinRios = POSITRON.filter((c) => c.id !== "waterway");
    expect(capaDeReferencia(mapaFalso(sinRios))).toBe("place_city");
  });

  it("sin nada que respetar, va encima de todo", () => {
    expect(capaDeReferencia(mapaFalso([{ id: "background", type: "background" }]))).toBeUndefined();
  });
});

describe("ponerRelieve", () => {
  it("añade la fuente y la capa una sola vez, y la capa no arranca antes de z6", () => {
    const mapa = mapaFalso(POSITRON);
    expect(ponerRelieve(mapa)).toBe(true);
    expect(mapa.fuentes.has(RELIEVE_FUENTE)).toBe(true);
    expect(mapa.añadidas).toHaveLength(1);
    expect(mapa.añadidas[0].capa.id).toBe(RELIEVE_CAPA);
    expect(mapa.añadidas[0].capa.minzoom).toBe(RELIEVE_MINZOOM);
    expect(mapa.añadidas[0].antesDe).toBe("waterway");

    expect(ponerRelieve(mapa)).toBe(false);
    expect(mapa.añadidas).toHaveLength(1);
  });
});

import { ponerTerreno, terrenoDeseado, TERRENO_EXAGERACION } from "./relieve";

describe("terrenoDeseado", () => {
  it("entra a partir de 8.5 y sale por debajo de 8: entre medias conserva lo que había", () => {
    expect(terrenoDeseado(7, false)).toBe(false);
    expect(terrenoDeseado(8.2, false)).toBe(false);
    expect(terrenoDeseado(8.5, false)).toBe(true);
    expect(terrenoDeseado(11.5, true)).toBe(true);
    expect(terrenoDeseado(8.2, true)).toBe(true);
    expect(terrenoDeseado(7.9, true)).toBe(false);
  });
});

describe("ponerTerreno", () => {
  function mapa(conFuente: boolean) {
    let terreno: unknown = null;
    return {
      escrituras: [] as unknown[],
      getSource: () => (conFuente ? {} : undefined),
      getTerrain: () => terreno,
      setTerrain(t: unknown) {
        terreno = t;
        this.escrituras.push(t);
      },
    };
  }

  it("no escribe nada mientras la fuente del relieve no exista", () => {
    const m = mapa(false);
    expect(ponerTerreno(m as never, true)).toBe(false);
    expect(m.escrituras).toHaveLength(0);
  });

  it("escribe sólo cuando el estado cambia", () => {
    const m = mapa(true);
    expect(ponerTerreno(m as never, true)).toBe(true);
    expect(ponerTerreno(m as never, true)).toBe(false);
    expect(ponerTerreno(m as never, false)).toBe(true);
    expect(m.escrituras).toEqual([{ source: "relieve", exaggeration: TERRENO_EXAGERACION }, null]);
  });
});
