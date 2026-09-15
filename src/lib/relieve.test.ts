import { describe, expect, it } from "vitest";
import {
  capaDeReferencia,
  LAGOS_CAPA,
  PALETA,
  ponerRelieve,
  RELIEVE_CAPA,
  RELIEVE_FUENTE,
  RELIEVE_MINZOOM,
} from "./relieve";

type Capa = { id: string; type: string; source?: string; "source-layer"?: string };

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

// El orden real de Positron: el fondo, el suelo, el agua (dos capas sobre la
// misma source-layer) y ya lo demás.
const POSITRON: Capa[] = [
  { id: "background", type: "background" },
  { id: "landcover", type: "fill", source: "carto", "source-layer": "landcover" },
  { id: "waterway", type: "line", source: "carto", "source-layer": "waterway" },
  { id: "water", type: "fill", source: "carto", "source-layer": "water" },
  { id: "water_shadow", type: "fill", source: "carto", "source-layer": "water" },
  { id: "road_pri", type: "line", source: "carto", "source-layer": "transportation" },
  { id: "place_city", type: "symbol", source: "carto", "source-layer": "place" },
];

describe("capaDeReferencia", () => {
  it("va encima del agua y debajo de todo lo demás: la tesela ya trae el mar", () => {
    expect(capaDeReferencia(mapaFalso(POSITRON))).toBe("road_pri");
  });

  it("sin agua en el estilo, la posición equivalente es encima del fondo", () => {
    const sinAgua = POSITRON.filter((c) => c["source-layer"] !== "water");
    expect(capaDeReferencia(mapaFalso(sinAgua))).toBe("landcover");
  });

  it("con sólo el fondo, va encima de todo", () => {
    expect(capaDeReferencia(mapaFalso([{ id: "background", type: "background" }]))).toBeUndefined();
  });
});

describe("ponerRelieve", () => {
  it("añade la fuente y las dos capas una sola vez, encima del agua y desde z4", () => {
    const mapa = mapaFalso(POSITRON);
    expect(ponerRelieve(mapa)).toBe(true);
    expect(mapa.fuentes.has(RELIEVE_FUENTE)).toBe(true);
    expect(mapa.añadidas).toEqual([
      { capa: expect.objectContaining({ id: RELIEVE_CAPA, minzoom: RELIEVE_MINZOOM }), antesDe: "road_pri" },
      { capa: expect.objectContaining({ id: LAGOS_CAPA, minzoom: RELIEVE_MINZOOM }), antesDe: "road_pri" },
    ]);

    expect(ponerRelieve(mapa)).toBe(false);
    expect(mapa.añadidas).toHaveLength(2);
  });

  it("el fondo toma el color de la cota cero, para que una tesela que tarda no se vea como un hueco", () => {
    const mapa = mapaFalso(POSITRON);
    ponerRelieve(mapa);
    const fondo = mapa.pintadas.find(([capa, prop]) => capa === "background" && prop === "background-color");
    expect(fondo?.[2]).toContain(PALETA.fondo);
    expect(PALETA.fondo).toBe(PALETA.suelo[0][1]);
  });

  it("el polígono de agua se queda en el mar abierto: es lo único que hay fuera de la caja", () => {
    const mapa = mapaFalso(POSITRON);
    ponerRelieve(mapa);
    const agua = mapa.pintadas.find(([capa, prop]) => capa === "water" && prop === "fill-color");
    expect(agua?.[2]).toContain(PALETA.mar[PALETA.mar.length - 1][1]);
    expect(mapa.pintadas).toContainEqual(["water", "fill-opacity", 1]);
  });

  it("los lagos vuelven encima del relieve, sin el océano: el DEM no distingue una presa de una ladera", () => {
    const mapa = mapaFalso(POSITRON);
    ponerRelieve(mapa);
    const lagos = mapa.añadidas.find((a) => a.capa.id === LAGOS_CAPA)?.capa as unknown as {
      filter: unknown;
      paint: Record<string, unknown>;
    };
    expect(lagos.filter).toEqual(["!=", ["get", "class"], "ocean"]);
    expect(lagos.paint["fill-color"]).toBe(PALETA.lagos);
  });

  it("la rampa del mar termina antes del borde de la caja, o el borde se ve", () => {
    // 45 km es el margen de mar que `RELIEVE_BOUNDS` deja contra la costa más
    // cercana; pasado el final de la rampa el color ya no cambia, así que la
    // tesela del borde y el polígono de fuera son el mismo azul.
    expect(PALETA.mar[PALETA.mar.length - 1][0]).toBeLessThan(45);
  });
});
