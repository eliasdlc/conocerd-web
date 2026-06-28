"use client";
import { useEffect, useRef } from "react";
import Button from "./Button";
import { scrollToSection } from "@/lib/journeyNav";

const LINKS = [
  { label: "Destinos", target: "trigger-destinos-intro" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

// #15 — píldora flotante sin wordmark: solo nav + botón Descargar.
export default function Nav() {
  const pillRef = useRef<HTMLDivElement>(null);

  // Mantiene la lógica de fondo al hacer scroll: la píldora se vuelve más
  // sólida (y con más sombra) una vez te alejas del tope.
  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const onScroll = () => {
      const solid = window.scrollY > 36;
      pill.style.background = solid ? "rgba(253,248,240,0.92)" : "rgba(253,248,240,0.6)";
      pill.style.boxShadow = solid
        ? "0 10px 30px rgba(38,70,83,.16)"
        : "0 6px 20px rgba(38,70,83,.08)";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <div
        ref={pillRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(8px, 1.4vw, 18px)",
          padding: "8px 8px 8px clamp(12px, 1.8vw, 22px)",
          borderRadius: 999,
          border: "1px solid rgba(235,230,217,0.9)",
          background: "rgba(253,248,240,0.6)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 6px 20px rgba(38,70,83,.08)",
          transition: "background .3s, box-shadow .3s",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {LINKS.map((l) => (
          <a
            key={l.target}
            className="crd-navlink"
            href={`#${l.target}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(l.target);
            }}
            style={{ whiteSpace: "nowrap" }}
          >
            {l.label}
          </a>
        ))}
        <Button variant="primary" size="sm" icon="download" onClick={() => scrollToSection("trigger-cta")}>
          Descargar
        </Button>
      </div>
    </nav>
  );
}
