"use client";

import Image from "next/image";
import Button from "@/components/Button";
import { useScene } from "@/context/SceneContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { scrollToSection } from "@/lib/journeyNav";
import { MapMarker, MarkerContent } from "@/components/map/Map";

// Centro aprox. de RD — mismo punto que el keyframe `hero` de la cámara.
const RD_COORDS: [number, number] = [-70.1627, 18.7357];

// Pin de ubicación (gota coral) que marca RD sobre el globo. Como es un
// MapMarker, maplibre lo mantiene pegado a estas coords ⇒ viaja con el globo
// mientras levita/gira.
function HeroPin() {
  return (
    <svg width={34} height={46} viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 4px 6px rgba(38,70,83,0.35))", display: "block" }}>
      <path
        d="M17 1C8.7 1 2 7.7 2 16c0 10.5 13 27 14.1 28.3a1.2 1.2 0 0 0 1.8 0C19 43 32 26.5 32 16 32 7.7 25.3 1 17 1Z"
        fill="#F76C4D" stroke="#fff" strokeWidth="2" />
      <circle cx="17" cy="16" r="5.5" fill="#fff" />
    </svg>
  );
}

// ─── Hero overlay — escena 0 del journey ──────────────────────────────────────
// Ya NO tiene su propio mapa: el globo es el <Map> compartido del journey, detrás.
// El globo se encuadra a la derecha (desktop) / arriba (móvil) vía el padding de
// cámara en useJourneyScroll; este overlay coloca el contenido en el hueco libre.

export default function HeroOverlay() {
  const { activeScene } = useScene();
  const isMobile = useIsMobile();
  const isVisible = activeScene === "hero";

  return (
    <>
      {/* Pin de RD sobre el globo — se desvanece al salir del hero (los pins de
          destinos toman el relevo al hacer zoom). anchor=bottom: la punta toca RD. */}
      <MapMarker longitude={RD_COORDS[0]} latitude={RD_COORDS[1]} anchor="bottom">
        <MarkerContent>
          <div style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.5s ease", pointerEvents: "none" }}>
            <HeroPin />
          </div>
        </MarkerContent>
      </MapMarker>

      <div
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
        // Desktop: contenido a la izquierda, centrado vertical.
        // Móvil: contenido abajo (el globo queda arriba).
        alignItems: isMobile ? "center" : "flex-start",
        justifyContent: isMobile ? "flex-end" : "center",
        textAlign: isMobile ? "center" : "left",
        padding: isMobile ? "0 22px 20px" : "0 6vw",
      }}
    >
      {/* Velo crema: en móvil el texto cae sobre el globo y las etiquetas del
          mapa se cruzaban con el titular. */}
      <div className="crd-mobile-scrim" style={{ height: "56%" }} />
      {/* Título real para lectores de pantalla / SEO (el logo es imagen). */}
      <h1 className="sr-only">
        ConoceRD — Descubre lo nuestro: la app de turismo auténtico en República Dominicana
      </h1>

      <div
        className="crd-hero-content"
        style={{
          // Sobre el velo: el velo es un elemento posicionado y pintaría encima
          // de este bloque (que es un hijo estático del flex).
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: isMobile ? "center" : "flex-start",
          maxWidth: isMobile ? 460 : 520,
        }}
      >
        <Image
          id="crd-logo"
          src="/assets/logo.png"
          alt="ConoceRD — Descubre Lo Nuestro"
          width={760}
          height={280}
          priority
          className="crd-hero-logo"
          style={{
            width: isMobile ? "min(82vw, 460px)" : "min(42vw, 480px)",
            height: "auto",
            display: "block",
          }}
        />
        <p className="crd-hero-copy"
          style={{
            maxWidth: 520,
            margin: "14px 0 0",
            fontSize: "clamp(17px,2.2vw,21px)",
            lineHeight: 1.5,
            color: "#264653",
            fontWeight: 500,
          }}
        >
          La app que te lleva a la República Dominicana{" "}
          <strong style={{ color: "#B23410" }}>auténtica</strong>: negocios locales y experiencias reales, en una sola ruta.
        </p>
        <div className="crd-hero-actions"
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: isMobile ? "center" : "flex-start",
            marginTop: 26,
          }}
        >
          <Button variant="primary" size="lg" icon="download" onClick={() => scrollToSection("trigger-cta")}>
            Descargar la app
          </Button>
          <Button variant="mint" size="lg" icon="storefront" onClick={() => scrollToSection("trigger-negocios")}>
            Soy un negocio
          </Button>
        </div>
      </div>

      {/* Desktop keeps the explicit scroll cue; mobile space is reserved for the
          primary actions and native scrolling is already expected. */}
      <div
        style={{
          position: "absolute",
          display: isMobile ? "none" : "flex",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          color: "#5B6B72",
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          Explora
        </span>
        <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, animation: "crdBob 1.6s ease-in-out infinite" }}>
          <polyline points="5,8 12,16 19,8" fill="none" stroke="#F76C4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      </div>
    </>
  );
}
