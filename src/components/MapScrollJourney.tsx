"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { useScene } from "@/context/SceneContext";
import { useJourneyScroll } from "@/hooks/useJourneyScroll";
import { useJourneySteps } from "@/hooks/useJourneySteps";
import { useHeroIdleMotion } from "@/hooks/useHeroIdleMotion";
import { useViewportMode } from "@/hooks/useIsMobile";
import { useJourneyMotor } from "@/lib/journeyMotor";
import { aligerarEstilo, proyeccionPara, soloTopónimosDeRD } from "@/lib/journeyMapaLigero";
import MapaEscenas from "@/components/map/MapaEscenas";
import { SCENES, SCENE_BANDS, TRIGGER_TOTAL_VH } from "@/lib/journey";
import { applyJourneyFrame, measureViewport } from "@/lib/journeyCamera";
import { cameraAtProgress, REFERENCE_VIEWPORT } from "@/lib/journey";
import { registerSceneJumper, scrollToFooter, scrollToSection } from "@/lib/journeyNav";
import JourneyProgress from "@/components/JourneyProgress";
import JourneyStepper from "@/components/JourneyStepper";
import HeroOverlay, { HeroPinMarker } from "@/sections/HeroOverlay";
import DestinosSection from "@/sections/DestinosSection";
import MapaSection from "@/sections/MapaSection";
import ViajerosNegociosSection from "@/sections/ViajerosNegociosSection";
import EquipoSection from "@/sections/EquipoSection";
import CTASection from "@/sections/CTASection";

// MapLibre es la firma del journey pero no un requisito para que el hero se
// lea. El motor (1 MB con el CSS) llega en su propio chunk, después del primer
// pintado, y el resto de la página no lo espera.
//
// Que esto funcione depende de que nadie más importe `engine`: las secciones
// consumen `map/context`, que sólo tiene `import type` de maplibre. Un import
// de valor desde el grafo inicial devolvería el motor al HTML de arranque y
// este `dynamic` volvería a ser decorativo, que es justo lo que pasaba antes.
const Map = dynamic(() => import("@/components/map/engine").then((mod) => mod.Map), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="absolute inset-0 bg-cream" />,
});

// Applied once on map load — aligns water/border colors with brand palette
function applyBrandPaint(map: maplibregl.Map) {
  // El estilo Carto no siempre expone estas capas → guardar con getLayer para
  // no ensuciar la consola con "Cannot style non-existing layer".
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#c8ede9");
  if (map.getLayer("admin_country")) {
    map.setPaintProperty("admin_country", "line-color", "#0F1A2E");
    map.setPaintProperty("admin_country", "line-width", 2);
  }

  // Mata el "ring": el globo de MapLibre dibuja una atmósfera (halo difuso más
  // grande que la esfera). `atmosphere-blend: 0` la apaga ⇒ el globo se recorta
  // limpio. El área alrededor queda transparente y muestra el crema del wrapper.
  map.setSky({ "atmosphere-blend": 0 });
}

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { activeScene, setActiveScene, progress } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);
  const { mobile: isMobile, resolved: viewportResolved } = useViewportMode();

  // PROTOTIPO: `?motor=` elige quién conduce en escritorio (ver lib/journeyMotor).
  // El teléfono ignora la query — su motor es el de pasos pase lo que pase.
  const {
    motor,
    globo,
    dpr,
    estilo,
    proj,
    mapa,
    soloTopónimosRD,
    resolved: motorResolved,
  } = useJourneyMotor();
  const porImagenes = mapa === "imagenes";
  const resolved = viewportResolved && motorResolved;
  /** ¿Conduce el motor de pasos? Siempre en teléfono, y en escritorio con `?motor=pasos`. */
  const porPasos = isMobile || motor === "pasos";
  const camara = motor === "vuelos" ? "vuelos" : "frame";

  // El journey móvil bloquea el scroll de la página; solo se libera al final
  // para dejar bajar al footer (y se vuelve a bloquear al regresar arriba).
  const [unlocked, setUnlocked] = useState(false);
  const [stepperVisible, setStepperVisible] = useState(true);
  const leftJourney = useRef(false);

  // Dos motores excluyentes escribiendo el mismo progreso: desktop = scroll
  // continuo con tope de velocidad, móvil = pasos discretos desde el panel
  // inferior (decisión del dueño, ago 2026: el scroll táctil corría demasiado).
  // Ambos gated hasta que matchMedia resuelve, para que un frame desktop nunca
  // adelante un teléfono hasta el CTA.
  const { jumpToScene } = useJourneyScroll({
    containerRef: outerRef,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
    enabled: resolved && !porPasos,
    camara,
  });
  const { goTo, next, prev, index } = useJourneySteps({
    enabled: resolved && porPasos,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
  });

  // `?globo=off` la apaga: en escritorio corre 10 s escribiendo la cámara por
  // frame, y es un problema independiente del motor que se compara.
  useHeroIdleMotion(mapRef, progress, globo && activeScene === "hero");

  // Los enlaces de nav/footer (`trigger-<escena>`) van al keyframe de la escena
  // en ambos modos. En desktop la navegación es teletransporte + vuelo directo
  // de cámara (jumpToScene): clicar "Equipo" no re-narra el recorrido.
  useEffect(() => {
    return registerSceneJumper((scene) => {
      const i = SCENE_BANDS.findIndex((b) => b.name === scene);
      if (i < 0) return false;
      if (porPasos) {
        // Un link desde el footer llega con la página desbloqueada y abajo:
        // volver arriba y dejar que el motor de pasos anime hasta la escena.
        window.scrollTo({ top: 0, behavior: "smooth" });
        goTo(i);
      } else {
        jumpToScene(i);
      }
      return true;
    });
  }, [porPasos, goTo, jumpToScene]);

  // Bloqueo del scroll de página cuando conduce el motor de pasos (siempre en
  // el teléfono, y en escritorio con `?motor=pasos`). Con `overflow:hidden` un swipe
  // vertical no mueve la página, pero los bottom-sheets y la sección de equipo
  // siguen scrolleando POR DENTRO (a diferencia de `touch-action`, que los
  // habría anulado también). Ese scroll interno no cambia de escena: la escena
  // solo avanza desde el panel de pasos.
  useEffect(() => {
    if (!resolved || !porPasos || unlocked) return;
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
  }, [resolved, porPasos, unlocked]);

  // El panel es fijo: se retira cuando el usuario sale del journey al footer,
  // y al volver arriba el journey recupera el bloqueo del gesto vertical.
  useEffect(() => {
    if (!porPasos) return;
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
  }, [porPasos, unlocked]);

  const goToFooter = useCallback(() => {
    setUnlocked(true);
    requestAnimationFrame(() => scrollToFooter());
  }, []);

  // Enlaces que llegan de fuera con hash (`…/#trigger-mapa`, el CTA de los
  // correos). El salto nativo del navegador aterriza en el BORDE de la banda
  // de scroll, no en el keyframe, y en móvil la pista va comprimida en dvh, así
  // que cae en cualquier sitio. Se resuelve con el mismo saltador del nav, ya
  // registrado por el efecto de arriba.
  useEffect(() => {
    const scene = window.location.hash.slice(1);
    if (!scene.startsWith("trigger-")) return;
    const id = window.setTimeout(() => scrollToSection(scene), 120);
    return () => window.clearTimeout(id);
  }, []);

  // On load: brand paint + posiciona la cámara según el progreso actual, así no
  // se queda en el view inicial hasta la primera interacción.
  const handleLoad = useCallback(
    (map: maplibregl.Map) => {
      applyBrandPaint(map);
      // PROTOTIPO: el recorte del basemap va antes del primer frame, así el
      // mapa nunca llega a dibujar las capas que se van a apagar.
      aligerarEstilo(map, estilo);
      if (soloTopónimosRD) soloTopónimosDeRD(map);
      // El generador de escenas pregunta por la cámara de cualquier progreso,
      // no sólo la de los keyframes: los tramos con mucho salto de zoom llevan
      // fotogramas intermedios y tienen que salir de esta misma matemática.
      const w = window as unknown as {
        __crdCamara?: (p: number) => unknown;
        __crdBandas?: unknown;
      };
      // Viewport de REFERENCIA, no el real: el arco de zoom de un tramo se
      // calcula para que los dos extremos quepan en pantalla, así que con otra
      // ventana el vuelo pasa por zooms distintos y los fotogramas dejarían de
      // calzar. El reproductor usa este mismo viewport.
      w.__crdCamara = (prog: number) => cameraAtProgress(prog, REFERENCE_VIEWPORT);
      w.__crdBandas = SCENE_BANDS.map((b) => ({ name: b.name, center: b.center }));
      measureViewport();
      applyJourneyFrame(map, progress.get());
    },
    [progress, estilo, soloTopónimosRD]
  );

  return (
    <div
      ref={outerRef}
      className="crd-journey"
      data-active-scene={activeScene}
      // PROTOTIPO: con "pasos" el CSS colapsa la pista de scroll a 100dvh
      // también en escritorio, igual que hace el media query del teléfono.
      data-motor={motor}
      style={{ "--crd-track-vh": TRIGGER_TOTAL_VH } as React.CSSProperties}
    >
      {/* Sticky layer — map stays fixed while scroll track advances below.
          Fondo crema (con halos cálidos de marca) detrás del canvas: el globo,
          ya sin atmósfera, flota sobre este crema en el hero. En las escenas con
          zoom el mapa es opaco y tapa el gradiente. */}
      {/* h-[100dvh] y no 100vh: en móvil la barra de URL cambia el 100vh y el
          globo se movía verticalmente al aparecer/desaparecer. El fondo son tres
          radial-gradients de marca; como utilidad arbitraria sería ilegible, así
          que vive en .crd-journey-sticky. */}
      <div className="crd-journey-sticky sticky top-0 h-[100dvh] w-full overflow-hidden">
        {/* PROTOTIPO `?mapa=imagenes`: las escenas capturadas van DEBAJO, y
            MapLibre se queda arriba con el canvas oculto y a resolución mínima.
            Sigue ahí porque es quien proyecta lat/lng a píxel para los pines y
            las rutas; lo que se le quita es el trabajo de dibujar. */}
        {porImagenes && <MapaEscenas />}
        <Map
          ref={mapRef}
          theme="light"
          projection={proyeccionPara(proj)}
          initialViewState={{
            longitude: -70.1627,
            latitude: 18.7357,
            zoom: 2.5,
            pitch: 0,
            bearing: -20,
          }}
          onLoad={handleLoad}
          pixelRatio={porImagenes ? 0.04 : dpr}
          className={porImagenes ? "crd-mapa-mudo" : undefined}
          interactive={false}
          scrollZoom={false}
          dragPan={false}
          dragRotate={false}
          touchZoomRotate={false}
          attributionControl={false}
        >
          <HeroPinMarker />
          <DestinosSection />
          <MapaSection />
          <ViajerosNegociosSection />
          <EquipoSection />
          <CTASection />
        </Map>

        {/* Fuera del <Map>: el mapa se carga con `ssr: false` y todo lo que
            cuelgue de él desaparece del HTML inicial. El hero es lo primero
            que se ve y su logo es el LCP, así que se sirve renderizado desde
            el servidor y se pinta sin esperar a MapLibre (audit 5.6). */}
        <HeroOverlay />
      </div>

      {/* Fuera de la capa sticky: son `fixed` y deben sobrevivir a todo el
          recorrido, no solo al viewport de una escena. */}
      <JourneyProgress />
      <JourneyStepper
        index={index}
        onPrev={prev}
        onNext={next}
        onChapter={goTo}
        onEnd={goToFooter}
        visible={stepperVisible}
        // El panel se oculta en escritorio salvo que sea quien conduce.
        enEscritorio={motor === "pasos"}
      />

      {/* Anchor divs — pista nativa de scroll, solo desktop (en móvil no hay
          pista: el panel de pasos anima el progreso y el CSS los oculta). */}
      {SCENES.map((scene) => (
        <div
          key={scene.name}
          id={`trigger-${scene.name}`}
          className="crd-journey-anchor pointer-events-none"
          data-scene={scene.name}
          // Altura por escena: es dato, no estilo, así que sigue inline.
          style={{ height: `${scene.height}vh` }}
        />
      ))}

    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

// El <SceneProvider> no vive aquí sino en JourneyHome: el nav también lee la
// escena activa para marcar su enlace, y es hermano del journey, no hijo.
export default function MapScrollJourney() {
  const mapRef = useRef<maplibregl.Map | null>(null);

  return <MapScrollInner mapRef={mapRef} />;
}
