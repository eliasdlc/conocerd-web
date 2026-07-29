"use client";

import Image from "next/image";
import Button from "@/components/Button";
import { useScene } from "@/context/SceneContext";
import { scrollToSection } from "@/lib/journeyNav";
import { MapMarker, MarkerContent } from "@/components/map/Map";

// Centro aprox. de RD — mismo punto que el keyframe `hero` de la cámara.
const RD_COORDS: [number, number] = [-70.1627, 18.7357];

// Pin de ubicación (gota coral) que marca RD sobre el globo. Como es un
// MapMarker, maplibre lo mantiene pegado a estas coords ⇒ viaja con el globo
// mientras levita/gira.
function HeroPin() {
  return (
    <svg
      width={34}
      height={46}
      viewBox="0 0 34 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block [filter:drop-shadow(0_4px_6px_rgba(38,70,83,0.35))]"
    >
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
//
// El reparto móvil/desktop ya no pasa por useIsMobile: son variantes `desk:`, así
// que el layout correcto se pinta en el primer frame, sin esperar a matchMedia.

export default function HeroOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "hero";

  return (
    <>
      {/* Pin de RD sobre el globo — se desvanece al salir del hero (los pins de
          destinos toman el relevo al hacer zoom). anchor=bottom: la punta toca RD. */}
      <MapMarker longitude={RD_COORDS[0]} latitude={RD_COORDS[1]} anchor="bottom">
        <MarkerContent>
          <div
            className={`pointer-events-none transition-opacity duration-500 ease-in-out ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <HeroPin />
          </div>
        </MarkerContent>
      </MapMarker>

      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        // Móvil: contenido abajo (el globo queda arriba). Desktop: a la izquierda,
        // centrado vertical.
        className={`absolute inset-0 z-10 flex flex-col items-center justify-end px-[22px] pb-5 text-center transition-opacity duration-500 ease-in-out
          desk:items-start desk:justify-center desk:px-[6vw] desk:pb-0 desk:text-left
          ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Velo crema: en móvil el texto cae sobre el globo y las etiquetas del
            mapa se cruzaban con el titular. */}
        <div className="crd-mobile-scrim h-[56%]" />
        {/* Título real para lectores de pantalla / SEO (el logo es imagen). */}
        <h1 className="sr-only">
          ConoceRD — Descubre lo nuestro: la app de turismo auténtico en República Dominicana
        </h1>

        {/* relative z-1: el velo es un elemento posicionado y pintaría encima de
            este bloque (que es un hijo estático del flex). */}
        <div className="crd-hero-content relative z-[1] flex max-w-[460px] flex-col items-center desk:max-w-[520px] desk:items-start">
          <Image
            id="crd-logo"
            src="/assets/logo.png"
            alt="ConoceRD — Descubre Lo Nuestro"
            width={760}
            height={280}
            priority
            className="crd-hero-logo block h-auto w-[min(82vw,460px)] desk:w-[min(42vw,480px)]"
          />
          <p className="crd-hero-copy m-0 mt-3.5 max-w-[520px] text-[clamp(17px,2.2vw,21px)] font-medium leading-[1.5] text-ink">
            La app que te lleva a la República Dominicana{" "}
            <strong className="text-coral-ink">auténtica</strong>: negocios locales y experiencias reales, en una sola ruta.
          </p>
          <div className="crd-hero-actions mt-[26px] flex flex-wrap justify-center gap-3.5 desk:justify-start">
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
        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-muted desk:flex">
          <span className="font-display text-[11px] font-bold uppercase tracking-[.14em]">Explora</span>
          <svg viewBox="0 0 24 24" className="size-[22px] animate-[crdBob_1.6s_ease-in-out_infinite]">
            <polyline points="5,8 12,16 19,8" fill="none" stroke="#F76C4D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </>
  );
}
