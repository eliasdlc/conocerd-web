"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  La mitad del mapa que NO necesita maplibre en runtime.
//
//  Aquí vive todo lo que las secciones importan (`useMap`, `MapMarker`,
//  `MapRoute`, las envolturas de marcador) y ninguna de esas piezas construye
//  un objeto de maplibre por su cuenta: unas sólo hablan con la instancia del
//  mapa que ya existe, y `MapMarker` recibe el propio módulo por contexto.
//
//  Eso es lo que permite que el runtime de WebGL (1 MB) llegue por import
//  dinámico de verdad: `import type` se borra al compilar, así que este archivo
//  entra en el grafo inicial sin arrastrar el motor detrás. El motor vive en
//  `engine.tsx` y es quien puebla este contexto.
// ─────────────────────────────────────────────────────────────────────────────

import type { Feature, LineString } from "geojson";
import type maplibregl from "maplibre-gl";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * El motor publica dos cosas: la instancia del mapa y el módulo de maplibre.
 * El módulo viaja por aquí y no por un import para que nadie que consuma el
 * contexto lo meta en el grafo inicial.
 */
export interface MapContextValue {
  map: maplibregl.Map;
  gl: typeof maplibregl;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMap(): maplibregl.Map | null {
  return useContext(MapContext)?.map ?? null;
}

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
  const ctx = useContext(MapContext);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement("div");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal host SSR-safe (createElement solo en cliente)
    setEl(div);
    return () => setEl(null);
  }, []);

  useEffect(() => {
    if (!ctx || !el) return;

    const marker = new ctx.gl.Marker({ element: el, anchor, offset })
      .setLngLat([longitude, latitude])
      .addTo(ctx.map);

    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
  // anchor and offset are stable refs — omitting to avoid spurious remounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, el]);

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
