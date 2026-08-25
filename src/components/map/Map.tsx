"use client";

import type { Feature, LineString } from "geojson";
import maplibregl from "maplibre-gl";
import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

// ─── Context ─────────────────────────────────────────────────────────────────

const MapContext = createContext<maplibregl.Map | null>(null);

export function useMap(): maplibregl.Map | null {
  return useContext(MapContext);
}

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
  projection?: { type: string };
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
      if (projection?.type) {
        map.setProjection({ type: projection.type as "mercator" | "globe" });
      }
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

  return (
    // eslint-disable-next-line react-hooks/refs -- ref leído tras `ready`; valor estable post-load
    <MapContext.Provider value={ready ? mapRef.current : null}>
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

// ─── MapMarker ───────────────────────────────────────────────────────────────

export interface MapMarkerProps {
  longitude: number;
  latitude: number;
  anchor?: maplibregl.PositionAnchor;
  offset?: [number, number];
  /**
   * Apilado entre marcadores. MapLibre le pone `transform` a cada marcador, lo
   * que crea un stacking context: un `z-index` puesto dentro del marcador no
   * puede pasar por encima de los marcadores vecinos. Para que un popup tape a
   * los demás pines hay que subir el marcador mismo.
   */
  zIndex?: number;
  children?: React.ReactNode;
}

export function MapMarker({
  longitude,
  latitude,
  anchor = "center" as maplibregl.PositionAnchor,
  offset,
  zIndex,
  children,
}: MapMarkerProps) {
  const map = useMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal host SSR-safe (createElement solo en cliente)
    setEl(div);
    return () => setEl(null);
  }, []);

  useEffect(() => {
    if (!map || !el) return;

    const marker = new maplibregl.Marker({ element: el, anchor, offset })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  // anchor and offset are stable refs — omitting to avoid spurious remounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  useEffect(() => {
    const node = markerRef.current?.getElement();
    if (!node) return;
    node.style.zIndex = zIndex === undefined ? "" : String(zIndex);
  }, [el, zIndex]);

  if (!el) return null;
  return createPortal(children, el);
}

// ─── MarkerContent ───────────────────────────────────────────────────────────

export function MarkerContent({ children }: { children: React.ReactNode }) {
  return <div style={{ position: "relative" }}>{children}</div>;
}

// ─── MarkerLabel ─────────────────────────────────────────────────────────────

export interface MarkerLabelProps {
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function MarkerLabel({ children, position = "top" }: MarkerLabelProps) {
  const posStyle: React.CSSProperties =
    position === "top"
      ? { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
      : position === "bottom"
      ? { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }
      : position === "left"
      ? { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" }
      : { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" };

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        whiteSpace: "nowrap",
        background: "var(--crd-glass)",
        backdropFilter: "blur(24px) saturate(1.8)",
        border: "1px solid var(--crd-glass-line)",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 11,
        // La etiqueta del marcador es interfaz, no contenido: deja la
        // manuscrita, que en el sistema vive sólo en la firma del equipo.
        fontFamily: "var(--font-jakarta), system-ui, sans-serif",
        fontWeight: 700,
        color: "#0F1A2E",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

// ─── MapRoute ────────────────────────────────────────────────────────────────

export interface MapRouteProps {
  id: string;
  coordinates: [number, number][];
  color?: string;
  width?: number;
  opacity?: number;
  dashArray?: number[];
}

export function MapRoute({
  id,
  coordinates,
  color = "#E0552F",
  width = 3,
  opacity = 1,
  dashArray,
}: MapRouteProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || coordinates.length < 2) return;

    const sourceId = `route-source-${id}`;
    const layerId = `route-layer-${id}`;

    const data: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

    // Si el GL del mapa murió (p. ej. SwiftShader sin recursos), maplibre
    // lanza desde getSource/addSource con el style ya nulo. Una ruta que no
    // puede pintarse se omite; no puede tumbar la página completa.
    try {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data });
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      }

      if (!map.getLayer(layerId)) {
        const paint: Record<string, unknown> = {
          "line-color": color,
          "line-width": width,
          "line-opacity": opacity,
        };
        if (dashArray) paint["line-dasharray"] = dashArray;

        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint,
        });
      }
    } catch {
      return;
    }

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      } catch {}
      try {
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id, color, width, opacity]);

  // Actualiza la geometría cuando cambian las coordenadas SIN rehacer la capa:
  // el efecto de arriba no depende de `coordinates` a propósito (rehacer capa
  // y source por cada parada añadida parpadea). El route-builder cambia la
  // polilínea en vivo y sin esto la línea se quedaba con la primera versión.
  useEffect(() => {
    if (!map || coordinates.length < 2) return;
    try {
      const src = map.getSource(`route-source-${id}`) as maplibregl.GeoJSONSource | undefined;
      src?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    } catch {}
  }, [map, id, coordinates]);

  return null;
}

