"use client";

import { useState } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel } from "@/components/map/Map";
import { PIN_CHROME } from "@/components/map/pins";
import Kicker from "@/components/Kicker";

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

// ─── Team card (disclosure explícito con la bio extendida) ────────────────────

function TeamCard({ member, delay, animate }: { member: Member; delay: number; animate: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`relative flex max-w-[300px] flex-[1_1_260px] flex-col items-center rounded-panel border-[1.5px] border-line bg-cream/92 px-[22px] pb-5 pt-6 text-center backdrop-blur-[18px] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${expanded ? "shadow-modal" : "shadow-panel"}
        ${animate ? "animate-slide-up" : ""}`}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      {/* Avatar grande */}
      <div
        className="relative flex size-24 items-center justify-center overflow-hidden rounded-full font-display text-3xl font-bold shadow-panel"
        style={{ background: member.bg, color: member.color }}
      >
        {member.photo ? (
          <Image src={member.photo} alt={member.name} fill sizes="96px" className="object-cover" />
        ) : (
          member.initials
        )}
      </div>

      {/* Nombre → posición → descripción */}
      <h3 className="m-0 mt-3.5 text-lead font-bold leading-[1.2] text-ink">
        {member.name}
      </h3>
      <div
        className="mb-2 mt-1 text-xs font-bold"
        style={{ color: member.roleColor }}
      >
        {member.role}
      </div>
      <p className="m-0 text-tiny leading-[1.5] text-muted">{member.bio}</p>

      {/* The extended profile is an explicit disclosure, not hover-only. */}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="mt-3 min-h-[44px] cursor-pointer border-none bg-transparent font-bold"
        style={{ color: member.color }}
      >
        {expanded ? "Ver menos" : "Más sobre el equipo"}
      </button>
      <div
        className={`w-full overflow-hidden transition-[max-height,opacity] duration-[400ms,300ms] ease-[cubic-bezier(0.16,1,0.3,1),ease] ${
          expanded ? "max-h-[180px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="m-0 mt-2.5 border-t border-line pt-2.5 text-mini leading-[1.5] text-muted">
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
            <div className={`flex size-[38px] animate-[mapBubbleIn_0.5s_cubic-bezier(0.2,0.8,0.3,1)_both] items-center justify-center rounded-full bg-white ${PIN_CHROME}`}>
              <Icon name="school" className="text-[19px] text-coral-ink" />
            </div>
          </MarkerContent>
          {/* A la derecha y no arriba: encima del pin caía justo sobre la
              etiqueta "Santiago de los Caballeros" del mapa (audit 2.7). */}
          <MarkerLabel position="right">PUCMM · Santiago</MarkerLabel>
        </MapMarker>
      )}

      {/* Overlay — encabezado arriba, cards abajo (deja ver el pin al centro) */}
      <div
        className={`crd-ol-equipo absolute inset-0 z-10 flex flex-col items-center justify-between px-6 pb-11 pt-[92px] transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isVisible}
        inert={!isVisible}
      >
        {/* Heading */}
        <div className={`text-center ${isVisible ? "animate-slide-up" : ""}`}>
          {/* La única escena con coordenada propia: el campus existe y está ahí. */}
          <Kicker icon="groups" index="05" coord="19.44°N" tone="coral" className="mb-2.5">
            El equipo
          </Kicker>
          <h2 className="m-0 font-display text-[clamp(20px,2.8vw,34px)] font-bold leading-[1.08] tracking-[-.012em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            Hecho por dominicanos,<br />para descubrir <em className="crd-accent">lo nuestro</em>
          </h2>
          <p className="mx-auto mt-2 text-sm leading-[1.5] text-[#3A5560] [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
            Un equipo multidisciplinario de la PUCMM, Campus Santiago.
          </p>
        </div>

        {/* Team cards (abajo) */}
        <div className="crd-ol-team flex w-full max-w-[640px] flex-wrap items-start justify-center gap-[18px]">
          {TEAM.map((member, i) => (
            <TeamCard key={member.name} member={member} delay={i * 0.1 + 0.15} animate={isVisible} />
          ))}
        </div>
      </div>
    </>
  );
}
