import { describe, expect, it } from "vitest";
import {
  capaDeReferencia,
  PALETA,
  ponerRelieve,
  RELIEVE_CAPA,
  RELIEVE_FUENTE,
  RELIEVE_MINZOOM,
} from "./relieve";

type Capa = { id: string; type: string };

// Un mapa de mentira con lo justo: el estilo, y memoria de lo que se le hace.
function mapaFalso(capas: Capa[]) {
  const fuentes = new Map<string, unknown>();
  const añadidas: { capa: { id: string; minzoom?: number }; antesDe?: string }[] = [];
  const pintadas: [string, string, unknown][] = [];
  return {
    añadidas,
    fuentes,
    pintadas,
    getStyle: () => ({ layers: capas }),
    getSource: (id: string) => fuentes.get(id),
    addSource: (id: string, spec: unknown) => {
      fuentes.set(id, spec);
    },
    addLayer: (capa: { id: string; minzoom?: number }, antesDe?: string) => {
      añadidas.push({ capa, antesDe });
    },
    getLayer: (id: string) => capas.find((c) => c.id === id),
    setPaintProperty: (capa: string, prop: string, valor: unknown) => {
      pintadas.push([capa, prop, valor]);
    },
  } as unknown as Parameters<typeof ponerRelieve>[0] & {
    añadidas: typeof añadidas;
    fuentes: typeof fuentes;
    pintadas: typeof pintadas;
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
  it("va justo encima del fondo, bajo todo lo vectorial", () => {
    expect(capaDeReferencia(mapaFalso(POSITRON))).toBe("landcover");
  });

  it("sin landcover, la primera capa que no sea el fondo", () => {
    const sinLandcover = POSITRON.filter((c) => c.id !== "landcover");
    expect(capaDeReferencia(mapaFalso(sinLandcover))).toBe("waterway");
  });

  it("con sólo el fondo, va encima de todo", () => {
    expect(capaDeReferencia(mapaFalso([{ id: "background", type: "background" }]))).toBeUndefined();
  });
});

describe("ponerRelieve", () => {
  it("añade la fuente y la capa una sola vez, bajo lo vectorial y desde z5", () => {
    const mapa = mapaFalso(POSITRON);
    expect(ponerRelieve(mapa)).toBe(true);
    expect(mapa.fuentes.has(RELIEVE_FUENTE)).toBe(true);
    expect(mapa.añadidas).toEqual([
      { capa: expect.objectContaining({ id: RELIEVE_CAPA, minzoom: RELIEVE_MINZOOM }), antesDe: "landcover" },
    ]);

    expect(ponerRelieve(mapa)).toBe(false);
    expect(mapa.añadidas).toHaveLength(1);
  });

  it("el fondo toma el color de la cota cero, para que una tesela que tarda no se vea como un hueco", () => {
    const mapa = mapaFalso(POSITRON);
    ponerRelieve(mapa);
    expect(mapa.pintadas).toContainEqual(["background", "background-color", PALETA.fondo]);
    expect(PALETA.fondo).toBe(PALETA.suelo[0][1]);
  });

  it("el agua queda plana y opaca: la profundidad del DEM se veía a bloques", () => {
    const mapa = mapaFalso(POSITRON);
    ponerRelieve(mapa);
    expect(mapa.pintadas).toContainEqual(["water", "fill-color", PALETA.agua]);
    expect(mapa.pintadas).toContainEqual(["water", "fill-opacity", 1]);
  });
});
