import { describe, expect, it } from "vitest";
import { pintarProvincias, PROVINCIAS_DIVISION, PROVINCIAS_FUENTE, PROVINCIAS_NOMBRES, soloTopónimosDeRD } from "./mapaLigero";

type Capa = {
  id: string;
  type: string;
  source?: string;
  "source-layer"?: string;
  minzoom?: number;
  maxzoom?: number;
};

/**
 * Un mapa de mentira con lo justo para estas dos funciones: el estilo, y
 * memoria de los filtros, los rangos de zoom y las capas que se le añaden.
 */
function mapaFalso(capas: Capa[], filtros: Record<string, unknown> = {}) {
  const f = { ...filtros };
  const fuentes = new Map<string, unknown>();
  const añadidas: { id: string; filter?: unknown }[] = [];
  const rangos: Record<string, [number, number]> = {};
  const layout: Record<string, Record<string, unknown>> = {};
  return {
    filtros: f,
    fuentes,
    añadidas,
    rangos,
    layout,
    getStyle: () => ({ layers: capas }),
    getFilter: (id: string) => f[id],
    setFilter: (id: string, filtro: unknown) => {
      f[id] = filtro;
    },
    getLayer: (id: string) => capas.find((c) => c.id === id),
    getSource: (id: string) => fuentes.get(id),
    addSource: (id: string, spec: unknown) => fuentes.set(id, spec),
    addLayer: (capa: { id: string; filter?: unknown }) => añadidas.push(capa),
    setLayerZoomRange: (id: string, min: number, max: number) => {
      rangos[id] = [min, max];
    },
    setLayoutProperty: (id: string, prop: string, valor: unknown) => {
      layout[id] = { ...layout[id], [prop]: valor };
    },
    setPaintProperty: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const PLACE: Capa[] = [
  { id: "place_city_r5", type: "symbol", source: "carto", "source-layer": "place", maxzoom: 15 },
  { id: "place_town", type: "symbol", source: "carto", "source-layer": "place", maxzoom: 14 },
  { id: "place_country_1", type: "symbol", source: "carto", "source-layer": "place" },
];

// Los filtros tal y como los sirve Carto: sintaxis vieja de Mapbox.
const FILTROS_DE_CARTO = {
  place_city_r5: ["all", ["==", "class", "city"], [">=", "rank", 0], ["<=", "rank", 5]],
  place_town: ["all", ["==", "class", "town"]],
  place_country_1: ["all", ["==", "class", "country"], ["<=", "rank", 2]],
};

/** Busca el `["==", campo, valor]` de `class` dentro del filtro ya combinado. */
function comparaciónDeClase(filtro: unknown): unknown[] | null {
  if (!Array.isArray(filtro)) return null;
  if (filtro[0] === "==" && JSON.stringify(filtro[1]).includes("class")) return filtro;
  for (const hijo of filtro) {
    const hit = comparaciónDeClase(hijo);
    if (hit) return hit;
  }
  return null;
}

describe("soloTopónimosDeRD", () => {
  it("acota a RD las ciudades y apaga el resto de la toponimia", () => {
    const map = mapaFalso(PLACE, FILTROS_DE_CARTO);
    expect(soloTopónimosDeRD(map)).toBe(2);
    expect(map.layout.place_country_1.visibility).toBe("none");
    expect(JSON.stringify(map.filtros.place_city_r5)).toContain("within");
    expect(map.rangos.place_city_r5).toEqual([9.5, 15]);
  });

  it("aplicada dos veces deja el campo legible, no un `get` dentro de otro", () => {
    // `applyBrandPaint` se llama en `onStyle` y otra vez en `onLoad`. Cuando la
    // conversión a expresión moderna no era idempotente, la segunda pasada
    // dejaba `["get",["get","class"]]`, que evalúa a null siempre: ni una
    // ciudad ni un pueblo se dibujaban en todo el sitio, a ningún zoom.
    const map = mapaFalso(PLACE, FILTROS_DE_CARTO);
    soloTopónimosDeRD(map);
    const unaVez = comparaciónDeClase(map.filtros.place_city_r5);
    soloTopónimosDeRD(map);
    const dosVeces = comparaciónDeClase(map.filtros.place_city_r5);

    expect(unaVez).toEqual(["==", ["get", "class"], "city"]);
    expect(dosVeces).toEqual(unaVez);
  });
});

describe("pintarProvincias", () => {
  it("monta una sola fuente y las dos capas, separadas por `tipo`", () => {
    const map = mapaFalso([]);
    expect(pintarProvincias(map)).toBe(true);
    expect(map.fuentes.has(PROVINCIAS_FUENTE)).toBe(true);

    const ids = map.añadidas.map((c: { id: string }) => c.id);
    expect(ids).toEqual([PROVINCIAS_DIVISION, PROVINCIAS_NOMBRES]);
    expect(map.añadidas[0].filter).toEqual(["==", ["get", "tipo"], "linea"]);
    expect(map.añadidas[1].filter).toEqual(["==", ["get", "tipo"], "nombre"]);
  });

  it("la segunda llamada no duplica nada: `applyBrandPaint` entra dos veces", () => {
    const map = mapaFalso([]);
    pintarProvincias(map);
    expect(pintarProvincias(map)).toBe(false);
    expect(map.añadidas).toHaveLength(2);
  });
});
