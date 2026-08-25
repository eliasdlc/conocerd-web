"use client";

import type { Feature, FeatureCollection, LineString } from "geojson";
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
          la línea base móvil de Lighthouse (audit 5.6). Los markers, rutas y
          arcos ya se enganchan solos cuando el mapa aparece: todos consumen
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

// ─── MarkerTooltip ───────────────────────────────────────────────────────────

export function MarkerTooltip({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0F1A2E",
            color: "#fff",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── MarkerPopup ─────────────────────────────────────────────────────────────

export interface MarkerPopupProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export function MarkerPopup({ children, onClose }: MarkerPopupProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 12px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        border: "1px solid #EBE6D9",
        minWidth: 160,
        zIndex: 10,
      }}
    >
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            color: "#677080",
          }}
          aria-label="Cerrar"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── MapPopup ────────────────────────────────────────────────────────────────

export interface MapPopupProps {
  longitude: number;
  latitude: number;
  closeButton?: boolean;
  offset?: number;
  children: React.ReactNode;
}

export function MapPopup({
  longitude,
  latitude,
  closeButton = true,
  offset,
  children,
}: MapPopupProps) {
  const map = useMap();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal host SSR-safe (createElement solo en cliente)
    setContainer(div);
    return () => setContainer(null);
  }, []);

  useEffect(() => {
    if (!map || !container) return;

    const popup = new maplibregl.Popup({ closeButton, offset })
      .setLngLat([longitude, latitude])
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;
    return () => {
      popup.remove();
      popupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, container, closeButton]);

  useEffect(() => {
    popupRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  if (!container) return null;
  return createPortal(children, container);
}

// ─── MapControls ─────────────────────────────────────────────────────────────

export interface MapControlsProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  zoom?: boolean;
  compass?: boolean;
  locate?: boolean;
  fullscreen?: boolean;
}

export function MapControls({
  position = "top-right",
  zoom = true,
  compass = true,
  locate = false,
  fullscreen = false,
}: MapControlsProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const controls: maplibregl.IControl[] = [];

    if (zoom || compass) {
      const nav = new maplibregl.NavigationControl({
        showZoom: zoom,
        showCompass: compass,
        visualizePitch: true,
      });
      map.addControl(nav, position);
      controls.push(nav);
    }

    if (fullscreen) {
      const fs = new maplibregl.FullscreenControl();
      map.addControl(fs, position);
      controls.push(fs);
    }

    if (locate) {
      const geo = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });
      map.addControl(geo, position);
      controls.push(geo);
    }

    return () => {
      controls.forEach((c) => {
        try {
          map.removeControl(c);
        } catch {
          /* already removed */
        }
      });
    };
  }, [map, position, zoom, compass, locate, fullscreen]);

  return null;
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

// ─── MapArc ──────────────────────────────────────────────────────────────────
// Curva (bezier cuadrática) entre dos puntos con flujo dashed en movimiento
// ("marching ants"). Para los arcos de "personas en camino" (#11).

function arcCoords(
  from: [number, number],
  to: [number, number],
  bend: number,
  n: number
): [number, number][] {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const ctrl = [mid[0] + nx * dist * bend, mid[1] + ny * dist * bend];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    pts.push([
      u * u * from[0] + 2 * u * t * ctrl[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * ctrl[1] + t * t * to[1],
    ]);
  }
  return pts;
}

// Secuencia de dasharrays que desplaza el patrón → ilusión de flujo.
const DASH_SEQ: number[][] = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5],
  [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2],
  [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
];

export interface MapArcProps {
  id: string;
  from: [number, number];
  to: [number, number];
  color?: string;
  width?: number;
  bend?: number;
  animated?: boolean;
}

export function MapArc({
  id,
  from,
  to,
  color = "#FF8D16",
  width = 2.5,
  bend = 0.25,
  animated = true,
}: MapArcProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const sourceId = `arc-src-${id}`;
    const layerId = `arc-${id}`;
    const data: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: arcCoords(from, to, bend, 48) },
    };

    // Mismo blindaje que MapRoute: con el GL muerto, addSource lanza.
    try {
      if (!map.getSource(sourceId)) map.addSource(sourceId, { type: "geojson", data });
      else (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": width,
            "line-opacity": 0.85,
            "line-dasharray": [0, 4, 3],
          },
        });
      }
    } catch {
      return;
    }

    let raf = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animated && !reduce) {
      let i = 0;
      let last = 0;
      const tick = (t: number) => {
        if (t - last > 55) {
          last = t;
          i = (i + 1) % DASH_SEQ.length;
          try {
            if (map.getLayer(layerId)) map.setPaintProperty(layerId, "line-dasharray", DASH_SEQ[i]);
          } catch {}
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
      try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id, color, width, bend, animated]);

  return null;
}

// ─── MapClusterLayer ─────────────────────────────────────────────────────────

export interface MapClusterLayerProps {
  id: string;
  data: FeatureCollection;
  color?: string;
  clusterRadius?: number;
  maxZoom?: number;
}

export function MapClusterLayer({
  id,
  data,
  color = "#E0552F",
  clusterRadius = 50,
  maxZoom = 14,
}: MapClusterLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const sourceId = `cluster-src-${id}`;
    const circlesId = `cluster-circles-${id}`;
    const countId = `cluster-count-${id}`;
    const pointId = `cluster-point-${id}`;

    map.addSource(sourceId, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom: maxZoom,
      clusterRadius,
    });

    map.addLayer({
      id: circlesId,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": color,
        "circle-radius": ["step", ["get", "point_count"], 20, 10, 30, 50, 40],
        "circle-opacity": 0.85,
      },
    });

    map.addLayer({
      id: countId,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: { "text-field": "{point_count_abbreviated}", "text-size": 13 },
      paint: { "text-color": "#fff" },
    });

    map.addLayer({
      id: pointId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": color,
        "circle-radius": 8,
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    return () => {
      [circlesId, countId, pointId].forEach((l) => {
        try {
          if (map.getLayer(l)) map.removeLayer(l);
        } catch {}
      });
      try {
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, id]);

  return null;
}
