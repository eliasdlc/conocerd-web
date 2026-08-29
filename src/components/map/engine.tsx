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
import { MAP_STYLES } from "@/lib/basemap";
import { engancharMapa } from "@/lib/medicion";

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
  // La spec de MapLibre y no `{type: string}`: el tipo real admite una
  // expresión de zoom, que es lo que usa el recorrido para pasar de globo a
  // mercator a mitad de vuelo (lib/mapaLigero).
  projection?: maplibregl.ProjectionSpecification;
  viewport?: ViewState;
  onViewportChange?: (viewport: ViewState) => void;
  onLoad?: (map: maplibregl.Map) => void;
  loading?: React.ReactNode;
  initialViewState?: InitialViewState;
  interactive?: boolean;
  /**
   * Multiplicador de la caché de tiles. MapLibre la dimensiona como
   * `tilesDelViewport × maxTileCacheZoomLevels`, y su default de 5 deja 60
   * tiles en escritorio y 30 en móvil. Sirve para recorridos que se quedan en
   * una zona y vuelven a ella: sin esto cada regreso vuelve a pedir, parsear y
   * subir a GPU los mismos tiles.
   */
  maxTileCacheZoomLevels?: number;
  attributionControl?: boolean;
  scrollZoom?: boolean;
  dragPan?: boolean;
  dragRotate?: boolean;
  touchZoomRotate?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
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
    maxTileCacheZoomLevels,
    attributionControl = true,
    scrollZoom = true,
    dragPan = true,
    dragRotate = true,
    touchZoomRotate = true,
    children,
    className,
    style,
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
        maxTileCacheZoomLevels,
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
      });
    } catch (err) {
      // WebGL no disponible: maplibre lanza durante la construcción.
      fail(err);
      return;
    }

    // La sonda se engancha aquí y no en `load`: entre la construcción y ese
    // evento ya se cargan teselas, y contarlas desde `load` las perdía. Sin
    // `?medir=1` esta llamada no hace nada.
    engancharMapa(map);

    // Fallo del estilo (CDN caído): llega como evento `error` antes de que el
    // estilo cargue y `load` no va a disparar nunca. Los errores de tiles
    // sueltos ocurren con el estilo ya cargado y no entran aquí.
    map.on("error", (e) => {
      if (map && !mapRef.current && !map.isStyleLoaded()) fail(e.error ?? e);
    });

    map.on("load", () => {
      if (!map) return;
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
