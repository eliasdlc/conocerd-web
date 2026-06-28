"use client";

import { useEffect, useRef, useState } from "react";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent } from "@/components/map/Map";
import { scrollToSection } from "@/lib/journeyNav";

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

const HEAT_CITIES = [
  { name: "Santiago",      lng: -70.6901, lat: 19.4517, color: "#F76C4D", size: 104 },
  { name: "Santo Domingo", lng: -69.93,   lat: 18.47,  color: "#FF8D16", size: 84  },
];

// ─── Stat number with count-up (runs once on first activation) ────────────────

function StatCount({
  target,
  dec,
  suffix,
  color,
  active,
}: {
  target: number;
  dec: number;
  suffix: string;
  color: string;
  active: boolean;
}) {
  const [display, setDisplay] = useState(`0${suffix}`);
  const animated = useRef(false);

  useEffect(() => {
    if (!active || animated.current) return;
    animated.current = true;
    const fmt0 = (v: number) => (dec ? v.toFixed(dec) : Math.round(v).toString());
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setDisplay(fmt0(target) + suffix));
      return;
    }
    const dur = 1300;
    const t0 = performance.now();
    const fmt = (v: number) => (dec ? v.toFixed(dec) : Math.round(v).toString());
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - k, 3);
      setDisplay(fmt(target * ease) + suffix);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, dec, suffix]);

  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize: 30,
        color,
        lineHeight: 1,
      }}
    >
      {display}
    </span>
  );
}

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
      {/* Heat glow circles pinned at city coordinates */}
      {isVisible &&
        HEAT_CITIES.map((city) => (
          <MapMarker
            key={city.name}
            longitude={city.lng}
            latitude={city.lat}
            anchor="center"
          >
            <MarkerContent>
              <div
                style={{
                  width: city.size,
                  height: city.size,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${city.color}55 0%, ${city.color}22 55%, transparent 80%)`,
                  border: `2px solid ${city.color}55`,
                  boxShadow: `0 0 ${city.size * 0.5}px ${city.color}40, 0 0 ${city.size * 0.25}px ${city.color}60`,
                  animation: "crdPulse 2.8s ease-in-out infinite",
                }}
              />
            </MarkerContent>
          </MapMarker>
        ))}

      {/* Overlay container */}
      <div
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
          className="crd-ol-panel"
          style={{
            position: "absolute",
            left: "clamp(16px, 3%, 40px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: "clamp(240px, 26vw, 308px)",
            animation: isVisible ? "slideUpIn 0.45s cubic-bezier(0.16,1,0.3,1) both" : "none",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "#FFE7DF",
              color: "#B23410",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              padding: "5px 12px",
              borderRadius: 999,
              marginBottom: 10,
            }}
          >
            <span className="ms" style={{ fontSize: 14 }}>storefront</span>
            Para negocios
          </div>

          {/* Heading */}
          <h2
            style={{
              margin: "0 0 12px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              letterSpacing: "-.025em",
              fontSize: "clamp(18px, 2.2vw, 26px)",
              lineHeight: 1.1,
              color: "#1D3A45",
              textShadow: "0 1px 2px rgba(253,248,240,0.95), 0 0 16px rgba(253,248,240,0.6)",
            }}
          >
            Más que una<br />vitrina digital
          </h2>

          {/* Benefit list inside glassmorphism card */}
          <div
            style={{
              background: "rgba(253,248,240,0.88)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid #EBE6D9",
              borderRadius: 16,
              padding: "13px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {BENEFITS.map((b, i) => (
              <div
                key={b.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  animation: isVisible
                    ? `slideUpIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.07 + 0.15}s both`
                    : "none",
                }}
              >
                <span className="ms" aria-hidden="true" style={{ fontSize: 20, color: "#0C6A60", flexShrink: 0, marginTop: 1 }}>
                  {b.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: 12.5,
                      color: "#264653",
                    }}
                  >
                    {b.title}
                  </div>
                  <div style={{ color: "#5B6B72", fontSize: 11.5, lineHeight: 1.4 }}>
                    {b.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stat numbers */}
          <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
            <div>
              <StatCount target={74.6} dec={1} suffix="%" color="#B23410" active={isVisible} />
              <p
                style={{
                  margin: "3px 0 0",
                  color: "#1D3A45",
                  fontSize: 11,
                  lineHeight: 1.35,
                  textShadow: "0 1px 2px rgba(253,248,240,0.9)",
                  maxWidth: 118,
                }}
              >
                quiere aparecer en la app
              </p>
            </div>
            <div>
              <StatCount target={60.6} dec={1} suffix="%" color="#985409" active={isVisible} />
              <p
                style={{
                  margin: "3px 0 0",
                  color: "#1D3A45",
                  fontSize: 11,
                  lineHeight: 1.35,
                  textShadow: "0 1px 2px rgba(253,248,240,0.9)",
                  maxWidth: 118,
                }}
              >
                aún depende del boca a boca
              </p>
            </div>
          </div>

          {/* CTA — jumps to the download/contact scene */}
          <button
            onClick={() => scrollToSection("trigger-cta")}
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
            <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>add_business</span>
            Registrar mi negocio
          </button>
        </div>

        {/* ── Right side — dashboard mockup ── */}
        <div
          className="crd-ol-panel-right"
          style={{
            position: "absolute",
            right: "clamp(16px, 4%, 56px)",
            top: "50%",
            transform: "translateY(-50%) rotate(1.4deg)",
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
              background: "linear-gradient(135deg,#FF6B4A,#F76C4D)",
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
                7
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
