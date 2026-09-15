import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESTINATIONS, FEATURED_DESTINATIONS } from "@/data/destinations";
import pairs from "@/data/routes/pairs.json";

// Lo que estas pruebas cuidan es una sola cosa: que el catálogo no mienta.
//
// Los 20 destinos que entraron el 15 sep 2026 lo hicieron sin foto y sin
// valoración (decisión 6A), con la coordenada resuelta contra Nominatim y
// comprobada por geocodificación inversa. Nada de eso queda comprobado en el
// repo si el archivo puede editarse a mano sin que salte nada.

/** Nombres de provincia que el mapa sabe rotular (decisión 2C, fase 3). */
const PROVINCIAS_DEL_MAPA = new Set<string>(
  (
    JSON.parse(readFileSync("public/data/provincias/v1.json", "utf8")) as {
      features: { properties: { tipo: string; nombre?: string } }[];
    }
  ).features.flatMap((f) => (f.properties.tipo === "nombre" && f.properties.nombre ? [f.properties.nombre] : []))
);

/** Caja de la República Dominicana. Una coordenada fuera es un dedo torcido. */
const CAJA = { oeste: -72.1, este: -68.2, sur: 17.4, norte: 19.98 };

describe("catálogo de destinos", () => {
  it("tiene 38 destinos con id único, y solo 6 en el recorrido", () => {
    expect(DESTINATIONS).toHaveLength(38);
    expect(new Set(DESTINATIONS.map((d) => d.id)).size).toBe(38);
    expect(DESTINATIONS.filter((d) => d.featured)).toHaveLength(6);
  });

  it("no pierde ningún destacado por el camino, y los seis llevan foto", () => {
    // `FEATURED_DESTINATIONS` filtra por `image`: si alguien marca un destino
    // como destacado y se le olvida la foto, desaparece del recorrido en vez de
    // romperlo, y este es el único sitio donde eso se nota.
    expect(FEATURED_DESTINATIONS).toHaveLength(6);
    expect(FEATURED_DESTINATIONS.map((d) => d.featuredOrder)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("usa provincias que el mapa sabe rotular", () => {
    const huerfanas = DESTINATIONS.filter((d) => !PROVINCIAS_DEL_MAPA.has(d.province));
    expect(huerfanas.map((d) => `${d.name}: ${d.province}`)).toEqual([]);
  });

  it("no tiene ninguna coordenada fuera del país", () => {
    const fuera = DESTINATIONS.filter(({ coords: [lon, lat] }) => {
      return lon < CAJA.oeste || lon > CAJA.este || lat < CAJA.sur || lat > CAJA.norte;
    });
    expect(fuera.map((d) => `${d.name}: ${d.coords.join(",")}`)).toEqual([]);
  });

  it("está entero en la matriz de carreteras", () => {
    // El fallo que esto evita ya ocurrió: los 20 destinos nuevos entraron al
    // catálogo el 15 sep y la matriz se quedó con 18 ids, así que cualquier
    // ruta que tocara uno decía 0 km y 0 min en pantalla. Añadir un destino sin
    // correr `pnpm rutas` vuelve a romperlo, y en silencio.
    const fuera = DESTINATIONS.filter((d) => !(pairs.ids as string[]).includes(d.id));
    expect(fuera.map((d) => d.id)).toEqual([]);
  });

  it("tiene la geometría de carretera de cada destino en su propio fichero", () => {
    const sinTramos = DESTINATIONS.filter(
      (d) => !existsSync(`public/data/route-legs/${d.id}.json`)
    );
    expect(sinTramos.map((d) => d.id)).toEqual([]);
  });

  it("no inventa una valoración donde no hay foto", () => {
    // Las dos cosas salieron de la misma pasada de datos: los 18 viejos tienen
    // ambas, los 20 nuevos ninguna. Una valoración suelta seria una estimación
    // colada de vuelta, que es justo lo que la 6A prohibe.
    const sueltos = DESTINATIONS.filter((d) => d.rating !== undefined && !d.image);
    expect(sueltos.map((d) => d.name)).toEqual([]);
  });
});
