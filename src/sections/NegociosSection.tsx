"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MapArc } from "@/components/map/Map";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import type { LngLat } from "@/lib/geo";

// ─── Data ─────────────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: "visibility", title: "Más visibilidad ante viajeros reales", desc: "Perfil digital con fotos, reseñas y contacto directo." },
  { icon: "insights",   title: "Decisiones basadas en datos",          desc: "Visitas, flujo de clientes y procedencia, en tiempo real." },
  { icon: "qr_code_2",  title: "Trato especial con QR",               desc: "Reconoce a tus clientes de ConoceRD al escanear." },
];

const BARS = [
  { label: "Santiago",    pct: 86, color: "#F76C4D", delay: "0s"    },
  { label: "Sto. Dgo.",  pct: 64, color: "#FF8D16", delay: ".15s"  },
  { label: "Extranjero",  pct: 41, color: "#25CCB8", delay: ".30s"  },
];

// #11 — el negocio (Santiago) y las provincias desde donde "vienen" clientes.
// El nº de orígenes alimenta el dashboard ("Clientes en camino ahora").
const BUSINESS: LngLat = [-70.6901, 19.4517];

const ARC_ORIGINS: { name: string; coords: LngLat; color: string }[] = [
  { name: "Santo Domingo", coords: [-69.93, 18.47], color: "#F76C4D" },
  { name: "Puerto Plata",  coords: [-70.69, 19.79], color: "#FF8D16" },
  { name: "La Romana",     coords: [-68.97, 18.43], color: "#25CCB8" },
  { name: "Samaná",        coords: [-69.34, 19.20], color: "#FF8D16" },
  { name: "Barahona",      coords: [-71.10, 18.21], color: "#F76C4D" },
  { name: "Punta Cana",    coords: [-68.40, 18.58], color: "#25CCB8" },
];

const ARRIVING = ARC_ORIGINS.length;

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function NegociosOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "negocios";

  // Bars animate to full width once, 350 ms after overlay fades in
  const [barsActive, setBarsActive] = useState(false);
  const barsRef = useRef(false);

  useEffect(() => {
    if (!isVisible || barsRef.current) return;
    barsRef.current = true;
    const t = setTimeout(() => setBarsActive(true), 350);
    return () => clearTimeout(t);
  }, [isVisible]);

  return (
    <>
      {/* #11 — arcos animados desde varias provincias convergiendo al negocio */}
      {isVisible &&
        ARC_ORIGINS.map((o, i) => (
          <MapArc
            key={o.name}
            id={`negocio-arc-${i}`}
            from={o.coords}
            to={BUSINESS}
            color={o.color}
            width={2.4}
            bend={0.22}
            animated={false}
          />
        ))}

      {/* #11 — pin "Tu negocio" en Santiago */}
      {isVisible && (
        <MapMarker longitude={BUSINESS[0]} latitude={BUSINESS[1]} anchor="bottom">
          <MarkerContent>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  background: "rgba(38,70,83,0.92)",
                  color: "#fff",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 10.5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(38,70,83,0.25)",
                }}
              >
                Tu negocio
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#FF8D16",
                  border: "2.5px solid #FBF7EF",
                  boxShadow: "0 4px 14px rgba(255,141,22,0.42)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="ms" aria-hidden="true" style={{ fontSize: 22, color: "#fff" }}>storefront</span>
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      )}

      {/* Overlay container */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: isVisible ? "auto" : "none",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
          zIndex: 10,
        }}
      >
        {/* ── Left column ── */}
        <div
          className="crd-ol-panel crd-business-story"
          style={{
            position: "absolute",
            left: "clamp(16px, 3%, 40px)",
            top: "clamp(82px, 11dvh, 112px)",
            width: "clamp(240px, 26vw, 308px)",
            animation: isVisible ? "slideUpIn 0.45s cubic-bezier(0.16,1,0.3,1) both" : "none",
          }}
        >
          <div className="crd-business-kicker">
            <span className="ms" aria-hidden="true">storefront</span>
            <span>ConoceRD para negocios</span>
          </div>

          <h2 className="crd-business-title">Tu negocio, dentro de la ruta</h2>
          <p className="crd-business-intro">Haz que el interés de los viajeros se convierta en una visita real.</p>

          <div className="crd-business-route" aria-label="Cómo funciona ConoceRD para tu negocio">
            <div className="crd-business-route-label">
              <span>La ruta del cliente</span>
              <span aria-hidden="true">→</span>
            </div>
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                className="crd-business-benefit"
                style={{
                  animation: isVisible
                    ? `slideUpIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.07 + 0.15}s both`
                    : "none",
                }}
              >
                <span className="ms crd-business-benefit-icon" aria-hidden="true">
                  {b.icon}
                </span>
                <div>
                  <div className="crd-business-benefit-title">{b.title}</div>
                  <div className="crd-business-benefit-desc">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <p className="crd-business-disclaimer">
            Panel y rutas mostrados como demostración de producto; las métricas se activarán con datos verificables.
          </p>

          {/* CTA — lleva al formulario con el toggle ya en "negocio" */}
          <button
            onClick={() => requestSubscribe("negocio")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#25CCB8",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "11px 18px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 13.5,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(37,204,184,0.38)",
              transition: "background 0.2s, transform 0.2s",
            }}
          >
            <span className="ms" aria-hidden="true" style={{ fontSize: 18, color: "#fff" }}>add_business</span>
            Registrar mi negocio
          </button>
        </div>

        {/* ── Right side — dashboard mockup ── */}
        <div
          className="crd-ol-panel-right crd-business-dashboard"
          style={{
            position: "absolute",
            right: "clamp(16px, 4%, 56px)",
            top: "clamp(86px, 14dvh, 132px)",
            width: "clamp(250px, 27vw, 340px)",
            background: "#fff",
            borderRadius: 22,
            padding: 18,
            boxShadow: "0 30px 70px rgba(38,70,83,.22)",
            animation: isVisible ? "slideUpIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both" : "none",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#264653",
                }}
              >
                Panel de tu negocio
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#66747B",
                }}
              >
                Datos de demostración
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#C6F3EB",
                borderRadius: 999,
                padding: "4px 10px",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#25CCB8",
                  animation: "crdLiveDot 1.4s ease-in-out infinite",
                  display: "block",
                }}
              />
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  color: "#1a9b8c",
                }}
              >
                EN VIVO
              </span>
            </div>
          </div>

          {/* Clientes en camino */}
          <div
            style={{
              background: "#FF8D16",
              borderRadius: 14,
              padding: "14px 16px",
              color: "#fff",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.92, fontWeight: 600 }}>
              Clientes en camino ahora
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: 38,
                  lineHeight: 1,
                }}
              >
                {ARRIVING}
              </span>
              <span style={{ fontSize: 12, opacity: 0.9 }}>personas llegando</span>
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[
              { label: "Hoy",    count: "142" },
              { label: "Semana", count: "980" },
              { label: "Mes",    count: "4.2k" },
            ].map((item) => (
              <div
                key={item.label}
                style={{ background: "#FDF8F0", borderRadius: 12, padding: 10 }}
              >
                <div style={{ fontSize: 10, color: "#66747B", fontWeight: 600 }}>
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "#264653",
                  }}
                >
                  {item.count}
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart — procedencia */}
          <div style={{ background: "#FDF8F0", borderRadius: 13, padding: "12px 13px" }}>
            <div
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 11.5,
                color: "#264653",
                marginBottom: 9,
              }}
            >
              Procedencia de clientes
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {BARS.map((b) => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 58, fontSize: 11, color: "#5B6B72", flexShrink: 0 }}>
                    {b.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "#EBE6D9",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: barsActive ? `${b.pct}%` : "0%",
                        background: b.color,
                        borderRadius: 99,
                        transition: `width 1.2s cubic-bezier(.2,.8,.3,1) ${b.delay}`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
