"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import Button from "./Button";
import HeroRays from "./HeroRays";
import { Map } from "@/components/map/Map";
import type maplibregl from "maplibre-gl";
import { scrollToSection } from "@/lib/journeyNav";

// ─── Globe orb — slow auto-rotating map, decorative only ─────────────────────

function GlobeOrb() {
  const rafRef = useRef<number>(0);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const bearingRef = useRef(-20);
  const wrapRef = useRef<HTMLDivElement>(null);

  function handleLoad(map: maplibregl.Map) {
    // Brand water color (guardar con getLayer: el estilo no siempre las expone)
    if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#c8ede9");
    if (map.getLayer("admin_country")) map.setPaintProperty("admin_country", "line-color", "#264653");
    mapRef.current = map;
  }

  // Rotation runs ONLY while the hero is on-screen and the user hasn't asked
  // for reduced motion — and it fully stops (cancels the rAF) when off-screen.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const start = () => {
      if (rafRef.current) return; // already running
      const rotate = () => {
        const map = mapRef.current;
        if (map) {
          bearingRef.current = (bearingRef.current + 0.008) % 360;
          map.setBearing(bearingRef.current);
        }
        rafRef.current = requestAnimationFrame(rotate);
      };
      rafRef.current = requestAnimationFrame(rotate);
    };
    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.01 }
    );
    io.observe(wrap);

    return () => { io.disconnect(); stop(); };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        // #2 — globo 1.5× (de ~600 a ~820 máx), reposicionado hacia arriba para
        // no competir con la cabecera/párrafo del hero.
        position: "absolute",
        left: "50%",
        top: "42%",
        transform: "translate(-50%, -50%)",
        width: "clamp(440px, 74vw, 820px)",
        aspectRatio: "1",
        zIndex: 1,
      }}
    >
      {/* #1 — sombra de contacto: elipse difuminada debajo del orbe */}
      <div
        style={{
          position: "absolute",
          bottom: "-4%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "72%",
          height: "9%",
          background:
            "radial-gradient(ellipse at center, rgba(38,70,83,0.30), transparent 70%)",
          filter: "blur(16px)",
          zIndex: 0,
        }}
      />

      {/* Orbe circular (recorta el canvas + el sombreado esférico) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          overflow: "hidden",
          opacity: 0.82,
          // #1 — halo atmosférico (glow teal/cian) + sombra suave
          boxShadow:
            "0 0 0 1.5px rgba(37,204,184,0.22), 0 0 60px 8px rgba(37,204,184,0.20), 0 30px 90px rgba(38,70,83,0.16)",
        }}
      >
        <Map
          theme="light"
          projection={{ type: "globe" }}
          initialViewState={{
            longitude: -70.1627,
            latitude: 18.7357,
            zoom: 2.6,
            pitch: 0,
            bearing: -20,
          }}
          onLoad={handleLoad}
          interactive={false}
          scrollZoom={false}
          dragPan={false}
          dragRotate={false}
          touchZoomRotate={false}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        />

        {/* #1 — sombreado esférico: highlight superior-izq + terminador inf-der */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 34% 28%, rgba(255,255,255,0.40), transparent 46%), radial-gradient(circle at 70% 74%, rgba(18,38,48,0.42), transparent 62%)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

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
      {/* Accessible page title — the visible logo is an image, so the real
          <h1> lives here (screen readers + SEO) without altering the layout. */}
      <h1 className="sr-only">
        ConoceRD — Descubre lo nuestro: la app de turismo auténtico en República Dominicana
      </h1>

      {/* #16 — rutas SVG de entrada, detrás del globo */}
      <HeroRays />

      {/* Globe orb — replaces AnimatedRays */}
      <GlobeOrb />

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
          La app que te lleva a la República Dominicana{" "}
          <strong style={{ color: "#F76C4D" }}>autentica</strong>: negocios locales y experiencias reales, en una sola ruta.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginTop: 26, animation: "crdRise .7s ease .85s both" }}>
          <Button variant="primary" size="lg" icon="download" onClick={() => scrollToSection("trigger-cta")}>Descargar la app</Button>
          <Button variant="outline" size="lg" icon="storefront" onClick={() => scrollToSection("trigger-negocios")}>Soy un negocio</Button>
        </div>
      </div>

      {/* indicador de scroll */}
      <div id="crd-scrollcue" style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 6, color: "#5B6B72", animation: "crdRise .7s ease 1.1s both",
      }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>Explora</span>
        <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, animation: "crdBob 1.6s ease-in-out infinite" }}>
          <polyline points="5,8 12,16 19,8" fill="none" stroke="#F76C4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
