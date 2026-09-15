"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type maplibregl from "maplibre-gl";
import { useScene } from "@/context/SceneContext";
import { useJourneySteps } from "@/hooks/useJourneySteps";
import { useJourneyGestos } from "@/hooks/useJourneyGestos";
import { useHeroIdleMotion } from "@/hooks/useHeroIdleMotion";
import { useViewportMode } from "@/hooks/useIsMobile";
import { cameraAtProgress, SCENES, SCENE_BANDS } from "@/lib/journey";
import { applyJourneyFrame, currentViewport, measureViewport } from "@/lib/journeyCamera";
import { calentarRecorrido, calentarTerreno, siguienteDestino } from "@/lib/calentarRecorrido";
import { aligerarEstilo, pintarCartografia, PROYECCION_DEL_RECORRIDO, soloTopónimosDeRD } from "@/lib/mapaLigero";
import { ponerRelieve } from "@/lib/relieve";
import { registerSceneJumper, scrollToFooter, scrollToSection } from "@/lib/journeyNav";
import { marcar, publicarMapa } from "@/lib/medicion/marcas";
import DiscoDelGlobo from "@/components/DiscoDelGlobo";
import JourneyProgress from "@/components/JourneyProgress";
import JourneyStepper from "@/components/JourneyStepper";
import HeroEspacio, { CapasNasaJourney, descensoDe, HeroPinMarker } from "@/sections/HeroEspacio";
import Cielo from "@/sections/espacio/Cielo";
import { cajaDelGlobo } from "@/components/DiscoDelGlobo";
import e from "@/sections/espacio/espacio.module.css";

// Los paneles de las escenas van detrás del mismo `dynamic` que el motor del
// mapa. Son ~4.000 líneas que el arranque no necesita: en el primer pixel sólo
// se ve el hero, y ninguno de estos paneles existe hasta que la cámara llega a
// su escena. Cargándolos con el motor y no antes, salen de los 921 KB de JS
// que el teléfono tiene que bajar, parsear y evaluar ANTES de hidratar, que es
// el 55 % del tiempo hasta ver el globo (auditoría de rendimiento, 28 ago).
//
// `ssr: false` como el motor, y por la misma razón: son hijos del <Map>, que
// ya es cliente puro, así que nunca formaron parte del HTML del servidor.
// Sin `loading`: son overlays invisibles fuera de su escena, y un placeholder
// sólo añadiría un nodo que tapa el mapa.
//
// El hero NO entra aquí: es el LCP y se sirve renderizado desde el servidor.
const DestinosSection = dynamic(() => import("@/sections/DestinosSection"), { ssr: false });
const MapaSection = dynamic(() => import("@/sections/MapaSection"), { ssr: false });
const ViajerosNegociosSection = dynamic(() => import("@/sections/ViajerosNegociosSection"), { ssr: false });
const EquipoSection = dynamic(() => import("@/sections/EquipoSection"), { ssr: false });
const CTASection = dynamic(() => import("@/sections/CTASection"), { ssr: false });

// MapLibre es la firma del journey pero no un requisito para que el hero se
// lea. El motor (1 MB con el CSS) llega en su propio chunk, después del primer
// pintado, y el resto de la página no lo espera.
//
// Que esto funcione depende de que nadie más importe `engine`: las secciones
// consumen `map/context`, que sólo tiene `import type` de maplibre. Un import
// de valor desde el grafo inicial devolvería el motor al HTML de arranque y
// este `dynamic` volvería a ser decorativo, que es justo lo que pasaba antes.
// Sin placeholder: el hueco del mapa lo ocupa el cielo, que ya está pintado
// detrás. El crema que había aquí era una sábana blanca a pantalla completa
// sobre el espacio durante todo lo que tarda el chunk de MapLibre, y el disco
// del globo se encarga de reservar el sitio de la esfera.
const Map = dynamic(() => import("@/components/map/engine").then((mod) => mod.Map), {
  ssr: false,
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

// La pintura de marca del mapa. Se aplica en `onStyle`, o sea en cuanto el
// estilo está parseado y antes del primer frame, no en `load`: lo que se pinta
// aquí es lo que decide de qué color nace el planeta.
// Exportada para que el lienzo de /dev/camara pinte el mapa igual que el sitio.
export function applyBrandPaint(map: maplibregl.Map) {
  // El globo del hero va sin etiquetas. Los nombres de continente y de país
  // sobre la esfera no dicen nada que el hero necesite, y a este zoom compiten
  // con el titular y con el pin, que es lo único que hay que mirar.
  //
  // El corte va por zoom y no por escena porque sale gratis: el hero está en
  // 1.95 y el cierre en 2.2, y todas las demás escenas están en 6.1 o más
  // arriba, así que z5 separa unas de otras sin tener que tocar el estilo cada
  // vez que cambia la escena. Sólo se sube el mínimo, nunca se baja: una capa
  // que ya aparecía más tarde se queda como estaba.
  //
  // Alcanza a TODA capa de símbolo, incluidos los nombres de mares, que viven
  // en `water_name` y por tanto se escapan del filtro de topónimos de
  // `lib/mapaLigero`. Es deliberado: sobre estos dos globos no va ni un texto.
  for (const capa of map.getStyle().layers) {
    if (capa.type !== "symbol") continue;
    map.setLayerZoomRange(capa.id, Math.max(capa.minzoom ?? 0, 5), capa.maxzoom ?? 24);
  }

  // Mata el "ring": el globo de MapLibre dibuja una atmósfera (halo difuso más
  // grande que la esfera). `atmosphere-blend: 0` la apaga ⇒ el globo se recorta
  // limpio. El área alrededor queda transparente y muestra el crema del wrapper.
  map.setSky({ "atmosphere-blend": 0 });

  // Los tres recortes al basemap, con su porqué y sus cifras en lib/mapaLigero:
  // fuera las capas que a este zoom dibujan lo mismo que otra (o que el
  // relieve), las carreteras dejan de ser cicatrices blancas, y de la toponimia
  // sólo quedan las ciudades y los pueblos de RD, y sólo en los closeups.
  aligerarEstilo(map);
  pintarCartografia(map);
  soloTopónimosDeRD(map);

  // El relieve de la isla, encima del agua y bajo todo lo demás (lib/relieve):
  // teselas nuestras con el color por altura, la sombra y el mar ya horneados.
  // Arranca en z4, así que el globo del hero no pide ni una. Va al final porque
  // también fija el fondo y el color del agua, incluidos los tonos de noche con
  // los que nace el planeta.
  ponerRelieve(map);
}

// Feel del slideshow de escritorio, elegido entre tres variantes en el mismo
// preview: un notch de rueda o medio swipe corto de trackpad vale un paso, y
// 220 ms de silencio separan dos gestos.
const GESTO = { umbral: 40, silencioMs: 220 };

// ─── Inner component (consumes SceneContext) ──────────────────────────────────

function MapScrollInner({ mapRef }: { mapRef: React.RefObject<maplibregl.Map | null> }) {
  const { activeScene, setActiveScene, progress } = useScene();
  const outerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const { mobile: isMobile, resolved: viewportResolved } = useViewportMode();

  // El recorrido bloquea el scroll de la página; solo se libera al final para
  // dejar bajar al footer (y se vuelve a bloquear al regresar arriba).
  const [unlocked, setUnlocked] = useState(false);
  const [stepperVisible, setStepperVisible] = useState(true);
  const leftJourney = useRef(false);

  // Un solo motor en los dos viewports: pasos discretos. Quién pide el paso
  // cambia por viewport: el panel inferior en el teléfono, la rueda y el
  // teclado en escritorio. Gated hasta que matchMedia resuelve, porque el
  // primer encuadre depende del tamaño real de la ventana.
  const { goTo, next, prev, index, count, enVuelo } = useJourneySteps({
    enabled: viewportResolved,
    mapRef,
    progress,
    onSceneChange: setActiveScene,
  });

  // Salir al pie es desbloquear y, sólo cuando el pie ya está en el flujo
  // (la regla de globals.css lo retira mientras dura el bloqueo), scrollear
  // hasta él. Un rAF no bastaba: desde la rueda el estado se aplica después
  // del frame y el pie seguía sin existir cuando se le pedía la posición.
  const goToFooter = useCallback(() => setUnlocked(true), []);
  useEffect(() => {
    if (unlocked) scrollToFooter();
  }, [unlocked]);

  useJourneyGestos({
    enabled: viewportResolved && !isMobile && !unlocked,
    params: GESTO,
    enVuelo,
    index,
    count,
    next,
    prev,
    goTo,
    onEnd: goToFooter,
  });

  useHeroIdleMotion(mapRef, progress, activeScene === "hero");

  // Al llegar a un destino se calienta el terreno del siguiente: la persona lee
  // la carta unos segundos y las teselas llegan antes que la cámara.
  useEffect(() => {
    if (!activeScene.startsWith("polaroid-")) return;
    const siguiente = siguienteDestino(activeScene);
    if (!siguiente) return;
    const ctl = new AbortController();
    calentarTerreno(siguiente, currentViewport(), ctl.signal).catch(() => {});
    return () => ctl.abort();
  }, [activeScene]);

  // La escena desde el espacio lee el descenso desde CSS: el sticky publica
  // `--descenso` (0 en el hero, 1 al aterrizar en el primer destino) y la
  // fase, una vez por frame del vuelo y sin pasar por React. También el radio
  // exacto del globo, del mismo modelo que dimensiona el disco de reserva.
  useEffect(() => {
    const sticky = stickyRef.current;
    if (!sticky) return;
    const escribir = (p: number) => {
      const t = descensoDe(p);
      sticky.style.setProperty("--descenso", t.toFixed(4));
      sticky.dataset.fase = t < 0.04 ? "hero" : t > 0.96 ? "destino" : "descenso";
    };
    const medir = () => {
      const { diametro } = cajaDelGlobo(window.innerWidth, window.innerHeight);
      sticky.style.setProperty("--globo-r", `${(diametro / 2).toFixed(1)}px`);
    };
    escribir(progress.get());
    medir();
    const parar = progress.on("change", escribir);
    window.addEventListener("resize", medir);
    return () => {
      parar();
      window.removeEventListener("resize", medir);
    };
  }, [progress]);

  // Los enlaces de nav/footer (`trigger-<escena>`) van al keyframe de la escena.
  // Un link desde el pie llega con la página desbloqueada y abajo: volver
  // arriba y dejar que el motor anime hasta la escena.
  useEffect(() => {
    return registerSceneJumper((scene) => {
      const i = SCENE_BANDS.findIndex((b) => b.name === scene);
      if (i < 0) return false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      goTo(i);
      return true;
    });
  }, [goTo]);

  // Bloqueo del scroll de página. Con `overflow:hidden` ni un swipe ni la rueda
  // mueven la página, pero los bottom-sheets y la sección de equipo siguen
  // scrolleando POR DENTRO (a diferencia de `touch-action`, que los habría
  // anulado también). Ese scroll interno no cambia de escena: la escena solo
  // avanza por pasos.
  useEffect(() => {
    if (!viewportResolved || unlocked) return;
    // Sobre <html> y no solo <body>: globals.css le pone `overflow-x: clip` al
    // root, y con el root en overflow no-visible el overflow del body deja de
    // propagarse al viewport (el bloqueo no llegaba a aplicarse).
    // Se limpia a "" en vez de restaurar el valor previo: en StrictMode el
    // efecto corre dos veces y el "previo" de la segunda pasada ya sería
    // "hidden", que quedaría fijado para siempre.
    const root = document.documentElement;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // El pie se retira del flujo mientras dura el bloqueo (regla en
    // globals.css). `overflow:hidden` no basta: Safari en iOS lo ignora para el
    // gesto táctil, y el pie asomaba en cualquier escena del recorrido sin
    // forma de quitarlo. Sin nada debajo de la pantalla no hay scroll posible.
    root.dataset.recorrido = "bloqueado";
    return () => {
      root.style.overflow = "";
      document.body.style.overflow = "";
      delete root.dataset.recorrido;
    };
  }, [viewportResolved, unlocked]);

  // El panel es fijo: se retira cuando el usuario sale del journey al footer,
  // y al volver arriba el journey recupera el bloqueo del gesto vertical.
  useEffect(() => {
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
  }, [unlocked]);

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

  // Enlaces que llegan de fuera con hash (`…/#trigger-mapa`, el CTA de los
  // correos). El salto nativo del navegador aterriza en el BORDE de la banda
  // de scroll, no en el keyframe, y en móvil la pista va comprimida en dvh, así
  // que cae en cualquier sitio. Se resuelve con el mismo saltador del nav, ya
  // registrado por el efecto de arriba.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    // Una ruta compartida (/ruta/<slug>) abre directo en Tu ruta, que es donde
    // esas paradas ya están puestas.
    const scene = hash.startsWith("trigger-")
      ? hash
      : window.location.pathname.startsWith("/ruta/")
        ? "trigger-mapa"
        : "";
    if (!scene) return;
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
      marcar("mapa:load");
      publicarMapa(map);
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
          const v = currentViewport();
          calentarRecorrido(v, ctl.signal).catch(() => {});
          // El terreno del primer destino, para que el color y la sombra
          // estén ahí cuando termine el primer vuelo.
          calentarTerreno("polaroid-0", v, ctl.signal).catch(() => {});
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
    >
      {/* Sticky layer — map stays fixed while scroll track advances below.
          Fondo crema (con halos cálidos de marca) detrás del canvas: es lo que
          queda cuando el cielo del hero se ha ido. En las escenas con zoom el
          mapa es opaco y tapa el gradiente. */}
      {/* h-[100dvh] y no 100vh: en móvil la barra de URL cambia el 100vh y el
          globo se movía verticalmente al aparecer/desaparecer. El fondo son tres
          radial-gradients de marca; como utilidad arbitraria sería ilegible, así
          que vive en .crd-journey-sticky. */}
      {/* svh y no dvh: el recorrido tiene el scroll bloqueado, así que iOS
          nunca retrae la barra de Safari y lo que se ve es SIEMPRE el viewport
          pequeño. Con dvh la capa medía hasta 190px más de lo visible y todo lo
          anclado abajo —el botón del sheet, el pie de la carta del CTA— caía
          detrás del panel de pasos o fuera de pantalla. */}
      <div ref={stickyRef} className={`crd-journey-sticky ${e.escena} ${e.arcoBajo} sticky top-0 h-[100svh] w-full overflow-hidden`}>
        {/* El cielo, DEBAJO del canvas: estrellas, noche y el amanecer que la
            cubre durante el vuelo. Al aterrizar ya no queda nada de él. */}
        <Cielo />

        <Map
          ref={mapRef}
          theme="light"
          projection={PROYECCION_DEL_RECORRIDO}
          initialViewState={initialViewState}
          maxTileCacheZoomLevels={CACHE_NIVELES_DE_ZOOM}
          onStyle={applyBrandPaint}
          onLoad={handleLoad}
          interactive={false}
          scrollZoom={false}
          dragPan={false}
          dragRotate={false}
          touchZoomRotate={false}
          attributionControl={false}
        >
          <CapasNasaJourney />
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
        <HeroEspacio />
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

      {/* Anclas sin alto y ocultas: no hay pista de scroll que recorrer, el
          motor de pasos anima el progreso. Siguen en el DOM porque son el
          destino de los `#trigger-<escena>` que llegan de fuera (el CTA de los
          correos) y el fallback por id de `journeyNav` cuando el saltador no
          está montado. */}
      {SCENES.map((scene) => (
        <div
          key={scene.name}
          id={`trigger-${scene.name}`}
          className="crd-journey-anchor pointer-events-none"
          data-scene={scene.name}
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
