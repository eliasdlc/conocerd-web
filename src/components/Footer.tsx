"use client";
import Image from "next/image";
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

const PRODUCT = [
  { label: "Descargar para iOS", icon: "phone_iphone", href: "#" },
  { label: "Descargar para Android", icon: "android", href: "#" },
  { label: "Soy un negocio", icon: "storefront", target: "trigger-negocios" },
];

const SOCIALS = [
  { icon: "photo_camera", label: "Instagram", href: "#" },
  { icon: "music_note", label: "TikTok", href: "#" },
  { icon: "chat", label: "WhatsApp", href: "#" },
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
          gridTemplateColumns: "1.4fr 1fr 1fr 1.1fr",
          gap: "32px clamp(20px,4vw,48px)",
        }}
        className="crd-footer-grid"
      >
        {/* Marca */}
        <div>
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={150}
            height={40}
            style={{ height: 40, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.95 }}
          />
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: "#25CCB8", margin: "6px 0 12px" }}>
            Descubre lo nuestro
          </div>
          <p style={{ margin: 0, color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 1.6, maxWidth: 260 }}>
            La app que te lleva a la República Dominicana auténtica: lugares locales y experiencias reales, en una sola ruta.
          </p>
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
          {PRODUCT.map((p) =>
            p.target ? (
              <button key={p.label} style={linkStyle} onClick={() => scrollToSection(p.target!)}>
                <span className="ms" style={{ fontSize: 16 }}>{p.icon}</span>
                {p.label}
              </button>
            ) : (
              <a key={p.label} href={p.href} style={linkStyle}>
                <span className="ms" style={{ fontSize: 16 }}>{p.icon}</span>
                {p.label}
              </a>
            )
          )}
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
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                title={s.label}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.1)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                <span className="ms" style={{ fontSize: 20 }}>{s.icon}</span>
              </a>
            ))}
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
          <a href="#" style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textDecoration: "none" }}>Privacidad</a>
          <a href="#" style={{ fontSize: 12, color: "rgba(255,255,255,.55)", textDecoration: "none" }}>Términos</a>
        </div>
      </div>
    </footer>
  );
}
