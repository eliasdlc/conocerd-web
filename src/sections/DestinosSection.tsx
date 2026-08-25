"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useScene } from "@/context/SceneContext";
import Icon from "@/components/Icon";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/Map";
import { FEATURED_DESTINATIONS, CATEGORY_META } from "@/data/destinations";
import { type LngLat } from "@/lib/geo";
import { POLAROID_PAPER, PolaroidMedia, PolaroidCaption } from "@/components/Polaroid";
import { PIN_CHROME } from "@/components/map/pins";
import featuredRoute from "@/data/routes/featured-route.json";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Los 6 destinos del journey vienen de la fuente de verdad única (#5).
const POLAROIDS = FEATURED_DESTINATIONS;

// Ruta REAL por carretera entre los 6 destinos (OSRM, precalculada y
// simplificada en src/data/routes/featured-route.json): las líneas del finale
// siguen las calles del país, no cuerdas rectas entre pines.
const ROUTE_COORDS: LngLat[] = (featuredRoute.legs as [number, number][][]).flat();

// Final rotation for each card in the pile = original rotate + extra scatter
const PILE_OFFSETS = [
  { left: "4%", bottom: "8%", extraRotate: 0 },
  { left: "7%", bottom: "6%", extraRotate: -1 },
  { left: "5%", bottom: "10%", extraRotate: 1.5 },
  { left: "9%", bottom: "7%", extraRotate: -2 },
  { left: "3%", bottom: "12%", extraRotate: 0.5 },
  { left: "8%", bottom: "9%", extraRotate: -1 },
];

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
// La pila es EL componente de Destinos, de principio a fin: el scroll la va
// construyendo carta a carta y un tap/click en la carta del frente la manda al
// fondo y revela la siguiente (cicla). No hay deck aparte ni carrusel móvil:
// la interacción es la misma con dedo y con mouse (decisión del dueño, jul
// 2026 — sustituye al abanico del finale, que rompía la pila).

export default function DestinosOverlay() {
  const { activeScene } = useScene();
  const reduceMotion = useReducedMotion();
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
  const [pileSeen, setPileSeen] = useState(false);
  if (isVisible && !pileSeen) setPileSeen(true);

  // `k` = cuántas veces se cicló la pila; la carta del frente es la de índice
  // (n-1-k) mod n y cada tap manda el frente al fondo. Se resetea cuando el
  // scroll cambia el nº de cartas visibles, para que la narrativa (la carta
  // recién llegada arriba) siempre gane al estado del juego.
  const [k, setK] = useState(0);
  const [lastCycled, setLastCycled] = useState<number | null>(null);
  const [lastCount, setLastCount] = useState(visibleCount);
  if (lastCount !== visibleCount) {
    setLastCount(visibleCount);
    setK(0);
    setLastCycled(null);
  }

  const n = Math.max(visibleCount, 1);
  const frontIndex = visibleCount > 0 ? (((visibleCount - 1 - k) % n) + n) % n : -1;

  const cycle = () => {
    if (visibleCount < 2) return;
    setLastCycled(frontIndex);
    setK((prev) => prev + 1);
    // Al soltar el flag, `x` vuelve a 0 (donde ya está) y el próximo ciclo de
    // la misma carta re-dispara los keyframes (si no, framer los deduplica).
    setTimeout(() => setLastCycled(null), 600);
  };

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

      {/* Visual overlay — polaroid pile + heading */}
      <div
        aria-hidden={!isVisible}
        inert={!isVisible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Velo crema en móvil: el titular y la pila caen sobre el mapa. */}
        <div
          className={`crd-mobile-scrim h-[66%] transition-opacity duration-[450ms] ease-in-out ${
            headingVisible ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Section heading — appears above the pile on first polaroid.
            El bottom de móvil (43%) lo fija .crd-destinos-heading en globals.css,
            así que aquí basta el valor de desktop. En desktop va sobre el
            cristal del tema: sin él, el H2 caía sobre la toponimia del mapa y
            competían píxel a píxel. En móvil el velo crema de la escena ya
            hace ese trabajo.

            La sombra de texto doble murió con el rediseño: era la que separaba
            el titular del mapa antes de que existiera el panel, y con panel
            debajo sólo emborronaba el canto de las letras. */}
        <div
          className={`crd-destinos-heading${isFinale ? " crd-destinos-heading-finale" : ""} absolute bottom-1/2 left-[4%] z-20 transition-[opacity,transform] duration-[450ms] ease-in-out desk:w-fit desk:rounded-surface desk:border desk:border-[var(--crd-glass-line)] desk:bg-[var(--crd-glass)] desk:px-4 desk:py-3.5 desk:shadow-e1 desk:backdrop-blur-[24px] desk:backdrop-saturate-[1.8] ${
            headingVisible ? "translate-y-0 opacity-100" : "translate-y-[14px] opacity-0"
          }`}
        >
          <h2 className="m-0 font-display text-[clamp(22px,3vw,30px)] font-extrabold leading-[1.08] tracking-[-.02em] text-ink">
            Recuerdos que aún
            <br />
            <em className="crd-accent">no has vivido</em>
          </h2>
        </div>

        {/* Polaroid pile — interactiva: tap/click cicla la carta del frente */}
        {pileSeen && POLAROIDS.map((pol, i) => {
          const offset = PILE_OFFSETS[i];
          const totalRotate = (pol.rotate ?? 0) + offset.extraRotate;
          const isCardVisible = i < visibleCount;
          const isFront = i === frontIndex && isCardVisible;
          const justCycled = lastCycled === i;
          // z-index rota con `k`: el frente baja al fondo y las demás suben un
          // nivel. Fórmula estable para cartas aún no visibles (quedan abajo).
          const z = isCardVisible ? ((((i + k) % n) + n) % n) + 1 : i + 1;

          return (
            <motion.button
              key={pol.id}
              type="button"
              disabled={!isFront || visibleCount < 2}
              aria-hidden={!isFront}
              aria-label={
                isFront ? `Ver el próximo destino. Ahora: ${pol.name}` : undefined
              }
              onClick={isFront ? cycle : undefined}
              // El desparrame de la pila es dato por carta (--pile-left permite
              // el corrimiento móvil sin pasar por JS).
              //
              // El reset del botón NO lleva `border-0` ni `bg-transparent`: las
              // dos escriben la misma propiedad que el papel de la polaroid y,
              // como el orden lo decide Tailwind al emitir y no el className,
              // ganaban ellas. La carta llevaba el papel sin pintar y el pie se
              // leía sobre el mapa. `p-0` sí puede quedarse: `px-3`/`pt-3` son
              // más específicas y le ganan.
              className={`crd-destinos-card absolute m-0 w-[clamp(210px,17vw,270px)] appearance-none p-0 text-left text-[inherit] ${POLAROID_PAPER} left-[var(--pile-left)] max-desk:left-[calc(50%_-_98px_+_var(--pile-left)_-_6%)] ${
                isFront && visibleCount > 1 ? "cursor-pointer" : "cursor-default"
              }`}
              style={{
                "--pile-left": offset.left,
                bottom: offset.bottom,
              } as React.CSSProperties}
              initial={false}
              animate={{
                opacity: isCardVisible ? 1 : 0,
                y: isCardVisible ? 0 : -80,
                scale: isCardVisible ? 1 : 0.88,
                rotate: totalRotate,
                // La carta ciclada sale por la derecha, cambia de capa a mitad
                // de vuelo y aterriza debajo de la pila.
                x: justCycled ? [0, 150, 0] : 0,
                zIndex: z,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : justCycled
                    ? {
                        x: { duration: 0.5, times: [0, 0.5, 1], ease: "easeInOut" },
                        zIndex: { duration: 0.5 },
                        default: { type: "spring", stiffness: 260, damping: 30 },
                      }
                    : {
                        zIndex: { duration: 0 },
                        default: { type: "spring", stiffness: 260, damping: 30 },
                      }
              }
              whileHover={
                isFront && visibleCount > 1 && !reduceMotion
                  ? { y: -10, scale: 1.02 }
                  : undefined
              }
            >
              <PolaroidMedia
                image={pol.image}
                alt={pol.name}
                sizes="(max-width: 899px) 196px, (max-width: 1440px) 17vw, 270px"
                icon={CATEGORY_META[pol.category].icon}
                chip={pol.tagline}
                className="crd-destinos-card-media h-[196px]"
                overlayClassName={`transition-opacity duration-300 ${isFront ? "opacity-100" : "opacity-0"}`}
                action={
                  isFront && isFinale ? (
                    // Flecha circular y no un pill con texto: los taglines
                    // largos ("Pueblo & valle") lo empujaban fuera de la foto.
                    <span
                      aria-hidden="true"
                      className="flex size-7 flex-none items-center justify-center rounded-full bg-white/70 text-ink backdrop-blur-[12px]"
                    >
                      <Icon name="arrow_forward" className="text-sm" />
                    </span>
                  ) : undefined
                }
              />
              {/* Solo la carta del frente lleva texto: las traseras asoman
                  rebanadas y sus títulos quedaban cortados (audit 1.5).
                  (div y no figcaption: el contenedor ahora es un botón.)
                  La descripción vive aquí, en el papel — sobre la foto tapaba
                  el 62% de la imagen. */}
              <div
                className={`px-1 pb-3.5 pt-3 transition-opacity duration-300 ${
                  isFront ? "opacity-100" : "opacity-0"
                }`}
              >
                <PolaroidCaption name={pol.name} meta={pol.meta} />
                <p className="crd-destinos-desc m-0 mt-1 text-tiny leading-[1.4] text-ink-3">{pol.desc}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
