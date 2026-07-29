"use client";

import { useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel } from "@/components/map/Map";

// ─── Data ─────────────────────────────────────────────────────────────────────

type Member = {
  name: string;
  role: string;
  roleColor: string;
  bio: string;
  bioLong: string;
  initials: string;
  bg: string;
  color: string;
  photo?: string; // foto real cuando la manden; hoy iniciales
};

// Handles placeholder hasta tener los reales.
const TEAM: Member[] = [
  {
    name: "Brauny Núñez",
    role: "Líder de Proyecto y Estrategia",
    roleColor: "#B23410",
    bio: "Lidera la visión, el branding y el modelo de negocio.",
    bioLong:
      "Marketing con concentración en Inteligencia Estratégica. Conecta la visión de producto con el mercado dominicano y dirige el branding y el modelo de negocio de ConoceRD.",
    initials: "BN",
    bg: "#FFE7DF",
    color: "#B23410",
  },
  {
    name: "Elías de la Cruz",
    role: "Desarrollador y Líder Tecnológico",
    roleColor: "#0C6A60",
    bio: "Responsable de la arquitectura, el desarrollo y la tecnología.",
    bioLong:
      "Ingeniería en Ciencias de la Computación. Diseña la arquitectura, construye la app y el sitio, y lidera todas las decisiones técnicas del proyecto.",
    initials: "EC",
    bg: "#C6F3EB",
    color: "#0C6A60",
  },
];

// PUCMM Santiago campus coordinates
const PUCMM = { lng: -70.7003, lat: 19.4414 };

// ─── Team card (vertical, hover = redes + bio extendida) ──────────────────────

function TeamCard({ member, delay, animate }: { member: Member; delay: number; animate: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        background: "rgba(253,248,240,0.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1.5px solid #EBE6D9",
        borderRadius: 22,
        padding: "24px 22px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        flex: "1 1 260px",
        maxWidth: 300,
        boxShadow: expanded ? "0 22px 50px rgba(38,70,83,0.20)" : "0 12px 36px rgba(38,70,83,0.14)",
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease",
        animation: animate ? `slideUpIn 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s both` : "none",
      }}
    >
      {/* Avatar grande */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: member.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 8px 20px rgba(38,70,83,0.16)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: 30,
          color: member.color,
        }}
      >
        {member.photo ? (
          <Image src={member.photo} alt={member.name} fill sizes="96px" style={{ objectFit: "cover" }} />
        ) : (
          member.initials
        )}
      </div>

      {/* Nombre → posición → descripción */}
      <h3
        style={{
          margin: "14px 0 0",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: 17,
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
          fontSize: 12,
          margin: "4px 0 8px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {member.role}
      </div>
      <p style={{ margin: 0, color: "#5B6B72", fontSize: 12.5, lineHeight: 1.5 }}>
        {member.bio}
      </p>

      {/* The extended profile is an explicit disclosure, not hover-only. */}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        style={{ marginTop: 12, minHeight: 44, border: "none", background: "transparent", color: member.color, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, cursor: "pointer" }}
      >
        {expanded ? "Ver menos" : "Más sobre el equipo"}
      </button>
      <div
        style={{
          width: "100%",
          maxHeight: expanded ? 180 : 0,
          opacity: expanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
        }}
      >
        <p style={{ margin: "10px 0 0", color: "#5B6B72", fontSize: 11.5, lineHeight: 1.5, borderTop: "1px solid #EBE6D9", paddingTop: 10 }}>
          {member.bioLong}
        </p>
      </div>
    </div>
  );
}

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
                width: 38,
                height: 38,
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
              <span className="ms" aria-hidden="true" style={{ fontSize: 19, color: "#B23410" }}>school</span>
            </div>
          </MarkerContent>
          <MarkerLabel position="top">PUCMM · Santiago</MarkerLabel>
        </MapMarker>
      )}

      {/* Overlay — encabezado arriba, cards abajo (deja ver el pin al centro) */}
      <div
        className="crd-ol-equipo"
        aria-hidden={!isVisible}
        inert={!isVisible}
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
          justifyContent: "space-between",
          padding: "92px 24px 44px",
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
            <span className="ms" aria-hidden="true" style={{ fontSize: 14 }}>groups</span>
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

        {/* Team cards (abajo) */}
        <div
          className="crd-ol-team"
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "flex-start",
            width: "100%",
            maxWidth: 640,
          }}
        >
          {TEAM.map((member, i) => (
            <TeamCard key={member.name} member={member} delay={i * 0.1 + 0.15} animate={isVisible} />
          ))}
        </div>
      </div>
    </>
  );
}
