"use client";

import SubscribeForm from "@/components/SubscribeForm";
import { AppleGlyph, GooglePlayGlyph } from "@/components/StoreGlyphs";
import { useScene } from "@/context/SceneContext";
import { requestSubscribe, useSubscribeIntent } from "@/hooks/useSubscribeIntent";

const STORES: { glyph: React.ReactNode; store: string }[] = [
  { glyph: <AppleGlyph size={20} />, store: "App Store" },
  { glyph: <GooglePlayGlyph size={18} />, store: "Google Play" },
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
      className={`absolute inset-0 z-10 flex items-end justify-center px-[18px] pb-3.5 pt-[72px] transition-opacity duration-700 ease-in-out
        desk:items-center desk:px-6 desk:pb-9
        ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        // Opaca, no ink al 82% (audit §3, movimiento 11): con transparencia se
        // colaban fragmentos de toponimia del mapa por debajo del texto justo
        // en el momento de la conversión. El borde superior claro es luz de
        // canto —la card es un objeto sólido apoyado sobre la escena— y la
        // textura topográfica la aporta .crd-cta-card en globals.css.
        className={`crd-cta-card w-full max-w-[640px] rounded-[28px] border-t border-white/[0.14] bg-ink-2 p-[26px_20px] text-center shadow-[0_32px_80px_rgba(0,0,0,0.40)]
          desk:p-[44px_clamp(28px,5vw,60px)]
          ${isVisible ? "animate-slide-up" : ""}`}
      >
        {/* Handwritten kicker */}
        <div className="mb-1.5 font-hand text-[clamp(28px,4vw,40px)] font-bold leading-none text-mint">
          Descubre lo nuestro
        </div>

        {/* Main heading */}
        <h2 className="m-0 mb-3.5 font-display text-[clamp(28px,5vw,50px)] font-bold leading-[1.04] tracking-[-.012em] text-white">
          Tu próxima aventura<br />empieza <em className="crd-accent-on-ink">aquí</em>
        </h2>

        {/* Subtext */}
        <p className="mx-auto mb-5 max-w-[460px] text-body leading-[1.55] text-white/76">
          ConoceRD está en camino. Déjanos tu correo y entra a la lista de fundadores: serás
          de los primeros en explorar la República Dominicana que no aparece en las guías.
        </p>

        {/* Lista de espera — la acción real de la página */}
        <div className="mx-auto mb-[18px] max-w-[460px]">
          <SubscribeForm tone="dark" defaultAudience={audience} source="cta" />
        </div>

        {/* Tiendas — señal de credibilidad, no acción (§2.4). Las apps aún no
            están publicadas, así que se muestran atenuadas y sin enlace. */}
        <div className="mb-3.5 flex flex-wrap items-center justify-center gap-2.5">
          {STORES.map((btn) => (
            <div
              key={btn.store}
              className="flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.07] px-3.5 py-2 text-white/62"
            >
              {btn.glyph}
              <span className="text-left leading-[1.2]">
                <span className="block text-micro font-bold uppercase tracking-[.08em] text-white/72">
                  Próximamente en
                </span>
                <span className="text-copy font-bold">{btn.store}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Atajo a la audiencia B2B sin salir de la card */}
        <div className="text-copy text-white/55">
          ¿Tienes un negocio?{" "}
          <button
            type="button"
            onClick={() => requestSubscribe("negocio")}
            className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-copy font-bold text-mango"
          >
            Regístralo aquí →
          </button>
        </div>
      </div>
    </div>
  );
}
