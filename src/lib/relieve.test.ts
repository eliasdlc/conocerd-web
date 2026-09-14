import { describe, expect, it } from "vitest";
import { capaDeReferencia, ponerRelieve, RELIEVE_CAPA, RELIEVE_COLOR, RELIEVE_FUENTE, RELIEVE_MINZOOM, RELIEVE_ORILLA } from "./relieve";

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
    getLayer: (id: string) => capas.find((c) => c.id === id),
    setPaintProperty: () => {},
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
  it("añade la fuente y las capas una sola vez, bajo los ríos, y ninguna arranca antes de z6", () => {
    const mapa = mapaFalso(POSITRON);
    expect(ponerRelieve(mapa)).toBe(true);
    expect(mapa.fuentes.has(RELIEVE_FUENTE)).toBe(true);
    expect(mapa.añadidas.map((a) => a.capa.id)).toEqual([RELIEVE_COLOR, RELIEVE_CAPA, RELIEVE_ORILLA]);
    expect(mapa.añadidas.map((a) => a.capa.minzoom)).toEqual([RELIEVE_MINZOOM, RELIEVE_MINZOOM, RELIEVE_MINZOOM]);
    expect(mapa.añadidas[0].antesDe).toBe("waterway");
    expect(mapa.añadidas[1].antesDe).toBe("waterway");
    // La orilla va justo encima del agua.
    expect(mapa.añadidas[2].antesDe).toBe("road_pri");

    expect(ponerRelieve(mapa)).toBe(false);
    expect(mapa.añadidas).toHaveLength(3);
  });
});
