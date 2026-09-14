import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/open-meteo.json";
import { cieloDeWMO, grados } from "./etiquetas";
import { horaEnRD, parsearOpenMeteo, urlOpenMeteo } from "./openMeteo";
import { CACHE_CLIMA, responderClima } from "./responder";

const IDS = [
  "aguilas", "duarte", "limon", "charcos", "constanza", "haitises", "playa-rincon", "playa-fronton",
  "las-terrenas", "barahona", "lago-enriquillo", "santiago", "la-romana", "zona-colonial",
  "altos-chavon", "puerto-plata", "cabarete", "jarabacoa",
];

describe("cieloDeWMO", () => {
  it("cubre la tabla WMO con una etiqueta, un glifo y un tono", () => {
    expect(cieloDeWMO(0)).toEqual({ etiqueta: "despejado", icono: "sunny", tono: "calido" });
    expect(cieloDeWMO(1).etiqueta).toBe("casi despejado");
    expect(cieloDeWMO(2)).toEqual({ etiqueta: "poco nublado", icono: "partly_cloudy", tono: "calido" });
    expect(cieloDeWMO(3)).toEqual({ etiqueta: "nublado", icono: "cloud", tono: "frio" });
    expect(cieloDeWMO(45).etiqueta).toBe("neblina");
    expect(cieloDeWMO(48).icono).toBe("fog");
    expect(cieloDeWMO(53).etiqueta).toBe("llovizna");
    expect(cieloDeWMO(63)).toEqual({ etiqueta: "lluvia", icono: "rain", tono: "frio" });
    expect(cieloDeWMO(75).etiqueta).toBe("nieve");
    expect(cieloDeWMO(81).etiqueta).toBe("chubascos");
    expect(cieloDeWMO(95)).toEqual({ etiqueta: "tormenta", icono: "thunderstorm", tono: "frio" });
    expect(cieloDeWMO(99).etiqueta).toBe("tormenta");
  });

  it("un código desconocido se lee como nublado", () => {
    expect(cieloDeWMO(42).etiqueta).toBe("nublado");
  });

  it("los grados van enteros y con el signo pegado", () => {
    expect(grados(32.4)).toBe("32°");
    expect(grados(14.6)).toBe("15°");
  });
});

describe("urlOpenMeteo", () => {
  it("manda las 18 coordenadas en una sola llamada, en la zona horaria de RD", () => {
    const url = new URL(urlOpenMeteo([{ coords: [-71.7, 17.8] }, { coords: [-70.9, 19.0] }]));
    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe("17.8,19");
    expect(url.searchParams.get("longitude")).toBe("-71.7,-70.9");
    expect(url.searchParams.get("timezone")).toBe("America/Santo_Domingo");
    expect(url.searchParams.get("current")).toBe("temperature_2m,weather_code,is_day");
  });
});

describe("parsearOpenMeteo", () => {
  it("cruza una respuesta real con los ids por posición", () => {
    const clima = parsearOpenMeteo(fixture, IDS);
    expect(Object.keys(clima)).toHaveLength(18);
    expect(clima.aguilas).toEqual({ temp: 28.2, codigo: 0, dia: false });
    expect(clima.duarte.temp).toBe(6.1);
  });

  it("acepta un solo punto suelto y rechaza el desajuste de cantidad", () => {
    expect(parsearOpenMeteo(fixture[0], ["aguilas"]).aguilas.codigo).toBe(0);
    expect(() => parsearOpenMeteo(fixture, IDS.slice(0, 3))).toThrow(/18 puntos para 3/);
  });

  it("rechaza una forma que no es la de Open-Meteo", () => {
    expect(() => parsearOpenMeteo({ error: true }, ["aguilas"])).toThrow();
  });
});

describe("horaEnRD", () => {
  it("escribe la hora de Santo Domingo con a. m. o p. m.", () => {
    // 20:00 UTC es 16:00 en Santo Domingo (UTC-4, sin horario de verano).
    expect(horaEnRD(new Date("2026-09-13T20:00:00Z"))).toMatch(/^4:00\s?p\.\s?m\.$/);
  });
});

describe("responderClima", () => {
  it("devuelve el dato con caché de 15 minutos", async () => {
    const res = await responderClima(async () => ({ hora: "4:00 p. m.", destinos: {} }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(CACHE_CLIMA);
    expect(await res.json()).toEqual({ hora: "4:00 p. m.", destinos: {} });
  });

  it("un fallo de red es un 502 vacío y sin caché, no una excepción", async () => {
    const res = await responderClima(async () => {
      throw new Error("red caída");
    });
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("");
  });
});
