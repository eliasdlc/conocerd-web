"use client";
import Image from "next/image";
import Link from "next/link";
import SubscribeForm from "@/components/SubscribeForm";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";

// #14 — footer rediseñado: columnas con info útil (marca, nav, producto,
// contacto) + social (placeholder hasta tener handles reales) + legal.

const NAV_LINKS = [
  { label: "Destinos", target: "trigger-destinos-intro" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

// Las apps aún no están publicadas: aquí sólo se anuncian (§2.4). La acción
// real del footer es el formulario de la lista.
const COMING_SOON = [
  { label: "iOS · próximamente", icon: "phone_iphone" },
  { label: "Android · próximamente", icon: "android" },
];


const linkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,.72)",
  textDecoration: "none",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13.5,
  lineHeight: 2,
  cursor: "pointer",
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  display: "flex",
  alignItems: "center",
  gap: 7,
  width: "fit-content",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 800,
  fontSize: 12,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,.5)",
  marginBottom: 10,
};

export default function Footer() {
  return (
    <footer style={{ background: "#1D3A45", color: "#fff" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "56px clamp(20px,5vw,56px) 28px",
          display: "grid",
          // La primera columna lleva el formulario de la lista: necesita ancho
          // suficiente para que el campo y el botón quepan en una sola línea.
          gridTemplateColumns: "1.6fr 1fr 1fr 1.1fr",
          gap: "32px clamp(20px,4vw,48px)",
        }}
        className="crd-footer-grid"
      >
        {/* Marca */}
        <div>
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={127}
            height={40}
            style={{ height: 40, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.95 }}
          />
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: "#25CCB8", margin: "6px 0 12px" }}>
            Descubre lo nuestro
          </div>
          <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
            La app que te lleva a la República Dominicana auténtica: lugares locales y experiencias reales, en una sola ruta.
          </p>
          <div style={{ maxWidth: 320 }}>
            <div style={{ ...headingStyle, marginBottom: 8 }}>Lista de espera</div>
            <SubscribeForm tone="dark" layout="compact" source="footer" />
          </div>
        </div>

        {/* Explora */}
        <nav>
          <div style={headingStyle}>Explora</div>
          {NAV_LINKS.map((l) => (
            <button key={l.target} style={linkStyle} onClick={() => scrollToSection(l.target)}>
              {l.label}
            </button>
          ))}
        </nav>

        {/* Producto */}
        <div>
          <div style={headingStyle}>Producto</div>
          {COMING_SOON.map((p) => (
            <div key={p.label} style={{ ...linkStyle, cursor: "default", color: "rgba(255,255,255,.45)" }}>
              <span className="ms" aria-hidden="true" style={{ fontSize: 16 }}>{p.icon}</span>
              {p.label}
            </div>
          ))}
          <button style={linkStyle} onClick={() => requestSubscribe("negocio")}>
            <span className="ms" aria-hidden="true" style={{ fontSize: 16 }}>storefront</span>
            Registrar mi negocio
          </button>
        </div>

        {/* Contacto */}
        <div>
          <div style={headingStyle}>Contacto</div>
          <a href="mailto:hola@conocerd.app" style={{ ...linkStyle, lineHeight: 1.8 }}>
            <span className="ms" style={{ fontSize: 16 }}>mail</span>
            hola@conocerd.app
          </a>
          <div style={{ ...linkStyle, cursor: "default", lineHeight: 1.8 }}>
            <span className="ms" style={{ fontSize: 16 }}>location_on</span>
            Santiago, RD 🇩🇴
          </div>
        </div>
      </div>

      {/* Legal */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,.1)",
          padding: "16px clamp(20px,5vw,56px)",
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: "'JetBrains Mono', monospace" }}>
          © 2026 ConoceRD · Hecho con orgullo en RD
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          <Link href="/privacidad" style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textDecoration: "none" }}>Privacidad</Link>
          <Link href="/terminos" style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textDecoration: "none" }}>Términos</Link>
        </div>
      </div>
    </footer>
  );
}
