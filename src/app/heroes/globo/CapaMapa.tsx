"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { MapControls, MapMarker, MarkerContent, useMap } from "@/components/map/Map";
import { CategoryPin } from "@/components/map/pins";
import { CENTRO_ISLA, PINES, type PinHero, type Vista } from "./datos";
import s from "./estilos.module.css";

// El mapa entra con `ssr: false` (WebGL no existe en el servidor) y sin nodo de
// carga: detrás ya está el lienzo pintado, que es el fallback de la pantalla.
// Este módulo completo se carga a su vez en diferido desde PantallaGlobo, así
// que MapLibre no entra en el bundle del primer render: el titular y los CTA se
// pintan sin esperar al runtime de WebGL.
const Map = dynamic(() => import("@/components/map/Map").then((mod) => mod.Map), {
  ssr: false,
  loading: () => null,
});

// ─── Encuadre ────────────────────────────────────────────────────────────────
// El país tiene que caer en el hueco libre, no en el centro geométrico de la
// ventana: en desktop el panel se come la franja izquierda, en móvil la hoja se
// come la mitad de abajo. `padding` mueve el centro efectivo de la cámara en
// espacio de pantalla, así que sigue siendo correcto con el mapa girado.

type Encuadre = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  padding: { top: number; right: number; bottom: number; left: number };
};

function encuadre(): Encuadre {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Mismo corte que el breakpoint del proyecto (900px). No reparte layout —
  // solo decide dónde apunta la cámara, que es un cálculo en píxeles y no se
  // puede expresar en CSS.
  // Los zooms están calibrados a ojo sobre capturas reales (1440×900 y 390×844):
  // en proyección globo la escala en pantalla no sale de la fórmula mercator, así
  // que el número bueno es el que encuadra la isla, no el que dice la teoría.
  if (w < 900) {
    return {
      center: CENTRO_ISLA,
      zoom: 6.15,
      bearing: -8,
      pitch: 0,
      padding: { top: 14, right: 14, bottom: Math.min(480, Math.round(h * 0.54)), left: 14 },
    };
  }

  // Ancho reservado a la izquierda = panel + sus dos márgenes (ver PantallaGlobo).
  const margen = Math.min(64, Math.max(20, w * 0.04));
  const panel = Math.min(452, w * 0.4);
  return {
    center: CENTRO_ISLA,
    zoom: 6.95,
    bearing: -8,
    pitch: 0,
    padding: { top: 48, right: 66, bottom: 56, left: Math.round(panel + margen * 2) },
  };
}

// ─── Pintura de marca ────────────────────────────────────────────────────────
// Mismo tratamiento que el journey de la home: el estilo del CDN no es la
// paleta de ConoceRD hasta que se le repinta el agua y la frontera. Cada capa
// va con `getLayer` porque Carto no siempre las expone con el mismo nombre.

function pintarMarca(map: maplibregl.Map) {
  const fondo = (id: string, color: string) => {
    try {
      if (map.getLayer(id)) map.setPaintProperty(id, "background-color", color);
    } catch {}
  };
  const relleno = (id: string, color: string) => {
    try {
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", color);
    } catch {}
  };
  const linea = (id: string, color: string, ancho?: number) => {
    try {
      if (!map.getLayer(id)) return;
      map.setPaintProperty(id, "line-color", color);
      if (ancho !== undefined) map.setPaintProperty(id, "line-width", ancho);
    } catch {}
  };

  // Tierra e ínsula: el estilo del CDN pinta tierra y mar casi del mismo valor
  // y a esta escala la isla desaparece. La tierra sube a tinta (#1B3D49) y el
  // mar baja casi a negro: el país se lee como silueta antes que como mapa, que
  // es justo el papel que tiene en esta pantalla.
  fondo("background", "#193A46");
  relleno("water", "#05161C");
  linea("waterway", "#0B2731");
  try {
    // Filo de costa en verde-agua: una línea de un píxel que dibuja el país.
    if (map.getLayer("water")) map.setPaintProperty("water", "fill-outline-color", "#1E7C77");
  } catch {}
  // Parques, bosques y usos de suelo venían casi negros: con la tierra subida
  // se leían como agujeros en el país. Un tono por encima de la tierra los
  // convierte en la mancha verde que son.
  for (const capa of map.getStyle().layers ?? []) {
    if (capa.type !== "fill") continue;
    if (!/landcover|landuse|park|wood|forest|grass|green|nature|sand|pitch/i.test(capa.id)) continue;
    try {
      map.setPaintProperty(capa.id, "fill-color", "#1F4A53");
      map.setPaintProperty(capa.id, "fill-opacity", 0.55);
    } catch {}
  }
  // La frontera con Haití en coral: es el único trazo político que importa aquí
  // y de paso dibuja el perfil del país.
  linea("boundary_country_outline", "#F76C4D", 1.6);
  linea("boundary_country_inner", "#F76C4D", 1.2);
  linea("admin_country", "#F76C4D", 1.6);

  // La toponimia del basemap es la voz de otro: se baja a un susurro para que
  // manden las etiquetas de ConoceRD, y los topónimos que sí se leen se piden
  // en español (el estilo del CDN los sirve en inglés — "Dominican Republic"
  // en la primera pantalla de una marca dominicana es un gol en contra).
  try {
    for (const capa of map.getStyle().layers ?? []) {
      if (capa.type !== "symbol") continue;
      try {
        map.setPaintProperty(capa.id, "text-opacity", 0.42);
        if (/place|country|state|city|town/i.test(capa.id)) {
          map.setLayoutProperty(capa.id, "text-field", [
            "coalesce",
            ["get", "name:es"],
            ["get", "name_es"],
            ["get", "name"],
          ]);
        }
      } catch {}
    }
  } catch {}

  try {
    // Sin atmósfera: el globo se recorta limpio contra el lienzo, igual que en
    // el hero de la home.
    map.setSky({ "atmosphere-blend": 0 });
  } catch {}
}

// ─── Piezas que viven dentro del <Map> ───────────────────────────────────────

/** Reencuadra al cargar y en cada resize. Vive dentro del mapa para tener la
 *  instancia por contexto y morir con ella. */
function Camara() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const aplicar = () => map.jumpTo(encuadre());
    aplicar();
    window.addEventListener("resize", aplicar);
    return () => window.removeEventListener("resize", aplicar);
  }, [map]);

  return null;
}

/** Lectura viva de la cámara. `move` (no `moveend`) para que las coordenadas
 *  corran mientras se arrastra; una lectura por frame como mucho. */
function LecturaVista({ onVista }: { onVista: (v: Vista) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    let raf = 0;
    const leer = () => {
      raf = 0;
      const c = map.getCenter();
      onVista({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
    };
    const alMover = () => {
      if (!raf) raf = requestAnimationFrame(leer);
    };
    map.on("move", alMover);
    // Primera lectura fuera del cuerpo del efecto: el encuadre inicial puede
    // haber ocurrido antes de esta suscripción y entonces no habría `move` que
    // esperar — el instrumento se quedaría marcando la vista de fábrica.
    alMover();
    return () => {
      map.off("move", alMover);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [map, onVista]);

  return null;
}

function PinDestino({
  pin,
  indice,
  activo,
  onActivo,
}: {
  pin: PinHero;
  indice: number;
  activo: boolean;
  onActivo: (id: string | null) => void;
}) {
  const { d, lado } = pin;

  return (
    <MapMarker
      longitude={d.coords[0]}
      latitude={d.coords[1]}
      anchor="center"
      zIndex={activo ? 3 : undefined}
    >
      <MarkerContent>
        <button
          type="button"
          className={s.pin}
          data-lado={lado}
          data-on={activo || undefined}
          // Retardo por índice: los cuatro pines aterrizan en cascada cuando el
          // mapa aparece. Una sola pasada — nada late en reposo.
          style={{ animationDelay: `${0.22 + indice * 0.09}s` }}
          onMouseEnter={() => onActivo(d.id)}
          onMouseLeave={() => onActivo(null)}
          onFocus={() => onActivo(d.id)}
          onBlur={() => onActivo(null)}
          onClick={() => onActivo(activo ? null : d.id)}
          aria-pressed={activo}
          aria-label={`${d.name}, ${d.province}. Ver el destino en el mapa`}
        >
          <span className={s.punto}>
            <CategoryPin category={d.category} size={28} />
          </span>
          <span className={s.etiqueta}>{d.name}</span>
        </button>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Capa completa ───────────────────────────────────────────────────────────

export default function CapaMapa({
  activo,
  onActivo,
  onVista,
}: {
  activo: string | null;
  onActivo: (id: string | null) => void;
  onVista: (v: Vista) => void;
}) {
  const pintado = useRef(false);

  const alCargar = useCallback((map: maplibregl.Map) => {
    if (pintado.current) return;
    pintado.current = true;
    pintarMarca(map);
  }, []);

  return (
    <Map
      theme="dark"
      projection={{ type: "globe" }}
      initialViewState={{
        longitude: CENTRO_ISLA[0],
        latitude: CENTRO_ISLA[1],
        zoom: 6.4,
        bearing: -8,
        pitch: 0,
      }}
      onLoad={alCargar}
      // Se puede arrastrar y girar; la rueda no hace zoom para no secuestrar el
      // gesto de la página (para eso están los controles).
      interactive
      scrollZoom={false}
      dragPan
      dragRotate
      touchZoomRotate
      attributionControl={false}
    >
      {/* La lectura va ANTES que la cámara: su efecto se suscribe primero y
          así no se pierde el `move` del encuadre inicial. */}
      <LecturaVista onVista={onVista} />
      <Camara />
      <MapControls position="bottom-right" zoom compass />
      {PINES.map((pin, i) => (
        <PinDestino
          key={pin.d.id}
          pin={pin}
          indice={i}
          activo={activo === pin.d.id}
          onActivo={onActivo}
        />
      ))}
    </Map>
  );
}
