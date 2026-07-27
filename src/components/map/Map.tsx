"use client";

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

  useImperativeHandle(ref, () => mapRef.current as maplibregl.Map, [ready]);

  useEffect(() => {
    if (!containerRef.current) return;

    const styleUrl =
      styles ?? MAP_STYLES[theme as keyof typeof MAP_STYLES] ?? MAP_STYLES.light;

    const center: [number, number] =
      initialViewState?.longitude !== undefined
        ? [initialViewState.longitude, initialViewState.latitude ?? 0]
        : (viewport?.center ?? [-70.1627, 18.7357]);

    const map = new maplibregl.Map({
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

    map.on("load", () => {
      if (projection?.type) {
        map.setProjection({ type: projection.type as "mercator" | "globe" });
      }
      onLoad?.(map);
      mapRef.current = map;
      setReady(true);
    });

    if (onViewportChange) {
      map.on("moveend", () => {
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
      map.remove();
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
      {!ready && loading}
      {ready && children}
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
  children?: React.ReactNode;
}

export function MapMarker({
  longitude,
  latitude,
  anchor = "center" as maplibregl.PositionAnchor,
  offset,
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
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid #EBE6D9",
        borderRadius: 8,
        padding: "3px 8px",
        fontSize: 11,
        fontFamily: "var(--font-caveat), cursive",
        fontWeight: 700,
        color: "#264653",
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
            background: "#264653",
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
            color: "#5B6B72",
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
  color = "#F76C4D",
  width = 3,
  opacity = 1,
  dashArray,
}: MapRouteProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || coordinates.length < 2) return;

    const sourceId = `route-source-${id}`;
    const layerId = `route-layer-${id}`;

    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    };

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
  color = "#F47F0E",
  width = 2.5,
  bend = 0.25,
  animated = true,
}: MapArcProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const sourceId = `arc-src-${id}`;
    const layerId = `arc-${id}`;
    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: arcCoords(from, to, bend, 48) },
    };

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
  data: GeoJSON.FeatureCollection;
  color?: string;
  clusterRadius?: number;
  maxZoom?: number;
}

export function MapClusterLayer({
  id,
  data,
  color = "#F76C4D",
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
