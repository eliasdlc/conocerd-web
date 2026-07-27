"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import { Map } from "@/components/map/Map";
import JourneyStepper from "@/components/JourneyStepper";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { useJourneyScroll, scrollToSceneCenter } from "@/hooks/useJourneyScroll";
import { useJourneySteps } from "@/hooks/useJourneySteps";
import { useHeroIdleMotion } from "@/hooks/useHeroIdleMotion";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SCENES, SCENE_BANDS, TRIGGER_TOTAL_VH } from "@/lib/journey";
import { applyJourneyFrame, measureViewport } from "@/lib/journeyCamera";
import { registerSceneJumper, scrollToFooter } from "@/lib/journeyNav";
import HeroOverlay from "@/sections/HeroOverlay";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosSection from "@/sections/ViajerosSection";
import NegociosSection from "@/sections/NegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";

// Applied once on map load — aligns water/border colors with brand palette
function applyBrandPaint(map: maplibregl.Map) {
  // El estilo Carto no siempre expone estas capas → guardar con getLayer para
  // no ensuciar la consola con "Cannot style non-existing layer".
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#c8ede9");
  if (map.getLayer("admin_country")) {
    map.setPaintProperty("admin_country", "line-color", "#264653");
    map.setPaintProperty("admin_country", "line-width", 2);
  }

  // Mata el "ring": el globo de MapLibre dibuja una atmósfera (halo difuso más
  // grande que la esfera). `atmosphere-blend: 0` la apaga ⇒ el globo se recorta
  // limpio. El área alrededor queda transparente y muestra el crema del wrapper.
  map.setSky({ "atmosphere-blend": 0 });
}

// Umbral de swipe vertical en móvil: por encima de un tap accidental y por
// debajo de lo que cuesta un gesto deliberado.
const SWIPE_PX = 46;
const SWIPE_MAX_MS = 800;

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { setActiveScene, progress } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [stepperVisible, setStepperVisible] = useState(true);
  // El journey móvil bloquea el scroll de la página; solo se libera al final
  // para dejar bajar al footer (y se vuelve a bloquear al regresar arriba).
  const [unlocked, setUnlocked] = useState(false);
  const leftJourney = useRef(false);

  // Dos motores excluyentes escribiendo el mismo progreso:
  // desktop = scroll continuo, móvil = pasos discretos entre keyframes.
  useJourneyScroll({
    containerRef: outerRef,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
    enabled: !isMobile,
  });
  const steps = useJourneySteps({
    enabled: isMobile,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
  });

  // Excepción acotada: el globo del hero gira lento en reposo y se desvanece al
  // arrancar el journey (ver useHeroIdleMotion).
  useHeroIdleMotion(mapRef, progress);

  const { goTo, next, prev, index } = steps;

  // Los enlaces de nav/footer (`trigger-<escena>`) van al keyframe de la escena
  // en ambos modos, en vez de al borde de su banda de scroll.
  useEffect(() => {
    return registerSceneJumper((scene) => {
      const i = SCENE_BANDS.findIndex((b) => b.name === scene);
      if (i < 0) return false;
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        goTo(i);
      } else {
        scrollToSceneCenter(outerRef.current, i);
      }
      return true;
    });
  }, [isMobile, goTo]);

  // Bloqueo del scroll de página en móvil. Con `overflow:hidden` en el body un
  // swipe vertical no mueve nada, pero los bottom-sheets siguen scrolleando por
  // dentro (a diferencia de `touch-action`, que los habría anulado también).
  useEffect(() => {
    if (!isMobile || unlocked) return;
    // Sobre <html> y no solo <body>: globals.css le pone `overflow-x: clip` al
    // root, y con el root en overflow no-visible el overflow del body deja de
    // propagarse al viewport (el bloqueo no llegaba a aplicarse).
    // Se limpia a "" en vez de restaurar el valor previo: en StrictMode el
    // efecto corre dos veces y el "previo" de la segunda pasada ya sería
    // "hidden", que quedaría fijado para siempre.
    const root = document.documentElement;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isMobile, unlocked]);

  // El stepper es fijo: se retira cuando el usuario sale del journey al footer,
  // y al volver arriba el journey recupera el control del gesto vertical.
  useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => {
      const y = window.scrollY;
      setStepperVisible(y < window.innerHeight * 0.3);
      if (!unlocked) return;
      // Solo se vuelve a bloquear tras haber bajado de verdad: si se mirara
      // únicamente `y <= 2`, el primer frame del scroll suave hacia el footer
      // (todavía en 0) re-bloquearía la página a mitad del gesto.
      if (y > 60) leftJourney.current = true;
      else if (y <= 2 && leftJourney.current) {
        leftJourney.current = false;
        setUnlocked(false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, unlocked]);

  const goToFooter = useCallback(() => {
    setUnlocked(true);
    requestAnimationFrame(() => scrollToFooter());
  }, []);

  // Swipe vertical = mismo avance que las flechas. El gesto natural del usuario
  // sigue funcionando aunque el scroll de la página esté bloqueado.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touch.current;
      touch.current = null;
      // Con el scroll liberado (viendo el footer) el gesto vertical vuelve a
      // ser scroll: capturarlo también movería el journey a la vez.
      if (!start || !isMobile || unlocked) return;
      const end = e.changedTouches[0];
      const dy = start.y - end.clientY;
      const dx = Math.abs(start.x - end.clientX);
      if (Date.now() - start.t > SWIPE_MAX_MS) return;
      if (Math.abs(dy) < SWIPE_PX || Math.abs(dy) < dx) return;
      if (dy > 0) next();
      else prev();
    },
    [isMobile, unlocked, next, prev]
  );

  // On load: brand paint + posiciona la cámara según el progreso actual, así no
  // se queda en el view inicial hasta la primera interacción.
  const handleLoad = useCallback(
    (map: maplibregl.Map) => {
      applyBrandPaint(map);
      measureViewport();
      applyJourneyFrame(map, progress.get());
    },
    [progress]
  );

  return (
    <div
      ref={outerRef}
      className="crd-journey"
      style={{ "--crd-track-vh": TRIGGER_TOTAL_VH } as React.CSSProperties}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Sticky layer — map stays fixed while scroll track advances below.
          Fondo crema (con halos cálidos de marca) detrás del canvas: el globo,
          ya sin atmósfera, flota sobre este crema en el hero. En las escenas con
          zoom el mapa es opaco y tapa el gradiente. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          // dvh: en móvil la barra de URL cambia el 100vh y el globo se movía
          // verticalmente al aparecer/desaparecer.
          height: "100dvh",
          width: "100%",
          overflow: "hidden",
          background:
            "radial-gradient(60% 50% at 18% 16%,rgba(37,204,184,.10),transparent 70%),radial-gradient(55% 45% at 84% 24%,rgba(255,141,22,.10),transparent 70%),radial-gradient(60% 50% at 50% 98%,rgba(247,108,77,.08),transparent 70%), #FDF8F0",
        }}
      >
        <Map
          ref={mapRef}
          theme="light"
          projection={{ type: "globe" }}
          initialViewState={{
            longitude: -70.1627,
            latitude: 18.7357,
            zoom: 2.5,
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
        >
          <HeroOverlay />
          <DestinosSection />
          <MapaSection />
          <ViajerosSection />
          <NegociosSection />
          <EquipoSection />
          <CTASection />
        </Map>
      </div>

      {/* Anchor divs — pista de scroll en desktop (display:none en móvil) */}
      {SCENES.map((scene) => (
        <div
          key={scene.name}
          id={`trigger-${scene.name}`}
          className="crd-journey-anchor"
          data-scene={scene.name}
          style={{ height: `${scene.height}vh`, pointerEvents: "none" }}
        />
      ))}

      {isMobile && (
        <JourneyStepper
          index={index}
          onPrev={prev}
          onNext={next}
          onChapter={goTo}
          onEnd={goToFooter}
          visible={stepperVisible}
        />
      )}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function MapScrollJourney() {
  const mapRef = useRef<maplibregl.Map | null>(null);

  return (
    <SceneProvider>
      <MapScrollInner mapRef={mapRef} />
    </SceneProvider>
  );
}
