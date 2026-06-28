"use client";

import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel } from "@/components/map/Map";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TEAM = [
  {
    name: "Brauny Núñez",
    role: "Líder de Proyecto y Estrategia",
    roleColor: "#B23410",
    bio: "Marketing, concentración en Inteligencia Estratégica. Lidera la visión, el branding y el modelo de negocio.",
    initials: "BN",
    bg: "#FFE7DF",
    color: "#B23410",
  },
  {
    name: "Elías de la Cruz",
    role: "Desarrollador y Líder Tecnológico",
    roleColor: "#0C6A60",
    bio: "Ingeniería en Ciencias de la Computación. Responsable de la arquitectura, el desarrollo y la tecnología.",
    initials: "EC",
    bg: "#C6F3EB",
    color: "#0C6A60",
  },
];

// PUCMM Santiago campus coordinates
const PUCMM = { lng: -70.7003, lat: 19.4414 };

// ─── Component ────────────────────────────────────────────────────────────────

export default function EquipoOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "equipo";

  return (
    <>
      {/* PUCMM campus pin */}
      {isVisible && (
        <MapMarker longitude={PUCMM.lng} latitude={PUCMM.lat} anchor="bottom">
          <MarkerContent>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#fff",
                border: "2.5px solid #F76C4D",
                boxShadow: "0 4px 14px rgba(247,108,77,0.40)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "mapBubbleIn 0.5s cubic-bezier(0.2,0.8,0.3,1) both",
              }}
            >
              <span className="ms" style={{ fontSize: 18, color: "#F76C4D" }}>
                school
              </span>
            </div>
          </MarkerContent>
          <MarkerLabel position="top">PUCMM · Santiago</MarkerLabel>
        </MapMarker>
      )}

      {/* Centered overlay — heading + team cards */}
      <div
        className="crd-ol-equipo"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: isVisible ? "auto" : "none",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "72px 24px 36px",
          gap: 20,
        }}
      >
        {/* Heading */}
        <div
          style={{
            textAlign: "center",
            animation: isVisible ? "slideUpIn 0.45s cubic-bezier(0.16,1,0.3,1) both" : "none",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "#FFE7DF",
              color: "#F76C4D",
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
            <span className="ms" style={{ fontSize: 14 }}>groups</span>
            El equipo
          </div>

          <h2
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              letterSpacing: "-.025em",
              fontSize: "clamp(20px, 2.8vw, 34px)",
              lineHeight: 1.08,
              color: "#1D3A45",
              textShadow: "0 1px 2px rgba(253,248,240,0.95), 0 0 16px rgba(253,248,240,0.6)",
            }}
          >
            Hecho por dominicanos,<br />para descubrir lo nuestro
          </h2>

          <p
            style={{
              margin: "8px auto 0",
              color: "#3A5560",
              fontSize: 14,
              lineHeight: 1.5,
              textShadow: "0 1px 2px rgba(253,248,240,0.9)",
            }}
          >
            Un equipo multidisciplinario de la PUCMM, Campus Santiago.
          </p>
        </div>

        {/* Team cards */}
        <div
          className="crd-ol-team"
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: 660,
          }}
        >
          {TEAM.map((member, i) => (
            <div
              key={member.name}
              style={{
                background: "rgba(253,248,240,0.90)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1.5px solid #EBE6D9",
                borderRadius: 20,
                padding: "22px 22px",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                flex: "1 1 280px",
                maxWidth: 310,
                animation: isVisible
                  ? `slideUpIn 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.1 + 0.15}s both`
                  : "none",
                boxShadow: "0 12px 36px rgba(38,70,83,0.14)",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: member.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 16px rgba(38,70,83,0.14)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  color: member.color,
                }}
              >
                {member.initials}
              </div>

              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#264653",
                    lineHeight: 1.2,
                  }}
                >
                  {member.name}
                </h3>
                <div
                  style={{
                    color: member.roleColor,
                    fontWeight: 700,
                    fontSize: 11.5,
                    margin: "3px 0 8px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {member.role}
                </div>
                <p
                  style={{
                    margin: 0,
                    color: "#5B6B72",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {member.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
