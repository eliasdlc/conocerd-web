"use client";

import SubscribeForm from "@/components/SubscribeForm";
import { AppleGlyph, GooglePlayGlyph, StoreBadge } from "@/components/StoreGlyphs";
import { useScene } from "@/context/SceneContext";
import { requestSubscribe, useSubscribeIntent } from "@/hooks/useSubscribeIntent";

const STORES: { glyph: React.ReactNode; store: string }[] = [
  { glyph: <AppleGlyph size={16} />, store: "App Store" },
  { glyph: <GooglePlayGlyph size={16} />, store: "Google Play" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CTAOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "cta";
  // La app aún no existe: el cierre del journey ya no promete una descarga,
  // captura el correo. El toggle abre en la audiencia que pidió el último CTA.
  const audience = useSubscribeIntent("viajero");

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      // El journey cierra volviendo al globo: en móvil la card baja para que el
      // planeta se vea completo encima, igual que en el hero.
      //
      // Los 56 de abajo en escritorio son la esquina del panel de pasos: la
      // card mide 640 de ancho y en una ventana estrecha su borde inferior
      // izquierdo llegaba justo hasta el panel. Es la única escena con algo
      // centrado que baja tanto, así que la holgura vive aquí y no en un token.
      className={`absolute inset-0 z-10 flex items-end justify-center px-[18px] pb-3.5 pt-[var(--crd-nav-clear)] transition-opacity duration-700 ease-in-out
        desk:items-center desk:px-6 desk:pb-[calc(56px+var(--crd-stepper-h))]
        ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        // Opaca, no ink al 82% (audit §3, movimiento 11): con transparencia se
        // colaban fragmentos de toponimia del mapa por debajo del texto justo
        // en el momento de la conversión. El borde superior claro es luz de
        // canto —la card es un objeto sólido apoyado sobre la escena— y la
        // textura topográfica la aporta .crd-cta-card en globals.css.
        className={`crd-cta-card w-full max-w-[640px] rounded-surface border-t border-white/[0.16] bg-ink p-[26px_20px] text-center shadow-e1
          desk:p-[44px_clamp(28px,5vw,60px)]
          ${isVisible ? "animate-slide-up" : ""}`}
      >
        {/* Sin antetítulo manuscrito. Caveat baja a un solo uso en todo el
            producto (la firma del dorso de la polaroid del equipo) y "Descubre
            lo nuestro" ya vive dentro del wordmark, que se ve en el pie y en el
            logo del hero: aquí era la tercera repetición del mismo lema. */}

        {/* Main heading */}
        <h2 className="m-0 mb-2.5 font-display text-[clamp(28px,5vw,34px)] font-extrabold leading-[1.04] tracking-[-.03em] text-white desk:mb-3.5">
          Tu próxima aventura<br />empieza <em className="crd-accent-on-ink">aquí</em>
        </h2>

        {/* Subtext */}
        <p className="mx-auto mb-4 max-w-[460px] text-body leading-[1.55] text-white/70 desk:mb-5">
          ConoceRD está en camino. Déjanos tu correo y entra a la lista de fundadores: serás
          de los primeros en explorar la República Dominicana que no aparece en las guías.
        </p>

        {/* Lista de espera — la acción real de la página */}
        <div className="mx-auto mb-3.5 max-w-[460px] desk:mb-[18px]">
          <SubscribeForm tone="dark" defaultAudience={audience} source="cta" />
        </div>

        {/* Tiendas — señal de credibilidad, no acción (§2.4). Las apps aún no
            están publicadas, así que se muestran atenuadas y sin enlace.
            En móvil la card no debe scrollear: los dos badges van en UNA fila,
            con el "próximamente" compartido encima — con la leyenda por badge
            miden ~150px cada uno y no caben lado a lado ni en 360px. */}
        <div className="mb-3 desk:mb-3.5">
          <div className="mb-1.5 font-label text-micro font-extrabold uppercase tracking-[.08em] text-white/70 desk:hidden">
            Próximamente en
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 desk:gap-2.5">
            {STORES.map((btn) => (
              <StoreBadge key={btn.store} store={btn.store} glyph={btn.glyph} />
            ))}
          </div>
        </div>

        {/* Atajo a la audiencia B2B sin salir de la card */}
        <div className="text-body text-white/70">
          ¿Tienes un negocio?{" "}
          <button
            type="button"
            onClick={() => requestSubscribe("negocio")}
            className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-body font-bold text-mango"
          >
            Regístralo aquí →
          </button>
        </div>
      </div>
    </div>
  );
}
