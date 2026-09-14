import { describe, expect, it } from "vitest";
import { contarParadas, idsDeSlug, MAX_PARADAS, nombreDeRuta, paradasValidas, slugDeRuta } from "./slug";
import { duracion, totalesDeRuta } from "./totales";

describe("slug de ruta", () => {
  it("va y vuelve con las paradas en orden", () => {
    const ids = ["aguilas", "barahona", "lago-enriquillo"];
    const slug = slugDeRuta(ids);
    expect(slug).toBe("aguilas_barahona_lago-enriquillo");
    expect(idsDeSlug(slug!)).toEqual(ids);
  });

  it("descarta ids desconocidos y repetidos sin romper", () => {
    expect(paradasValidas(["aguilas", "narnia", "aguilas", "duarte"])).toEqual(["aguilas", "duarte"]);
    expect(idsDeSlug("aguilas_narnia_duarte")).toEqual(["aguilas", "duarte"]);
  });

  it("pide al menos dos paradas y corta en ocho", () => {
    expect(slugDeRuta(["aguilas"])).toBeNull();
    expect(idsDeSlug("aguilas")).toEqual([]);
    expect(idsDeSlug("nada_de_nada")).toEqual([]);
    const diez = ["aguilas", "duarte", "limon", "charcos", "constanza", "haitises", "playa-rincon", "playa-fronton", "las-terrenas", "barahona"];
    expect(paradasValidas(diez)).toHaveLength(MAX_PARADAS);
  });

  it("reconoce un viaje recomendado por sus paradas exactas", () => {
    expect(nombreDeRuta(["aguilas", "barahona", "lago-enriquillo"])).toBe("Sur salvaje");
    expect(nombreDeRuta(["barahona", "aguilas", "lago-enriquillo"])).toBe("Tu ruta");
    expect(nombreDeRuta(["aguilas", "barahona"])).toBe("Tu ruta");
  });

  it("cuenta las paradas en singular y plural", () => {
    expect(contarParadas(1)).toBe("1 parada");
    expect(contarParadas(3)).toBe("3 paradas");
  });
});

describe("totales de ruta", () => {
  it("suma los tramos de la matriz de pares y los redondea", () => {
    const t = totalesDeRuta(["aguilas", "barahona", "lago-enriquillo"]);
    expect(t.km).toBeGreaterThan(150);
    expect(t.km).toBeLessThan(260);
    expect(Number.isInteger(t.km)).toBe(true);
    expect(Number.isInteger(t.min)).toBe(true);
    expect(totalesDeRuta(["aguilas"])).toEqual({ km: 0, min: 0 });
  });

  it("escribe la duración como el itinerario", () => {
    expect(duracion(45)).toBe("45 min");
    expect(duracion(120)).toBe("2 h");
    expect(duracion(190)).toBe("3 h 10 min");
  });
});
