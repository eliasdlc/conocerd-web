"use client";

import dynamic from "next/dynamic";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import {
  cameraAtProgress,
  heroFactorAtProgress,
  paddingAtProgress,
  SCENE_BANDS,
  type JourneyViewport,
} from "@/lib/journey";
import { MOBILE_BREAKPOINT } from "@/hooks/useIsMobile";

// ─────────────────────────────────────────────────────────────────────────────
//  Andamiaje compartido de las propuestas CON GLOBO.
//
//  La home real es un recorrido: el hero muestra el globo y, al bajar, la
//  cámara desciende hasta el primer destino. Una propuesta de primera pantalla
//  que no demuestre ese descenso no se puede juzgar — por eso este componente
//  monta el mismo <Map> del journey, con el mismo keyframe `hero`, y reproduce
//  el tramo hero → polaroid-0 usando LA MATEMÁTICA REAL (`cameraAtProgress`),
//  no una aproximación.
//
//  Lo que aporta cada variante es la composición del overlay; lo que aporta
//  este archivo es que el globo esté vivo, encuadrado y que el descenso se
//  sienta igual que en producción.
// ─────────────────────────────────────────────────────────────────────────────

const Map = dynamic(() => import("@/components/map/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="absolute inset-0 bg-cream" />,
});

/** Progreso del journey al que equivale el final de la pista (keyframe del primer destino). */
const P_DESTINO = SCENE_BANDS[1].center;

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Encuadre = {
  /** Fracción del ancho que el overlay ocupa a la IZQUIERDA en desktop (el globo se va a la derecha). 0 = globo centrado. */
  padLeft?: number;
  /** Fracción del alto que el overlay ocupa ABAJO en móvil (el globo sube). 0 = globo centrado. */
  padBottom?: number;
};

/** Encuadre del hero en producción: texto a la izquierda / globo arriba en móvil. */
export const ENCUADRE_ACTUAL: Encuadre = { padLeft: 0.44, padBottom: 0.4 };

type EstadoDescenso = {
  /** 0 = hero quieto, 1 = cámara aterrizada en el primer destino. */
  t: number;
  /** Progreso equivalente del journey real. */
  p: number;
  /** `hero` mientras el globo manda, `descenso` en pleno vuelo, `destino` al aterrizar. */
  fase: "hero" | "descenso" | "destino";
  /** `true` cuando el mapa cargó (para desvanecer fallbacks). */
  listo: boolean;
};

const DescensoContext = createContext<EstadoDescenso>({
  t: 0,
  p: 0,
  fase: "hero",
  listo: false,
});

/**
 * Estado del descenso para los overlays: permite atenuar el copy, abrir una
 * máscara o encender datos a medida que la cámara baja.
 * También hay un `--descenso` (0..1) como custom property en el contenedor
 * sticky, por si prefieres reaccionar sólo con CSS.
 */
export function useDescenso(): EstadoDescenso {
  return useContext(DescensoContext);
}

function pintarMarca(map: maplibregl.Map) {
  if (map.getLayer("water")) map.setPaintProperty("water", "fill-color", "#c8ede9");
  if (map.getLayer("admin_country")) {
    map.setPaintProperty("admin_country", "line-color", "#264653");
    map.setPaintProperty("admin_country", "line-width", 2);
  }
  // Mata el halo atmosférico: el globo se recorta limpio contra el crema.
  map.setSky({ "atmosphere-blend": 0 });
}

export type GloboHeroProps = {
  /** Hueco que reserva tu composición. Por defecto, el mismo del hero en producción. */
  encuadre?: Encuadre;
  /** Alto de la pista de scroll en vh. Más alto = descenso más lento. */
  alturaVh?: number;
  /** Deja arrastrar/girar el globo con el dedo o el ratón (apaga la rotación en reposo). */
  interactivo?: boolean;
  /** Clases extra del viewport sticky (por ejemplo, un fondo distinto del crema). */
  className?: string;
  /** Se pinta DEBAJO del globo: útil para un cielo, una textura o un degradado. */
  fondo?: React.ReactNode;
  /** Marcadores u overlays que deben viajar pegados al mapa (`MapMarker`, `MapRoute`…). */
  capasDelMapa?: React.ReactNode;
  /** Tu composición. Se sirve desde el servidor (no cuelga del mapa) ⇒ el texto pinta antes que WebGL. */
  children: React.ReactNode;
};

/**
 * Globo del journey + pista de descenso.
 *
 * ```tsx
 * <GloboHero encuadre={{ padLeft: 0.44, padBottom: 0.4 }}>
 *   <MiComposicion />
 * </GloboHero>
 * ```
 *
 * El canvas SIEMPRE ocupa el viewport completo: si tu diseño recorta el globo
 * (una ventana, un medallón), hazlo con máscara/overlay encima, nunca
 * encogiendo el contenedor del mapa — al descender, el recorte tiene que poder
 * abrirse sin que la cámara cambie de tamaño.
 */
export default function GloboHero({
  encuadre = ENCUADRE_ACTUAL,
  alturaVh = 320,
  interactivo = false,
  className = "",
  fondo,
  capasDelMapa,
  children,
}: GloboHeroProps) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [estado, setEstado] = useState<EstadoDescenso>({ t: 0, p: 0, fase: "hero", listo: false });
  const [listo, setListo] = useState(false);
  const bearingIdle = useRef(0);
  const encuadreRef = useRef(encuadre);

  useEffect(() => {
    encuadreRef.current = encuadre;
  }, [encuadre]);

  // Un solo escritor de cámara, igual que en producción: mezcla el encuadre de
  // la propuesta (mientras manda el hero) con el del journey (al aterrizar).
  const escribirFrame = useRef((p: number) => {
    const map = mapRef.current;
    if (!map) return;
    const vp: JourneyViewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      mobile: window.innerWidth < MOBILE_BREAKPOINT,
    };
    const cam = cameraAtProgress(p, vp);
    const hero = heroFactorAtProgress(p);
    const journey = paddingAtProgress(p, vp);
    const propio = vp.mobile
      ? { top: 0, right: 0, bottom: Math.round(vp.height * (encuadreRef.current.padBottom ?? 0)), left: 0 }
      : { top: 0, right: 0, bottom: 0, left: Math.round(vp.width * (encuadreRef.current.padLeft ?? 0)) };

    map.jumpTo({
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing + bearingIdle.current * hero,
      padding: {
        top: lerp(journey.top, propio.top, hero),
        right: lerp(journey.right, propio.right, hero),
        bottom: lerp(journey.bottom, propio.bottom, hero),
        left: lerp(journey.left, propio.left, hero),
      },
    });
  });

  // Scroll → progreso. rAF de por medio: el listener sólo marca sucio.
  useEffect(() => {
    let raf = 0;
    let pendiente = false;

    const medir = () => {
      pendiente = false;
      const pista = pistaRef.current;
      if (!pista) return;
      const recorrido = pista.offsetHeight - window.innerHeight;
      const y = -pista.getBoundingClientRect().top;
      const t = recorrido > 0 ? clamp01(y / recorrido) : 0;
      const p = t * P_DESTINO;
      escribirFrame.current(p);
      setEstado((prev) =>
        Math.abs(prev.t - t) < 0.001 && prev.listo === listo
          ? prev
          : { t, p, fase: t < 0.04 ? "hero" : t > 0.96 ? "destino" : "descenso", listo }
      );
    };

    const alScroll = () => {
      if (pendiente) return;
      pendiente = true;
      raf = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", alScroll, { passive: true });
    window.addEventListener("resize", alScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", alScroll);
      window.removeEventListener("resize", alScroll);
    };
  }, [listo]);

  // Rotación en reposo del globo: la única excepción aprobada al "sin
  // animación en standby" (es el globo del hero en producción). Se apaga sola
  // a los 10 s, al primer scroll, y con prefers-reduced-motion.
  useEffect(() => {
    if (!listo || interactivo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let ultimo = 0;
    const inicio = performance.now();
    const tick = (ahora: number) => {
      if (ahora - inicio > 10_000 || window.scrollY > 8) return;
      const dt = ultimo ? Math.min(0.05, (ahora - ultimo) / 1000) : 0;
      ultimo = ahora;
      if (!document.hidden) {
        bearingIdle.current = (bearingIdle.current + 1.2 * dt) % 360;
        escribirFrame.current(0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listo, interactivo]);

  return (
    <div
      ref={pistaRef}
      className="crd-globo-pista relative w-full"
      style={{ height: `${alturaVh}dvh` }}
    >
      <div
        className={`sticky top-0 h-[100dvh] w-full overflow-hidden bg-cream ${className}`}
        data-fase={estado.fase}
        style={{ ["--descenso" as string]: estado.t.toFixed(4) }}
      >
        {fondo}

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
          onLoad={(map) => {
            mapRef.current = map;
            pintarMarca(map);
            setListo(true);
            escribirFrame.current(0);
          }}
          interactive={interactivo}
          scrollZoom={false}
          dragPan={interactivo}
          dragRotate={interactivo}
          touchZoomRotate={interactivo}
          attributionControl={false}
        >
          {capasDelMapa}
        </Map>

        {/* Sin WebGL (o con el CDN del estilo caído) el canvas queda en blanco:
            este disco mantiene la composición en pie en vez de dejar un hueco. */}
        {!listo && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="size-[min(74vmin,560px)] rounded-full bg-[radial-gradient(circle_at_34%_30%,#C6F3EB_0%,#9fdcd4_46%,#7cc4bd_72%,#5aa9a3_100%)] opacity-70 blur-[0.4px]" />
          </div>
        )}

        <DescensoContext.Provider value={estado}>{children}</DescensoContext.Provider>
      </div>
    </div>
  );
}
