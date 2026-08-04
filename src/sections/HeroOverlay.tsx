"use client";

import { useEffect, useState } from "react";
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

/**
 * Sólo el pin: vive dentro de <Map> porque es un MapMarker y maplibre lo
 * mantiene pegado a las coordenadas mientras el globo gira.
 */
export function HeroPinMarker() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "hero";

  return (
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
  );
}

/**
 * Empujón del cue de scroll. NO es levitación en reposo: nace de un disparador
 * real —el visitante lleva 2,4 s en el hero sin scrollear— y se apaga para
 * siempre en cuanto la página se mueve. Tres intentos como máximo: si a la
 * tercera no ha bajado, insistir es ruido.
 *
 * Devuelve un contador; remontar la flecha con `key` es lo que rearma la
 * animación CSS (reiniciar una animación por clase requiere reflow forzado).
 */
function useEmpujonDeScroll(): number {
  const [empujon, setEmpujon] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let veces = 0;
    let timer = 0;
    const parar = () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", alScrollear);
    };
    function alScrollear() {
      if (window.scrollY > 8) parar();
    }
    const empujar = () => {
      if (window.scrollY > 8 || veces >= 3) return parar();
      veces += 1;
      setEmpujon((n) => n + 1);
      timer = window.setTimeout(empujar, 6500);
    };

    timer = window.setTimeout(empujar, 2400);
    window.addEventListener("scroll", alScrollear, { passive: true });
    return parar;
  }, []);

  return empujon;
}

/**
 * Cue de scroll: pista de que la home se recorre bajando. Es un botón de
 * verdad —lleva al primer capítulo— porque un adorno que parece pulsable y no
 * responde es peor que no tenerlo.
 */
function ScrollCue({ compacto }: { compacto?: boolean }) {
  const empujon = useEmpujonDeScroll();

  return (
    <button
      type="button"
      onClick={() => scrollToSection("trigger-polaroid-0")}
      className={`crd-scroll-cue group flex cursor-pointer flex-col items-center gap-1 text-muted transition-colors duration-200 hover:text-ink focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-ink-2 ${
        compacto ? "gap-0.5" : ""
      }`}
    >
      <span className="font-mono text-micro font-bold uppercase tracking-[.16em]">
        {compacto ? "Desliza para explorar" : "Explora"}
      </span>
      <svg
        key={empujon}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`crd-scroll-arrow ${compacto ? "size-[18px]" : "size-[22px]"}`}
        // El contador, no un booleano: deja auditar desde el DOM que el empujón
        // se detiene (máximo 3, y menos si el visitante scrollea antes).
        data-empujon={empujon > 0 ? empujon : undefined}
      >
        <polyline
          points="5,8 12,16 19,8"
          fill="none"
          stroke="#F76C4D"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">Bajar al primer destino</span>
    </button>
  );
}

/**
 * El contenido del hero —logo, copy y los dos CTA— se monta como hermano del
 * mapa, no como hijo. <Map> se carga con `ssr: false`, así que todo lo que
 * cuelgue de él sale del HTML inicial: el logo, que es el elemento LCP de la
 * home, no existía hasta que bajaba el runtime de WebGL (audit 5.6). Fuera del
 * mapa se sirve ya renderizado y el navegador puede precargarlo.
 */
export default function HeroOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "hero";

  return (
    <>
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
            height={363}
            priority
            // El logo es el elemento LCP de la home y se estaba sirviendo a
            // 760w para pintarse a ~320 en móvil: 303 KiB tirados según la
            // línea base de Lighthouse. Con `sizes` el navegador elige del
            // srcset. La altura declarada ahora respeta la proporción real del
            // archivo (4096×1958), que no cuadraba con la anterior.
            sizes="(max-width: 899px) 82vw, min(42vw, 480px)"
            className="crd-hero-logo block h-auto w-[min(82vw,460px)] desk:w-[min(42vw,480px)]"
          />
          <p className="crd-hero-copy m-0 mt-3.5 max-w-[520px] text-[clamp(17px,2.2vw,21px)] font-medium leading-[1.5] text-ink">
            La app que te lleva a la República Dominicana{" "}
            <em className="crd-accent">auténtica</em>: negocios locales y experiencias reales, en una sola ruta.
          </p>
          <div className="crd-hero-actions mt-[26px] flex flex-wrap justify-center gap-3.5 desk:justify-start">
            <Button variant="primary" size="lg" icon="download" onClick={() => scrollToSection("trigger-cta")}>
              Descargar la app
            </Button>
            {/* Ghost, no relleno: dos botones llenos del mismo peso —mango y
                mint— se anulaban mutuamente y el hero no decía cuál es la
                acción principal (audit §3). */}
            <Button variant="outline" size="lg" icon="storefront" onClick={() => scrollToSection("trigger-negocios")}>
              Soy un negocio
            </Button>
          </div>

          {/* Móvil: el cue va DENTRO del bloque de contenido, debajo de los CTA.
              Absoluto al fondo chocaba con los botones en pantallas de 667px.
              Sin él, la primera pantalla del teléfono se lee como una página
              completa y el recorrido entero queda invisible. */}
          <div className="mt-4 desk:hidden">
            <ScrollCue compacto />
          </div>
        </div>

        {/* Desktop: el cue vive anclado al borde inferior, donde el ojo lo busca. */}
        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 desk:block">
          <ScrollCue />
        </div>
      </div>
    </>
  );
}
