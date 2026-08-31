"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  El lienzo de /dev/camara. Corre DENTRO del iframe de la herramienta, al
//  tamaño exacto del tramo elegido: las media queries, el breakpoint móvil y
//  los svh son los del iframe, así que el cromo que se ve es el de verdad
//  (píldora, panel de pasos, y el sheet o la carta de la escena activa).
//
//  A diferencia del recorrido, el mapa es INTERACTIVO y no hay motor de pasos:
//  la cámara arranca en el encuadre real que el sitio calcula para la escena
//  (cameraForBand + paddingAtProgress, con el padding aplicado igual) y de ahí
//  el ratón manda. Cada movimiento se reporta al padre por postMessage; el
//  padre decide qué guardar.
//
//  El cromo es referencia visual: sus capas van con pointer-events apagado
//  para que todo gesto llegue al canvas. La única pieza viva es el panel de
//  pasos, que aquí también cambia de escena.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { SceneProvider, useScene } from "@/context/SceneContext";
import { SCENE_BANDS, cameraForBand, paddingAtProgress, type JourneyViewport } from "@/lib/journey";
import { MOBILE_BREAKPOINT } from "@/hooks/useIsMobile";
import { PROYECCION_DEL_RECORRIDO } from "@/lib/mapaLigero";
import { applyBrandPaint } from "@/components/MapScrollJourney";
import Nav from "@/components/Nav";
import JourneyStepper from "@/components/JourneyStepper";
import HeroOverlay, { HeroPinMarker } from "@/sections/HeroOverlay";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosNegociosSection from "@/sections/ViajerosNegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";

const Map = dynamic(() => import("@/components/map/engine").then((mod) => mod.Map), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="absolute inset-0 bg-cream" />,
});

/** Mensajes del padre → lienzo. */
type MensajeEntrante =
  | { t: "crd-escena"; name: string }
  | { t: "crd-reencuadrar" }
  | { t: "crd-aplicar"; camara: { center: [number, number]; zoom: number; pitch: number; bearing: number } };

const viewportActual = (): JourneyViewport => ({
  width: window.innerWidth,
  height: window.innerHeight,
  mobile: window.innerWidth < MOBILE_BREAKPOINT,
});

function LienzoInner() {
  const { activeScene, setActiveScene, progress } = useScene();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapaListo, setMapaListo] = useState(false);

  // Coloca la cámara en el encuadre que el sitio calcula HOY para la escena,
  // con el mismo padding de zona segura que aplica el motor.
  const encuadrar = useCallback((name: string, modo: "jump" | "fly") => {
    const band = SCENE_BANDS.find((b) => b.name === name);
    const map = mapRef.current;
    if (!band || !map) return;
    const v = viewportActual();
    const cam = cameraForBand(band, v);
    const opciones = {
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
      padding: paddingAtProgress(band.center, v),
    };
    if (modo === "fly") map.flyTo({ ...opciones, duration: 650, essential: true });
    else map.jumpTo(opciones);
  }, []);

  const irAEscena = useCallback(
    (name: string, modo: "jump" | "fly", avisar: boolean) => {
      const band = SCENE_BANDS.find((b) => b.name === name);
      if (!band) return;
      setActiveScene(name);
      progress.set(band.center);
      encuadrar(name, modo);
      if (avisar) window.parent.postMessage({ t: "crd-escena-cambiada", name }, location.origin);
    },
    [setActiveScene, progress, encuadrar]
  );

  // Reporta cada movimiento de cámara al padre, a un mensaje por frame.
  const reportar = useCallback((map: maplibregl.Map) => {
    let raf = 0;
    map.on("move", () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const c = map.getCenter();
        window.parent.postMessage(
          {
            t: "crd-camara",
            camara: {
              center: [c.lng, c.lat],
              zoom: map.getZoom(),
              pitch: map.getPitch(),
              bearing: map.getBearing(),
            },
          },
          location.origin
        );
      });
    });
  }, []);

  const handleLoad = useCallback(
    (map: maplibregl.Map) => {
      applyBrandPaint(map);
      reportar(map);
      // El engine puebla su ref DESPUÉS de onLoad; el encuadre inicial la
      // necesita ya. Es la misma instancia, así que adelantarla es inocuo.
      mapRef.current = map;
      // Acceso directo para sondas de desarrollo (la página entera lo es).
      (window as unknown as { __crdMapa?: maplibregl.Map }).__crdMapa = map;
      setMapaListo(true);
      encuadrar("hero", "jump");
      window.parent.postMessage({ t: "crd-lienzo-listo" }, location.origin);
    },
    [reportar, encuadrar]
  );

  // Órdenes del padre.
  useEffect(() => {
    const onMessage = (e: MessageEvent<MensajeEntrante>) => {
      if (e.origin !== location.origin) return;
      const map = mapRef.current;
      if (!map) return;
      if (e.data?.t === "crd-escena") irAEscena(e.data.name, "fly", false);
      else if (e.data?.t === "crd-reencuadrar") encuadrar(activeScene, "fly");
      else if (e.data?.t === "crd-aplicar") {
        // Sin `padding`: se conserva el de la escena, que es la convención con
        // la que el motor aplica (y esta herramienta captura) cada encuadre.
        map.jumpTo(e.data.camara);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [irAEscena, encuadrar, activeScene]);

  // Cambio de tramo = resize del iframe: el encuadre calculado cambia con él.
  useEffect(() => {
    if (!mapaListo) return;
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => encuadrar(activeScene, "jump"), 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [mapaListo, activeScene, encuadrar]);

  const index = SCENE_BANDS.find((b) => b.name === activeScene)?.index ?? 0;
  const porNombre = (i: number) => irAEscena(SCENE_BANDS[i].name, "fly", true);

  return (
    <div className="crd-lienzo crd-journey" data-active-scene={activeScene}>
      {/* Los gestos son del mapa: todo lo que no sea el canvas (primer hijo
          del sticky) es referencia visual y no captura el puntero. */}
      <style>{`
        html, body { overflow: hidden; }
        .crd-lienzo .crd-journey-sticky { cursor: grab; }
        .crd-lienzo .crd-journey-sticky:active { cursor: grabbing; }
        .crd-lienzo .crd-journey-sticky > *:not(:first-child) { pointer-events: none !important; }
        .crd-lienzo .crd-capa-nav { pointer-events: none; }
      `}</style>

      <div className="crd-journey-sticky sticky top-0 h-[100svh] w-full overflow-hidden">
        <Map
          ref={mapRef}
          theme="light"
          projection={PROYECCION_DEL_RECORRIDO}
          onLoad={handleLoad}
          interactive
          attributionControl={false}
        >
          <HeroPinMarker />
          <DestinosSection />
          <MapaSection />
          <ViajerosNegociosSection />
          <EquipoSection />
          <CTASection />
        </Map>
        <HeroOverlay />
      </div>

      <div className="crd-capa-nav">
        <Nav />
      </div>
      <JourneyStepper
        index={index}
        onPrev={() => porNombre(Math.max(0, index - 1))}
        onNext={() => porNombre(Math.min(SCENE_BANDS.length - 1, index + 1))}
        onChapter={porNombre}
        // No hay footer al que salir: la escena final vuelve al principio.
        onEnd={() => porNombre(0)}
        visible
      />
    </div>
  );
}

export default function LienzoPage() {
  return (
    <SceneProvider>
      <LienzoInner />
    </SceneProvider>
  );
}
