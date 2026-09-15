import type maplibregl from "maplibre-gl";
import { MUNDO_DIA, MUNDO_ESQUINAS, MUNDO_NOCHE } from "@/lib/mundo";

// ─────────────────────────────────────────────────────────────────────────────
//  La Tierra de verdad sobre el globo.
//
//  Tres capas encima del estilo de marca, todas con imágenes de la NASA:
//   · `noche`: Black Marble (luces de ciudad, VIIRS 2012). Es lo que se ve
//     desde el espacio mientras manda el hero: el país es sus luces.
//   · `dia`: Blue Marble Next Generation. Entra con el amanecer.
//   · `nubes`: el mapa global de nubes, reproyectado a Mercator y con el
//     brillo convertido en alfa (public/assets/nubes.webp).
//
//  Las tres son UNA IMAGEN cada una, servida desde nuestro dominio y con el
//  mundo entero dentro. La noche y el día venían tesladas de GIBS hasta el
//  nivel 8: 189 peticiones en móvil y 176 en escritorio por recorrido, con
//  mediana de 124 ms (272 ms en 4G), para un cielo que se apaga antes del
//  primer destino. El porqué del horneado y el lado de cada imagen viven en
//  `lib/mundo`; el horneado, en `scripts/hornear-mundo.mjs`.
//
//  Las opacidades siguen al descenso (0 = hero, 1 = aterrizaje): luces → día →
//  mapa de marca, así que la cámara aterriza en el estilo del sitio. Es
//  imperativo y sin React a propósito: la home lo pinta desde un MotionValue
//  por frame y el banco de propuestas desde su propio estado.
// ─────────────────────────────────────────────────────────────────────────────

/** Esquinas del cielo: el mundo entero en Mercator, común a las tres capas. */
const MUNDO = MUNDO_ESQUINAS;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 0 en `a`, 1 en `b`, lineal entre medias. */
export const rampa = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Opacidad de cada capa según el descenso.
 *  Las nubes se van antes que la Tierra de día: la textura es de 1024 px y de
 *  cerca se rompe en bloques. El día cede al mapa de marca antes de que las
 *  teselas de nivel 8 se vean borrosas; las etiquetas del estilo vuelven justo
 *  después, cuando ya se aterriza sobre el mapa del sitio. */
export function opacidades(t: number) {
  return {
    noche: 1 - rampa(t, 0.12, 0.42),
    dia: Math.min(rampa(t, 0.08, 0.36), 1 - rampa(t, 0.46, 0.68)),
    nubes: (0.42 + 0.5 * rampa(t, 0.08, 0.36)) * (1 - rampa(t, 0.3, 0.46)),
    etiquetas: rampa(t, 0.62, 0.82),
    atmosfera: 1 - rampa(t, 0.5, 0.8),
  };
}

export type CapasNasa = {
  /** Escribe las opacidades del descenso `t` (0..1). */
  pintar: (t: number) => void;
  /** Quita capas y fuentes y devuelve el cielo a como estaba. */
  desmontar: () => void;
};

/**
 * Añade las capas al mapa (ya cargado) y enciende la atmósfera del globo.
 *
 * `etiquetas`: si el estilo todavía muestra símbolos a este zoom, apagarlos
 * mientras manda la imagen (sobre la Tierra de verdad, "NORTH AMERICA" en
 * gris sobra). La home ya los recorta por zoom y no lo necesita.
 */
export function montarCapasNasa(map: maplibregl.Map, { etiquetas = false } = {}): CapasNasa {
  const inicial = opacidades(0);

  map.addSource("nasa-noche", { type: "image", url: MUNDO_NOCHE, coordinates: MUNDO });
  map.addSource("nasa-nubes", { type: "image", url: "/assets/nubes.webp", coordinates: MUNDO });

  map.addLayer({ id: "espacio-noche", type: "raster", source: "nasa-noche", paint: { "raster-opacity": inicial.noche, "raster-fade-duration": 0 } });
  map.addLayer({ id: "espacio-nubes", type: "raster", source: "nasa-nubes", paint: { "raster-opacity": inicial.nubes, "raster-fade-duration": 0 } });

  // El día entra cuando empieza el descenso, no antes.
  //
  // En reposo su opacidad es 0: bajarlo al abrir sólo sirve para que sus 428 KB
  // compitan con los 94 de la noche, que es la única que se ve, y para que el
  // planeta tarde más en dejar de ser pálido. Va DEBAJO de la noche, que es el
  // orden que tenían cuando se montaban los dos de golpe.
  let dia = false;
  const montarDia = () => {
    if (dia || !map.getLayer("espacio-noche")) return;
    dia = true;
    map.addSource("nasa-dia", { type: "image", url: MUNDO_DIA, coordinates: MUNDO });
    map.addLayer(
      { id: "espacio-dia", type: "raster", source: "nasa-dia", paint: { "raster-opacity": 0, "raster-fade-duration": 0 } },
      "espacio-noche"
    );
  };

  const simbolos = etiquetas
    ? (map.getStyle().layers ?? []).filter((l) => l.type === "symbol").map((l) => l.id)
    : [];
  const pintarEtiquetas = (op: number) => {
    for (const id of simbolos) {
      map.setPaintProperty(id, "text-opacity", op);
      map.setPaintProperty(id, "icon-opacity", op);
    }
  };

  const pintar = (t: number) => {
    if (!map.getLayer("espacio-noche")) return;
    const op = opacidades(t);
    if (t > 0) montarDia();
    map.setPaintProperty("espacio-noche", "raster-opacity", op.noche);
    if (dia) map.setPaintProperty("espacio-dia", "raster-opacity", op.dia);
    map.setPaintProperty("espacio-nubes", "raster-opacity", op.nubes);
    pintarEtiquetas(op.etiquetas);
    map.setSky({ "atmosphere-blend": op.atmosfera });
  };

  pintarEtiquetas(inicial.etiquetas);
  map.setSky({ "atmosphere-blend": 1 });

  return {
    pintar,
    desmontar: () => {
      if (!map.getStyle()) return;
      for (const id of ["espacio-nubes", "espacio-noche", "espacio-dia"]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of ["nasa-nubes", "nasa-noche", "nasa-dia"]) {
        if (map.getSource(id)) map.removeSource(id);
      }
      pintarEtiquetas(1);
      map.setSky({ "atmosphere-blend": 0 });
    },
  };
}
