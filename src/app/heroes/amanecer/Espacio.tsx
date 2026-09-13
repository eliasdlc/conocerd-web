"use client";

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import { useMap } from "@/components/map/context";
import { useDescenso } from "../_components/GloboHero";

// ─────────────────────────────────────────────────────────────────────────────
//  La Tierra de verdad sobre el globo del journey.
//
//  Tres capas encima del estilo de marca, todas de la NASA:
//   · `noche`: Black Marble (luces de ciudad, VIIRS 2012). Es lo que se ve
//     desde el espacio mientras manda el hero: el país es sus luces.
//   · `dia`: Blue Marble Next Generation. Entra con el amanecer.
//   · `nubes`: el mapa global de nubes, reproyectado a Mercator y con el
//     brillo convertido en alfa (public/assets/nubes.webp).
//
//  Las teselas vienen de GIBS (gibs.earthdata.nasa.gov), sin clave y con CORS
//  abierto, hasta el nivel 8: de sobra para el vuelo, que las suelta antes del
//  primer plano. Al bajar, las opacidades siguen a `--descenso`: luces → día →
//  mapa de marca, así que la cámara aterriza en el estilo del sitio.
// ─────────────────────────────────────────────────────────────────────────────

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const TESELAS = (capa: string) =>
  `${GIBS}/${capa}/default/500m/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg`;

/** Esquinas del mapa de nubes: el mundo entero en Mercator. */
const MUNDO: [[number, number], [number, number], [number, number], [number, number]] = [
  [-180, 85.0511],
  [180, 85.0511],
  [180, -85.0511],
  [-180, -85.0511],
];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** 0 en `a`, 1 en `b`, lineal entre medias. */
const rampa = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Opacidad de cada capa según el descenso (0 = hero, 1 = aterrizaje).
 *  Las nubes se van antes que la Tierra de día: la textura es de 1024 px y de
 *  cerca se rompe en bloques. El día cede al mapa de marca antes de que las
 *  teselas de nivel 8 se vean borrosas; las etiquetas del estilo vuelven justo
 *  después, cuando ya se aterriza sobre el mapa del sitio. */
function opacidades(t: number) {
  return {
    noche: 1 - rampa(t, 0.12, 0.42),
    dia: Math.min(rampa(t, 0.08, 0.36), 1 - rampa(t, 0.5, 0.72)),
    // De noche las nubes se insinúan; con el día se ven enteras.
    nubes: (0.42 + 0.5 * rampa(t, 0.08, 0.36)) * (1 - rampa(t, 0.4, 0.58)),
    etiquetas: rampa(t, 0.62, 0.82),
  };
}

export default function Espacio() {
  const map = useMap();
  const { t } = useDescenso();
  const listo = useRef(false);
  /** Capas de texto e iconos del estilo de marca, que la imagen tapa. */
  const simbolos = useRef<string[]>([]);

  const pintarEtiquetas = (m: maplibregl.Map, op: number) => {
    for (const id of simbolos.current) {
      m.setPaintProperty(id, "text-opacity", op);
      m.setPaintProperty(id, "icon-opacity", op);
    }
  };

  // Fuentes y capas, una vez. El mapa llega ya cargado (el contexto se monta
  // tras `load`), así que se puede añadir directamente.
  useEffect(() => {
    if (!map) return;
    const inicial = opacidades(0);

    map.addSource("nasa-noche", { type: "raster", tiles: [TESELAS("VIIRS_CityLights_2012")], tileSize: 256, maxzoom: 8 });
    map.addSource("nasa-dia", { type: "raster", tiles: [TESELAS("BlueMarble_NextGeneration")], tileSize: 256, maxzoom: 8 });
    map.addSource("nasa-nubes", { type: "image", url: "/assets/nubes.webp", coordinates: MUNDO });

    map.addLayer({ id: "espacio-dia", type: "raster", source: "nasa-dia", paint: { "raster-opacity": inicial.dia, "raster-fade-duration": 0 } });
    map.addLayer({ id: "espacio-noche", type: "raster", source: "nasa-noche", paint: { "raster-opacity": inicial.noche, "raster-fade-duration": 0 } });
    map.addLayer({ id: "espacio-nubes", type: "raster", source: "nasa-nubes", paint: { "raster-opacity": inicial.nubes, "raster-fade-duration": 0 } });

    // Las etiquetas del estilo (continentes, países) se apagan mientras manda
    // la imagen: sobre la Tierra de verdad, "NORTH AMERICA" en gris sobra.
    simbolos.current = (map.getStyle().layers ?? []).filter((l) => l.type === "symbol").map((l) => l.id);
    pintarEtiquetas(map, inicial.etiquetas);

    // La atmósfera del globo, que GloboHero apaga para recortar el planeta
    // limpio contra el crema. Aquí el planeta está en el espacio y la quiere.
    map.setSky({ "atmosphere-blend": 1 });
    listo.current = true;

    return () => {
      listo.current = false;
      if (!map.getStyle()) return;
      for (const id of ["espacio-nubes", "espacio-noche", "espacio-dia"]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      for (const id of ["nasa-nubes", "nasa-noche", "nasa-dia"]) {
        if (map.getSource(id)) map.removeSource(id);
      }
      pintarEtiquetas(map, 1);
      map.setSky({ "atmosphere-blend": 0 });
    };
  }, [map]);

  // El crossfade sigue al scroll.
  useEffect(() => {
    if (!map || !listo.current) return;
    const op = opacidades(t);
    map.setPaintProperty("espacio-noche", "raster-opacity", op.noche);
    map.setPaintProperty("espacio-dia", "raster-opacity", op.dia);
    map.setPaintProperty("espacio-nubes", "raster-opacity", op.nubes);
    pintarEtiquetas(map, op.etiquetas);
    // La atmósfera se queda hasta que el planeta llena la pantalla.
    map.setSky({ "atmosphere-blend": 1 - rampa(t, 0.5, 0.8) });
  }, [map, t]);

  return null;
}
