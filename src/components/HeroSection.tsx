"use client";
import Image from "next/image";
import Button from "./Button";
import AnimatedRays from "./ui/AnimatedRays";
import { scrollToSection } from "@/lib/journeyNav";

export default function HeroSection() {
  return (
    <section
      id="crd-hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "72px 20px 76px",
        scrollMarginTop: 80,
        overflow: "hidden",
        background: "radial-gradient(60% 50% at 18% 16%,rgba(37,204,184,.10),transparent 70%),radial-gradient(55% 45% at 84% 24%,rgba(255,141,22,.10),transparent 70%),radial-gradient(60% 50% at 50% 98%,rgba(247,108,77,.08),transparent 70%), #FDF8F0",
      }}
    >
      {/* fondo animado: rayos de luz con colores ConoceRD */}
      <AnimatedRays />

      {/* decoración ambiental */}
      <Image src="/assets/bird.svg" alt="" width={120} height={80} style={{ position: "absolute", left: "9%", top: "12%", width: 120, opacity: .9, zIndex: 3, animation: "crdFloatX 7s ease-in-out infinite" }} />
      <Image src="/assets/palm.svg" alt="" width={210} height={210} style={{ position: "absolute", right: "5%", bottom: "4%", width: 210, opacity: .9, zIndex: 3, transformOrigin: "bottom center", animation: "crdSway 6s ease-in-out infinite" }} />

      {/* contenido central */}
      <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ animation: "crdLogoIn .9s cubic-bezier(.2,.7,.2,1) .25s both" }}>
          <Image
            id="crd-logo"
            src="/assets/logo.png"
            alt="ConoceRD — Descubre Lo Nuestro"
            width={760}
            height={280}
            priority
            unoptimized
            style={{ width: "min(85vw, 680px)", height: "auto", display: "block" }}
          />
        </div>
        <p style={{
          maxWidth: 580, margin: "14px 0 0",
          fontSize: "clamp(17px,2.2vw,21px)", lineHeight: 1.5,
          color: "#264653", fontWeight: 500,
          animation: "crdRise .7s ease .7s both",
        }}>
          La app que te lleva a la República Dominicana que{" "}
          <strong style={{ color: "#F76C4D" }}>no sale en las guías</strong>: destinos auténticos, negocios locales y experiencias reales, en una sola ruta.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 26, animation: "crdRise .7s ease .85s both" }}>
          <Button variant="primary" size="lg" icon="download" onClick={() => scrollToSection("crd-descargar")}>Descargar la app</Button>
          <Button variant="outline" size="lg" icon="storefront" onClick={() => scrollToSection("crd-negocios")}>Soy un negocio</Button>
        </div>
      </div>

      {/* indicador de scroll */}
      <div id="crd-scrollcue" style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, color: "#7A8A91", animation: "crdRise .7s ease 1.1s both",
      }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>Explora</span>
        <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, animation: "crdBob 1.6s ease-in-out infinite" }}>
          <polyline points="5,8 12,16 19,8" fill="none" stroke="#F76C4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
