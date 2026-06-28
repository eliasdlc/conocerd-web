"use client";

import Image from "next/image";
import { SelfPin } from "@/components/map/pins";

// ─────────────────────────────────────────────────────────────────────────────
//  Mockup de teléfono (#10). Frame rotado con perspectiva; la pantalla es un
//  PLACEHOLDER SWAPPABLE: hoy una "app falsa" armada con el sistema de pines,
//  mañana se reemplaza por el video/screenshot real vía la prop `screen`.
// ─────────────────────────────────────────────────────────────────────────────

function DefaultScreen() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#EAF6F4,#DCEFEA)" }}>
      {/* trazas de calles falsas */}
      <svg viewBox="0 0 270 560" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M-10,180 C80,150 150,260 300,210" fill="none" stroke="#ffffff" strokeWidth="14" opacity="0.7" />
        <path d="M40,-10 C70,140 20,320 120,580" fill="none" stroke="#ffffff" strokeWidth="12" opacity="0.6" />
        {/* ruta activa dashed mango */}
        <path d="M135,470 C120,360 180,300 150,180" fill="none" stroke="#F47F0E" strokeWidth="4" strokeDasharray="2 5" strokeLinecap="round" />
      </svg>

      {/* barra de búsqueda */}
      <div
        style={{
          position: "absolute",
          top: 44,
          left: 16,
          right: 16,
          height: 38,
          borderRadius: 999,
          background: "#fff",
          boxShadow: "0 6px 18px rgba(38,70,83,0.16)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 14px",
        }}
      >
        <span className="ms" style={{ fontSize: 18, color: "#5B6B72" }}>search</span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: "#5B6B72" }}>
          ¿A dónde vamos?
        </span>
      </div>

      {/* self-pin en el centro */}
      <div style={{ position: "absolute", top: 196, left: "50%", transform: "translateX(-50%)" }}>
        <SelfPin heading={18} size={44} />
      </div>

      {/* card inferior estilo bottom-sheet */}
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 16,
          background: "#fff",
          borderRadius: 20,
          padding: 12,
          boxShadow: "0 -2px 20px rgba(38,70,83,0.14)",
          display: "flex",
          gap: 11,
          alignItems: "center",
        }}
      >
        <div style={{ position: "relative", width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#F5EFE2" }}>
          <Image src="/assets/ph-playa.png" alt="" fill sizes="56px" style={{ objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 13, color: "#264653" }}>
            Bahía de las Águilas
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#5B6B72", marginTop: 2 }}>
            ★ 4.9 · a 2.4 km
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            background: "#F76C4D",
            color: "#fff",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 12,
            padding: "9px 16px",
            borderRadius: 999,
          }}
        >
          Ir
        </div>
      </div>
    </div>
  );
}

export default function PhoneMockup({ screen }: { screen?: React.ReactNode }) {
  return (
    <div style={{ perspective: 1500 }}>
      <div
        style={{
          position: "relative",
          width: 264,
          height: 548,
          borderRadius: 44,
          background: "linear-gradient(155deg,#33545F,#1D3A45)",
          padding: 12,
          boxShadow:
            "0 50px 90px rgba(38,70,83,0.38), 0 12px 30px rgba(38,70,83,0.25), inset 0 1px 2px rgba(255,255,255,0.18)",
          // #10 — rotado a la derecha (rotateY) + hacia arriba (rotateX)
          transform: "rotateY(-16deg) rotateX(12deg)",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 33,
            overflow: "hidden",
            background: "#EAF6F4",
          }}
        >
          {screen ?? <DefaultScreen />}
        </div>
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 92,
            height: 22,
            background: "#1D3A45",
            borderRadius: "0 0 14px 14px",
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}
