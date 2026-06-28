"use client";

import { useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MapRoute } from "@/components/map/Map";
import { CategoryPin, SelfPin, GoalFlag } from "@/components/map/pins";
import {
  DESTINATIONS,
  CATEGORIES,
  CATEGORY_META,
  type Category,
  type Destination,
} from "@/data/destinations";
import { pathLengthKm, type LngLat } from "@/lib/geo";

// ─────────────────────────────────────────────────────────────────────────────
//  "Arma tu recorrido" (#8/#9): pines de categoría con card hover (con punta),
//  y constructor de ruta de alcance medio (agregar/quitar/reordenar paradas +
//  polilínea + resumen). Datos de la fuente de verdad única.
// ─────────────────────────────────────────────────────────────────────────────

const PANEL_BG = "rgba(253,248,240,0.92)";

// ─── Card hover con punta (#8) ────────────────────────────────────────────────

function HoverCard({ d }: { d: Destination }) {
  const meta = CATEGORY_META[d.category];
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 12px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: 220,
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 12px 32px rgba(38,70,83,0.22)",
        border: "1px solid #EBE6D9",
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: 104, background: "#F5EFE2" }}>
        <Image src={d.image} alt={d.name} fill sizes="220px" style={{ objectFit: "cover" }} />
        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            color: meta.ink,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 10.5,
          }}
        >
          <span className="ms" style={{ fontSize: 13 }}>{meta.icon}</span>
          {meta.label}
        </span>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 14, color: "#264653" }}>
            {d.name}
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 12, color: "#985409", whiteSpace: "nowrap" }}>
            ★ {d.rating.toFixed(1)}
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#5B6B72", marginTop: 2 }}>
          {d.province}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {d.activities.map((a) => (
            <span
              key={a}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                color: "#5B6B72",
                background: "#F5EFE2",
                borderRadius: 6,
                padding: "2px 7px",
              }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>
      {/* Punta (tail) apuntando al pin */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          width: 14,
          height: 14,
          background: "#fff",
          borderRight: "1px solid #EBE6D9",
          borderBottom: "1px solid #EBE6D9",
          transform: "translate(-50%,-50%) rotate(45deg)",
        }}
      />
    </div>
  );
}

// ─── Pin individual (hover + click para agregar/quitar de la ruta) ────────────

function PinMarker({
  d,
  routeIndex,
  routeLen,
  onToggle,
}: {
  d: Destination;
  routeIndex: number; // -1 si no está en la ruta
  routeLen: number;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inRoute = routeIndex >= 0;
  const isStart = inRoute && routeIndex === 0;
  const isGoal = inRoute && routeLen > 1 && routeIndex === routeLen - 1;

  return (
    <MapMarker longitude={d.coords[0]} latitude={d.coords[1]}>
      <MarkerContent>
        <div
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={onToggle}
          style={{ position: "relative", cursor: "pointer", zIndex: hover ? 40 : undefined }}
        >
          {isStart ? (
            <SelfPin heading={0} size={34} />
          ) : isGoal ? (
            <GoalFlag size={36} />
          ) : (
            <CategoryPin category={d.category} state={inRoute ? "done" : "default"} size={30} />
          )}

          {/* Badge de orden para paradas intermedias */}
          {inRoute && !isStart && !isGoal && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                borderRadius: 999,
                background: "#264653",
                color: "#fff",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: 10,
                lineHeight: "16px",
                textAlign: "center",
              }}
            >
              {routeIndex + 1}
            </span>
          )}

          {hover && <HoverCard d={d} />}
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// ─── Panel del recorrido (#9) ─────────────────────────────────────────────────

function RoutePanel({
  stops,
  onRemove,
  onMove,
  onClear,
}: {
  stops: Destination[];
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onClear: () => void;
}) {
  const coords: LngLat[] = stops.map((s) => s.coords);
  const km = stops.length >= 2 ? Math.round(pathLengthKm(coords)) : 0;

  return (
    <div
      style={{
        position: "absolute",
        right: "clamp(16px, 3%, 40px)",
        top: "50%",
        transform: "translateY(-50%)",
        width: 264,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        background: PANEL_BG,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid #EBE6D9",
        borderRadius: 20,
        padding: "16px 18px",
        boxShadow: "0 8px 32px rgba(38,70,83,0.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 13, color: "#264653" }}>
          Tu recorrido
        </div>
        {stops.length > 0 && (
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: "#B23410",
            }}
          >
            Limpiar
          </button>
        )}
      </div>

      {stops.length === 0 ? (
        <p style={{ margin: "12px 0 2px", fontSize: 12.5, lineHeight: 1.5, color: "#5B6B72" }}>
          Toca los pines del mapa para armar tu ruta. Reordena las paradas y mira la distancia total.
        </p>
      ) : (
        <>
          <div style={{ overflowY: "auto", margin: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            {stops.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  borderRadius: 10,
                  padding: "6px 8px",
                }}
              >
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: CATEGORY_META[s.category].color,
                    color: "#fff",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 10,
                    lineHeight: "18px",
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: "#264653", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#5B6B72" }}>
                    {s.province}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <IconBtn label="Subir" disabled={i === 0} onClick={() => onMove(s.id, -1)}>arrow_upward</IconBtn>
                  <IconBtn label="Bajar" disabled={i === stops.length - 1} onClick={() => onMove(s.id, 1)}>arrow_downward</IconBtn>
                  <IconBtn label="Quitar" onClick={() => onRemove(s.id)}>close</IconBtn>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #EBE6D9", paddingTop: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: "#264653" }}>
            {stops.length} {stops.length === 1 ? "parada" : "paradas"}
            {km > 0 && <span style={{ color: "#5B6B72", fontWeight: 600 }}> · ~{km} km</span>}
          </div>
        </>
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 6,
        border: "1px solid #EBE6D9",
        background: "#fff",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        color: "#5B6B72",
        padding: 0,
      }}
    >
      <span className="ms" style={{ fontSize: 14 }}>{children}</span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapaOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "mapa";

  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(CATEGORIES)
  );
  const [route, setRoute] = useState<string[]>([]);

  function toggleCategory(id: Category) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStop(id: string) {
    setRoute((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function moveStop(id: string, dir: -1 | 1) {
    setRoute((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const stops = route
    .map((id) => DESTINATIONS.find((d) => d.id === id))
    .filter((d): d is Destination => Boolean(d));
  const routeCoords: LngLat[] = stops.map((s) => s.coords);

  return (
    <>
      {/* Polilínea del recorrido */}
      {isVisible && routeCoords.length >= 2 && (
        <MapRoute id="route-builder" coordinates={routeCoords} color="#F47F0E" width={3.5} opacity={0.95} dashArray={[1, 1.6]} />
      )}

      {/* Pines de categoría */}
      {isVisible &&
        DESTINATIONS.filter((d) => activeCategories.has(d.category)).map((d) => (
          <PinMarker
            key={d.id}
            d={d}
            routeIndex={route.indexOf(d.id)}
            routeLen={route.length}
            onToggle={() => toggleStop(d.id)}
          />
        ))}

      {/* Capa de UI */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          // El wrapper no captura punteros; cada panel reactiva pointerEvents
          // para no bloquear los pines (MapMarkers) del mapa.
          pointerEvents: "none",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
          zIndex: 10,
        }}
      >
        {/* Filtro de categorías (abajo-izq) */}
        <div
          style={{
            position: "absolute",
            left: "clamp(16px, 3%, 40px)",
            bottom: "clamp(24px, 4%, 48px)",
            background: PANEL_BG,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid #EBE6D9",
            borderRadius: 20,
            padding: "18px 20px",
            minWidth: 240,
            boxShadow: "0 8px 32px rgba(38,70,83,0.10)",
            pointerEvents: isVisible ? "auto" : "none",
          }}
        >
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 13, color: "#264653", marginBottom: 14 }}>
            Arma tu recorrido
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const isActive = activeCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1.5px solid ${isActive ? meta.color : "#EBE6D9"}`,
                    background: isActive ? `${meta.color}1A` : "transparent",
                    color: isActive ? meta.ink : "#5B6B72",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 12.5,
                    cursor: "pointer",
                    transition: "border-color 0.2s, background 0.2s, color 0.2s",
                  }}
                  aria-pressed={isActive}
                >
                  <span className="ms" style={{ fontSize: 14 }}>{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel del recorrido (der) */}
        <div style={{ pointerEvents: isVisible ? "auto" : "none" }}>
          <RoutePanel
            stops={stops}
            onRemove={(id) => toggleStop(id)}
            onMove={moveStop}
            onClear={() => setRoute([])}
          />
        </div>
      </div>
    </>
  );
}
