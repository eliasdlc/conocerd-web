"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useInclinacion } from "@/hooks/useInclinacion";

import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/context";
import { FEATURED_DESTINATIONS, CATEGORY_META } from "@/data/destinations";
import { type LngLat } from "@/lib/geo";
import { POLAROID_PAPER, PolaroidMedia, PolaroidCaption, PolaroidVivo } from "@/components/Polaroid";
import { useClima } from "@/context/ClimaContext";
import { PIN_CHROME } from "@/components/map/pins";
import featuredRoute from "@/data/routes/featured-route.json";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Los 6 destinos del journey vienen de la fuente de verdad única (#5).
const POLAROIDS = FEATURED_DESTINATIONS;

// Ruta REAL por carretera entre los 6 destinos (OSRM, precalculada y
// simplificada en src/data/routes/featured-route.json): las líneas del finale
// siguen las calles del país, no cuerdas rectas entre pines.
const ROUTE_COORDS: LngLat[] = (featuredRoute.legs as [number, number][][]).flat();

// Dónde está cada carta en la mesa.
//
// En cuadro hay dos: la que acaba de entrar y la anterior, que se retira detrás
// y a la izquierda (decisión 2C). Las que ya pasaron salen del cuadro y no
// dejan rastro (3A), así que el capítulo nunca acumula más de dos cartas.
//
// Los valores son porcentajes del ancho de la carta, no píxeles: la mesa cambia
// de tamaño entre escritorio y teléfono y la composición tiene que ser la misma.
const MESA = {
  frente: { x: "0%", y: "0%", scale: 1, rotate: 1.4, opacity: 1, zIndex: 3 },
  atras: { x: "-44%", y: "-7%", scale: 0.84, rotate: -3.4, opacity: 0.5, zIndex: 2 },
  fuera: { x: "-112%", y: "-13%", scale: 0.7, rotate: -7, opacity: 0, zIndex: 1 },
  porVenir: { x: "34%", y: "22%", scale: 0.92, rotate: 5, opacity: 0, zIndex: 4 },
} as const;

type Puesto = keyof typeof MESA;

/** Qué puesto le toca a la carta `i` con `visibles` cartas ya entradas. */
function puestoDe(i: number, visibles: number): Puesto {
  if (i >= visibles) return "porVenir";
  if (i === visibles - 1) return "frente";
  if (i === visibles - 2) return "atras";
  return "fuera";
}

const SCENE_TO_COUNT: Record<string, number> = {
  "polaroid-0": 1,
  "polaroid-1": 2,
  "polaroid-2": 3,
  "polaroid-3": 4,
  "polaroid-4": 5,
  "polaroid-5": 6,
  "destinos-finale": 6,
};

const DESTINOS_SCENES = new Set([
  "polaroid-0", "polaroid-1", "polaroid-2",
  "polaroid-3", "polaroid-4", "polaroid-5",
  "destinos-finale",
]);

// ─── Component ────────────────────────────────────────────────────────────────
//
// El par es EL componente de Destinos, de principio a fin, y el finale reusa
// ese mismo par. El scroll lo va construyendo carta a carta y nunca hay más de
// dos en cuadro: la que acaba de entrar y la anterior.
//
// No tiene interacción propia. El par avanza sólo con el scroll, igual con dedo
// que con mouse; lo único que responde al puntero es la inclinación de la carta
// del frente en escritorio.

export default function DestinosOverlay() {
  const { activeScene } = useScene();
  const reduceMotion = useReducedMotion();
  // En escritorio la carta del frente se inclina hacia el mouse hasta 8° con
  // un brillo que cruza el papel (hooks/useInclinacion). Sólo mientras la
  // escena es un destino: fuera del par no hay carta que responda.
  const inclinacion = useInclinacion({ grados: 8, activo: activeScene.startsWith("polaroid-") });
  const climaDe = useClima();
  const isVisible = DESTINOS_SCENES.has(activeScene);
  const visibleCount = SCENE_TO_COUNT[activeScene] ?? 0;
  const headingVisible = isVisible;
  const isFinale = activeScene === "destinos-finale";

  // Las 6 polaroids viven en la capa sticky, que está en el viewport desde el
  // primer píxel aunque su opacidad sea 0. El navegador las daba por visibles
  // y se bajaba las imágenes compitiendo con el logo del hero, que es el LCP
  // (audit 5.6). El pestillo las monta la primera vez que su escena entra y ya
  // no las desmonta. Va en render y no en un efecto: así el montaje ocurre en
  // el mismo commit en que la escena entra.
  const [parMontado, setParMontado] = useState(false);
  if (isVisible && !parMontado) setParMontado(true);

  return (
    <>
      {/* Ruta real por carretera que une los 6 destinos (solo en el finale).
          Es la cinta de ruta de la app: trazo de 3 en coral con un borde de 1
          en coralInk. Van dos capas porque MapLibre no dibuja contorno de
          línea; el casing entra primero y por eso queda debajo. */}
      {isFinale && (
        <>
          <MapRoute
            id="destinos-route-casing"
            coordinates={ROUTE_COORDS}
            color="#B23410"
            width={5}
            opacity={0.9}
            dashArray={[1.2, 1.2]}
          />
          <MapRoute
            id="destinos-route"
            coordinates={ROUTE_COORDS}
            color="#E0552F"
            width={3}
            opacity={0.9}
            dashArray={[2, 2]}
          />
        </>
      )}

      {/* Map pins rendered via MapMarker portals (positioned by maplibre on the canvas) */}
      {POLAROIDS.filter((_, i) => i < visibleCount).map((pol) => (
        <MapMarker key={pol.id} longitude={pol.coords[0]} latitude={pol.coords[1]}>
          <MarkerContent>
            <div
              className={`size-3.5 rounded-full bg-coral ring-2 ring-inset ring-coral-ink ${PIN_CHROME}`}
            />
          </MarkerContent>
          <MarkerLabel position="top">{pol.name}</MarkerLabel>
        </MapMarker>
      ))}

      {/* Capa visual: el par de polaroids y el titular. */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Velo crema en móvil: el titular y el par caen sobre el mapa. */}
        <div
          className={`crd-mobile-scrim h-[66%] transition-opacity duration-[450ms] ease-in-out ${
            headingVisible ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* El titular de la sección, que entra con la primera polaroid.
            El bottom de móvil (43%) lo fija .crd-destinos-heading en globals.css,
            así que aquí basta el valor de desktop. En desktop va sobre el
            cristal del tema: sin él, el H2 caía sobre la toponimia del mapa y
            competían píxel a píxel. En móvil el velo crema de la escena ya
            hace ese trabajo.

            La sombra de texto doble murió con el rediseño: era la que separaba
            el titular del mapa antes de que existiera el panel, y con panel
            debajo sólo emborronaba el canto de las letras. */}
        <div
          className={`crd-destinos-heading${isFinale ? " crd-destinos-heading-finale" : ""} absolute bottom-1/2 left-[4%] z-20 transition-[opacity,transform] duration-[450ms] ease-in-out crd-cristal-liquido desk:w-fit desk:rounded-surface desk:border desk:px-4 desk:py-3.5 ${
            headingVisible ? "translate-y-0 opacity-100" : "translate-y-[14px] opacity-0"
          }`}
        >
          <h2 className="m-0 font-display text-[clamp(22px,3vw,30px)] font-extrabold leading-[1.08] tracking-[-.02em] text-ink">
            Recuerdos que aún
            <br />
            <em className="crd-accent">no has vivido</em>
          </h2>
        </div>

        {/* La mesa: las dos cartas en cuadro, una encima de la otra en el
            mismo origen. Cada una llega a su puesto por transform, así que la
            entrada, el retiro y la salida son la misma animación con destinos
            distintos y nada salta de sitio. */}
        {parMontado && (
          <div className="crd-destinos-mesa">
            {POLAROIDS.map((pol, i) => {
              const puesto = puestoDe(i, visibleCount);
              const enFrente = puesto === "frente";
              const clima = climaDe?.destinos[pol.id];

              return (
                <motion.figure
                  key={pol.id}
                  aria-hidden={!enFrente}
                  className={`crd-destinos-card absolute inset-0 m-0 ${POLAROID_PAPER}`}
                  // Sólo la del frente sigue al puntero: la de atrás está a
                  // medio salir y moverla con el mouse la convierte en un
                  // objeto vivo que no se puede tocar.
                  // Cada carta lleva su cinta (`crd-tape` en el papel) y el
                  // ángulo alterna: dos cintas idénticas una al lado de la otra
                  // delatan que las pegó una máquina.
                  style={{
                    "--cinta-giro": i % 2 === 0 ? "-2.8deg" : "2.4deg",
                    ...(enFrente ? inclinacion.style : {}),
                  } as React.CSSProperties}
                  {...(enFrente ? inclinacion.handlers : {})}
                  initial={false}
                  animate={{ ...MESA[puesto], rotate: MESA[puesto].rotate + (pol.rotate ?? 0) }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 210, damping: 28, zIndex: { duration: 0 } }
                  }
                >
                  <PolaroidMedia
                    image={pol.image}
                    alt={pol.name}
                    sizes="(max-width: 899px) 196px, (max-width: 1440px) 17vw, 270px"
                    icon={CATEGORY_META[pol.category].icon}
                    chip={pol.tagline}
                  />
                  {/* El pie ocupa el papel de abajo, que es el 29 % del ancho de
                      la carta. La descripción salió de aquí (decisión 3B): lo
                      que queda es lo que una polaroid lleva escrito, el nombre
                      y el sitio, más el único dato vivo. */}
                  <figcaption className="crd-destinos-pie min-h-0 flex-1 px-[2%] pt-[3%]">
                    <PolaroidCaption name={pol.name} meta={pol.meta} />
                    {clima && <PolaroidVivo temp={clima.temp} codigo={clima.codigo} />}
                  </figcaption>
                  {/* El brillo que cruza el papel con el puntero. */}
                  {enFrente && inclinacion.activa && (
                    <motion.span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-[6px]"
                      style={{ background: inclinacion.brillo }}
                    />
                  )}
                </motion.figure>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
