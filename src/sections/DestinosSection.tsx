"use client";


import PolaroidDeck from "@/sections/PolaroidDeck";
import { useScene } from "@/context/SceneContext";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute } from "@/components/map/Map";
import { FEATURED_DESTINATIONS, CATEGORY_META } from "@/data/destinations";
import { type LngLat } from "@/lib/geo";
import { POLAROID_PAPER, PolaroidMedia, PolaroidCaption } from "@/components/Polaroid";

// ─── Data ─────────────────────────────────────────────────────────────────────
// Los 6 destinos del journey vienen de la fuente de verdad única (#5).
const POLAROIDS = FEATURED_DESTINATIONS;

// Polilínea que une los 6 destinos en orden (para la ruta + chevron del finale).
const ROUTE_COORDS: LngLat[] = POLAROIDS.map((d) => d.coords);

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
  "destinos-intro": 0,
  "polaroid-0": 1,
  "polaroid-1": 2,
  "polaroid-2": 3,
  "polaroid-3": 4,
  "polaroid-4": 5,
  "polaroid-5": 6,
  "destinos-finale": 6,
};

const DESTINOS_SCENES = new Set([
  "destinos-intro",
  "polaroid-0", "polaroid-1", "polaroid-2",
  "polaroid-3", "polaroid-4", "polaroid-5",
  "destinos-finale",
]);

// ─── Component ────────────────────────────────────────────────────────────────

export default function DestinosOverlay() {
  const { activeScene } = useScene();
  const isVisible = DESTINOS_SCENES.has(activeScene);
  const visibleCount = SCENE_TO_COUNT[activeScene] ?? 0;
  // The title introduces the chapter immediately; leaving destinos-intro empty
  // made the first full scroll interval read as a broken frame.
  const headingVisible = isVisible;
  const isFinale = activeScene === "destinos-finale";

  return (
    <>
      {/* #6 — ruta dashed que une los 6 destinos (solo en el finale) */}
      {isFinale && (
        <MapRoute
          id="destinos-route"
          coordinates={ROUTE_COORDS}
          color="#F76C4D"
          width={3}
          opacity={0.9}
          dashArray={[2, 2]}
        />
      )}

      {/* Map pins rendered via MapMarker portals (positioned by maplibre on the canvas) */}
      {POLAROIDS.filter((_, i) => i < visibleCount).map((pol) => (
        <MapMarker key={pol.id} longitude={pol.coords[0]} latitude={pol.coords[1]}>
          <MarkerContent>
            <div className="size-3.5 rounded-full border-[2.5px] border-white bg-coral shadow-[0_0_0_6px_rgba(247,108,77,0.25)]" />
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
        {/* Velo crema en móvil: el titular y la pila caen sobre el mapa. Entra
            con el primer destino — en la intro no hay contenido que velar y un
            degradado sobre el mapa vacío solo se ve como un hueco. */}
        <div
          className={`crd-mobile-scrim h-[66%] transition-opacity duration-[450ms] ease-in-out ${
            headingVisible ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Section heading — appears above the pile on first polaroid.
            El bottom de móvil (43%) lo fija .crd-destinos-heading en globals.css,
            así que aquí basta el valor de desktop. En desktop lleva el chip
            crema con blur: sin él, el H2 caía sobre la toponimia del mapa y
            competían píxel a píxel (audit 2.1). En móvil el velo crema de la
            escena ya hace ese trabajo. */}
        <div
          className={`crd-destinos-heading${isFinale ? " crd-destinos-heading-finale" : ""} absolute bottom-1/2 left-[4%] z-20 transition-[opacity,transform] duration-[450ms] ease-in-out desk:w-fit desk:rounded-card desk:border desk:border-line/80 desk:bg-cream/88 desk:px-3.5 desk:py-3 desk:backdrop-blur-[8px] ${
            headingVisible ? "translate-y-0 opacity-100" : "translate-y-[14px] opacity-0"
          }`}
        >
          <div className="mb-2 font-display text-mini font-extrabold uppercase tracking-[.16em] text-mint-ink [text-shadow:0_1px_2px_rgba(253,248,240,0.9)]">
            Hidden gems · Lo nuestro
          </div>
          <h2 className="m-0 font-display text-[clamp(22px,3vw,38px)] font-extrabold leading-[1.08] tracking-[-.025em] text-ink-2 [text-shadow:0_1px_2px_rgba(253,248,240,0.95),0_0_16px_rgba(253,248,240,0.6)]">
            Recuerdos que aún
            <br />
            no has vivido
          </h2>
        </div>

        {/* Polaroid pile */}
        {POLAROIDS.map((pol, i) => {
          const offset = PILE_OFFSETS[i];
          const totalRotate = (pol.rotate ?? 0) + offset.extraRotate;
          const isCardVisible = i < visibleCount;
          // Solo la carta del frente lleva texto: las traseras asoman rebanadas
          // por la carta superior y sus títulos quedaban cortados a media altura
          // de los glifos (audit 1.5). Atrás: solo foto, borde y sombra.
          const isFront = i === visibleCount - 1;

          return (
            <figure
              key={pol.id}
              // El desparrame de la pila y su entrada escalonada son datos por
              // carta, así que transform/transition/z-index siguen inline.
              // --pile-left permite el corrimiento móvil sin pasar por JS: en
              // 390px el rango 3–9% sacaba las cartas de atrás por el borde.
              className={`crd-destinos-card absolute m-0 w-[clamp(210px,17vw,270px)] cursor-default ${POLAROID_PAPER} left-[var(--pile-left)] max-desk:left-[calc(var(--pile-left)+6%)]`}
              style={{
                "--pile-left": offset.left,
                bottom: offset.bottom,
                // En el finale la pila desaparece para dar paso al deck interactivo (#7).
                opacity: isFinale ? 0 : isCardVisible ? 1 : 0,
                transform: isCardVisible
                  ? `translateY(0) rotate(${totalRotate}deg) scale(1)`
                  : `translateY(-80px) rotate(${totalRotate}deg) scale(0.88)`,
                transition: isCardVisible
                  ? `transform 0.55s cubic-bezier(0.2,0.8,0.3,1) ${i * 0.06}s, opacity 0.4s ease ${i * 0.06}s`
                  : "transform 0.3s ease, opacity 0.25s ease",
                zIndex: i + 1,
              } as React.CSSProperties}
            >
              <PolaroidMedia
                image={pol.image}
                alt={pol.name}
                sizes="(max-width: 899px) 196px, (max-width: 1440px) 17vw, 270px"
                icon={CATEGORY_META[pol.category].icon}
                chip={pol.tagline}
                desc={pol.desc}
                className="crd-destinos-card-media h-[196px]"
                overlayClassName={`transition-opacity duration-300 ${isFront ? "opacity-100" : "opacity-0"}`}
              />
              <figcaption
                className={`px-1 pb-3.5 pt-3 transition-opacity duration-300 ${
                  isFront ? "opacity-100" : "opacity-0"
                }`}
              >
                <PolaroidCaption name={pol.name} meta={pol.meta} />
              </figcaption>
            </figure>
          );
        })}

        {/* #7 — deck interactivo: aparece cuando la pila queda completa (finale) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
            isFinale ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <PolaroidDeck items={POLAROIDS} />
        </div>
      </div>
    </>
  );
}
