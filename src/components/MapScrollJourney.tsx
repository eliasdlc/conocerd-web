"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { useScene } from "@/context/SceneContext";
import { useJourneyScroll } from "@/hooks/useJourneyScroll";
import { useJourneySteps } from "@/hooks/useJourneySteps";
import { useHeroIdleMotion } from "@/hooks/useHeroIdleMotion";
import { useViewportMode } from "@/hooks/useIsMobile";
import { cameraAtProgress, SCENES, SCENE_BANDS, TRIGGER_TOTAL_VH } from "@/lib/journey";
import { applyJourneyFrame, currentViewport, measureViewport } from "@/lib/journeyCamera";
import { calentarRecorrido } from "@/lib/calentarRecorrido";
import { calentadorTermino, marcaChunkMapa } from "@/lib/medicion";
import { registerSceneJumper, scrollToFooter, scrollToSection } from "@/lib/journeyNav";
import DiscoDelGlobo from "@/components/DiscoDelGlobo";
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
const Map = dynamic(() => {
  marcaChunkMapa("pide");
  return import("@/components/map/engine").then((mod) => {
    marcaChunkMapa("llega");
    return mod.Map;
  });
}, {
  ssr: false,
  loading: () => <div aria-hidden="true" className="absolute inset-0 bg-cream" />,
});

// Multiplicador de la caché de tiles de MapLibre. La caché no se dimensiona por
// niveles de zoom pese al nombre: es `tilesDelViewport × multiplicador`, o sea
// 60 tiles en escritorio (1440×900) y 30 en móvil (393×852) con el default de
// 5. El recorrido toca ~230 tiles distintos, así que con 60 ranuras la caché
// vive llena: medida en 3 pasadas da 60 de 60, sin una unidad de varianza, y
// cada regreso a la isla obliga a re-pedir, re-parsear y volver a subir a GPU
// las mismas teselas.
//
// 20 y no más porque el conjunto de trabajo real son ~145 tiles: con 240
// ranuras la ocupación se estabiliza en 142 y las descargas repetidas de RD
// bajan de 123 a 80 por recorrido (medianas de 3 pasadas). Con 720 ranuras el
// número es 78, idéntico dentro del ruido: pasar de 20 solo gasta memoria.
//
// Lo que este número NO arregla son las ~78 descargas repetidas que quedan.
// Esas no son desalojo: con 720 ranuras y 226 tiles distintos siguen ahí. Son
// tiles que se sueltan antes de tener datos porque `applyJourneyFrame` escribe
// la cámara por frame y barre los zooms más rápido de lo que el worker parsea.
const CACHE_NIVELES_DE_ZOOM = 20;

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

  // `water_shadow` de Positron dibuja el mismo polígono de agua que `water`,
  // desplazado, para simular una sombra bajo la costa. Con nuestro color de
  // agua queda tapada al 100 %: no aporta un solo píxel y sí manda toda la
  // geometría del océano una segunda vez. En el hero son 425,9k índices y 20
  // draw calls por frame para no cambiar nada (medido: 0 px de diferencia
  // sobre 2.073.600 en tres encuadres).
  if (map.getLayer("water_shadow")) {
    map.setLayoutProperty("water_shadow", "visibility", "none");
  }
}

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { activeScene, setActiveScene, progress } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);
  const { mobile: isMobile, resolved: viewportResolved } = useViewportMode();

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
    enabled: viewportResolved && !isMobile,
  });
  const { goTo, next, prev, index } = useJourneySteps({
    enabled: viewportResolved && isMobile,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
  });

  useHeroIdleMotion(mapRef, progress, activeScene === "hero");

  // Los enlaces de nav/footer (`trigger-<escena>`) van al keyframe de la escena
  // en ambos modos. En desktop la navegación es teletransporte + vuelo directo
  // de cámara (jumpToScene): clicar "Equipo" no re-narra el recorrido.
  useEffect(() => {
    return registerSceneJumper((scene) => {
      const i = SCENE_BANDS.findIndex((b) => b.name === scene);
      if (i < 0) return false;
      if (isMobile) {
        // Un link desde el footer llega con la página desbloqueada y abajo:
        // volver arriba y dejar que el motor de pasos anime hasta la escena.
        window.scrollTo({ top: 0, behavior: "smooth" });
        goTo(i);
      } else {
        jumpToScene(i);
      }
      return true;
    });
  }, [isMobile, goTo, jumpToScene]);

  // Bloqueo del scroll de página en móvil. Con `overflow:hidden` un swipe
  // vertical no mueve la página, pero los bottom-sheets y la sección de equipo
  // siguen scrolleando POR DENTRO (a diferencia de `touch-action`, que los
  // habría anulado también). Ese scroll interno no cambia de escena: la escena
  // solo avanza desde el panel de pasos.
  useEffect(() => {
    if (!viewportResolved || !isMobile || unlocked) return;
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
  }, [viewportResolved, isMobile, unlocked]);

  // El panel es fijo: se retira cuando el usuario sale del journey al footer,
  // y al volver arriba el journey recupera el bloqueo del gesto vertical.
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

  // El mapa se construye con el encuadre real del hero para ESTE viewport, no
  // con uno fijo de escritorio. Antes se construía siempre en z2.5: en móvil
  // eso pedía teselas de z2 que `handleLoad` tiraba acto seguido al mover la
  // cámara a z1.15, y el arranque cargaba dos juegos de teselas en vez de uno.
  // `measureViewport` ya devuelve la referencia 1440×900 cuando no hay window,
  // así que esto es seguro en el servidor; y el inicializador de `useState`
  // corre una sola vez, no en cada render.
  const [initialViewState] = useState(() => {
    const cam = cameraAtProgress(0, measureViewport());
    return {
      longitude: cam.center[0],
      latitude: cam.center[1],
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
    };
  });

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
  // El disco del hero se retira en cuanto el mapa existe y ha pintado. `load`
  // es el evento correcto y no `idle`: `idle` espera a que TODAS las teselas
  // del encuadre esten, que con perfil de telefono son 950 ms mas, y la
  // decision fue que el mapa aparezca lo antes posible.
  const [mapaPinto, setMapaPinto] = useState(false);

  // Cancela el calentado de teselas si el componente se va antes de terminar.
  const calentado = useRef<AbortController | null>(null);
  useEffect(() => () => calentado.current?.abort(), []);

  const handleLoad = useCallback(
    (map: maplibregl.Map) => {
      applyBrandPaint(map);
      measureViewport();
      applyJourneyFrame(map, progress.get());
      setMapaPinto(true);

      // Las teselas del resto del recorrido, una vez el mapa terminó de pintar
      // lo que la persona mira ahora. Antes de `idle` competiría por la
      // conexión con el encuadre actual y el efecto neto sería peor.
      map.once("idle", () => {
        if (calentado.current) return;
        const ctl = new AbortController();
        calentado.current = ctl;
        const arrancar = () => {
          const t0 = performance.now();
          calentarRecorrido(currentViewport(), ctl.signal)
            .then((n) => calentadorTermino(n, performance.now() - t0))
            .catch(() => {});
        };
        // El tipo se anota opcional a mano: Safari no trae requestIdleCallback
        // hasta 16.4 y TypeScript lo da por presente siempre.
        const ocioso: typeof window.requestIdleCallback | undefined = window.requestIdleCallback;
        if (ocioso) ocioso(arrancar, { timeout: 2000 });
        else window.setTimeout(arrancar, 500);
      });
    },
    [progress]
  );

  return (
    <div
      ref={outerRef}
      className="crd-journey"
      data-active-scene={activeScene}
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
        <Map
          ref={mapRef}
          theme="light"
          projection={{ type: "globe" }}
          initialViewState={initialViewState}
          maxTileCacheZoomLevels={CACHE_NIVELES_DE_ZOOM}
          onLoad={handleLoad}
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

        {/* Ocupa el sitio del globo mientras el mapa no existe. Va aquí, entre
            el canvas y el overlay, para que el mapa aparezca por debajo cuando
            el disco se desvanece. */}
        <DiscoDelGlobo visible={!mapaPinto} />

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
