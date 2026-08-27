"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  El motor: la única pieza que importa maplibre de verdad, y por eso la única
//  que se carga con `dynamic`. Trae consigo el CSS de maplibre, que antes vivía
//  en el layout raíz y viajaba a todas las páginas del sitio.
//
//  Publica en el contexto la instancia y el propio módulo, para que `MapMarker`
//  pueda construir marcadores sin importar maplibre desde el grafo inicial.
// ─────────────────────────────────────────────────────────────────────────────

import maplibregl from "maplibre-gl";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapContext } from "@/components/map/context";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ViewState {
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  pitch?: number;
}

export interface InitialViewState {
  longitude?: number;
  latitude?: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
}

export interface MapProps {
  theme?: "light" | "dark";
  styles?: string;
  /**
   * La spec de MapLibre, no un `{type: string}`: `type` acepta también una
   * expresión de zoom, que es como se pide un globo que pase a mercator a
   * partir de cierto acercamiento.
   */
  projection?: maplibregl.ProjectionSpecification;
  viewport?: ViewState;
  onViewportChange?: (viewport: ViewState) => void;
  onLoad?: (map: maplibregl.Map) => void;
  loading?: React.ReactNode;
  initialViewState?: InitialViewState;
  interactive?: boolean;
  attributionControl?: boolean;
  scrollZoom?: boolean;
  dragPan?: boolean;
  dragRotate?: boolean;
  touchZoomRotate?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * PROTOTIPO. Resolución del buffer del canvas. MapLibre usa
   * `devicePixelRatio` completo, así que en una pantalla HiDPI dibuja cuatro
   * veces los píxeles. Sólo se puede fijar en el constructor.
   */
  pixelRatio?: number;
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export const Map = forwardRef<maplibregl.Map | null, MapProps>(function Map(
  {
    theme = "light",
    styles,
    projection,
    viewport,
    onViewportChange,
    onLoad,
    loading,
    initialViewState,
    interactive = true,
    attributionControl = true,
    scrollZoom = true,
    dragPan = true,
    dragRotate = true,
    touchZoomRotate = true,
    children,
    className,
    style,
    pixelRatio,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  // El contenido del sitio vive como children de este componente: si el mapa no
  // puede arrancar (sin WebGL, style.json del CDN caído), `failed` suelta los
  // children igual y la página fluye sobre el fondo crema en vez de quedar en
  // blanco.
  const [failed, setFailed] = useState(false);

  // Recompute after the `ready` render without pretending the ref itself is a
  // hook dependency; `mapRef.current` is populated immediately before setReady.
  useImperativeHandle(ref, () => mapRef.current as maplibregl.Map);

  useEffect(() => {
    if (!containerRef.current) return;

    const styleUrl =
      styles ?? MAP_STYLES[theme as keyof typeof MAP_STYLES] ?? MAP_STYLES.light;

    const center: [number, number] =
      initialViewState?.longitude !== undefined
        ? [initialViewState.longitude, initialViewState.latitude ?? 0]
        : (viewport?.center ?? [-70.1627, 18.7357]);

    let map: maplibregl.Map | null = null;
    let removed = false;

    const fail = (err: unknown) => {
      console.error("[Map] el mapa no pudo inicializar — contenido sin mapa:", err);
      if (map && !removed) {
        removed = true;
        try {
          map.remove();
        } catch {}
      }
      map = null;
      mapRef.current = null;
      setFailed(true);
    };

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center,
        zoom: initialViewState?.zoom ?? viewport?.zoom ?? 5,
        bearing: initialViewState?.bearing ?? viewport?.bearing ?? 0,
        pitch: initialViewState?.pitch ?? viewport?.pitch ?? 0,
        interactive,
        attributionControl: attributionControl ? undefined : false,
        scrollZoom,
        dragPan,
        dragRotate,
        touchZoomRotate,
        // El crossfade entre niveles de tile mantiene el mapa en estado
        // "fundiendo": conserva y mezcla dos juegos de tiles, y sigue
        // repintando aunque la cámara esté quieta. En un journey que vuela de
        // z1.15 a z11.5 eso es permanente, y el fundido no se aprecia porque
        // la cámara ya se está moviendo.
        fadeDuration: 0,
        ...(pixelRatio ? { pixelRatio } : {}),
      });
    } catch (err) {
      // WebGL no disponible: maplibre lanza durante la construcción.
      fail(err);
      return;
    }

    // Fallo del estilo (CDN caído): llega como evento `error` antes de que el
    // estilo cargue y `load` no va a disparar nunca. Los errores de tiles
    // sueltos ocurren con el estilo ya cargado y no entran aquí.
    map.on("error", (e) => {
      if (map && !mapRef.current && !map.isStyleLoaded()) fail(e.error ?? e);
    });

    map.on("load", () => {
      if (!map) return;
      // PROTOTIPO: la instancia queda accesible para poder medir ablaciones del
      // estilo y de la proyección en vivo, sin recompilar entre variante y
      // variante. Se va con el prototipo.
      (window as unknown as { __crdMap?: maplibregl.Map }).__crdMap = map;
      if (projection) map.setProjection(projection);
      onLoad?.(map);
      mapRef.current = map;
      setReady(true);
    });

    if (onViewportChange) {
      map.on("moveend", () => {
        if (!map) return;
        const c = map.getCenter();
        onViewportChange({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      });
    }

    return () => {
      setReady(false);
      mapRef.current = null;
      if (map && !removed) {
        removed = true;
        map.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El contexto sólo existe tras `load`, y `mapRef.current` se puebla el frame
  // anterior a `setReady(true)`: cuando este memo recomputa, la instancia ya
  // está. Un objeto nuevo por render volvería a montar cada marcador.
  const value = useMemo(
    () => (ready && mapRef.current ? { map: mapRef.current, gl: maplibregl } : null),
    [ready]
  );

  return (
    <MapContext.Provider value={value}>
      <div
        ref={containerRef}
        className={className}
        style={{ width: "100%", height: "100%", ...style }}
      />
      {!ready && !failed && loading}
      {/* Los children se pintan desde el primer render, sin esperar a que
          MapLibre cargue estilo y tiles. Antes se esperaba, y eso ataba el LCP
          de la home —el logo del hero— a la inicialización del mapa: 8.6 s en
          la línea base móvil de Lighthouse (audit 5.6). Los markers y las
          rutas ya se enganchan solos cuando el mapa aparece: todos consumen
          `useMap()`, que devuelve null hasta entonces, y sus efectos dependen
          de él. El fondo crema con halos hace de póster mientras tanto. */}
      {children}
    </MapContext.Provider>
  );
});

Map.displayName = "Map";
