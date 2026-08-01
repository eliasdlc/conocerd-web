"use client";

import Icon, { type IconName } from "@/components/Icon";
import SubscribeForm from "@/components/SubscribeForm";
import { useScene } from "@/context/SceneContext";
import { requestSubscribe, useSubscribeIntent } from "@/hooks/useSubscribeIntent";

const STORES: { icon: IconName; store: string }[] = [
  { icon: "phone_iphone", store: "App Store" },
  { icon: "android", store: "Google Play" },
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
        className={`crd-cta-card w-full max-w-[640px] rounded-[28px] border border-white/10 bg-ink-2/[0.82] p-[26px_20px] text-center shadow-[0_32px_80px_rgba(0,0,0,0.40)]
          desk:p-[44px_clamp(28px,5vw,60px)] desk:backdrop-blur-[12px]
          ${isVisible ? "animate-slide-up" : ""}`}
      >
        {/* Handwritten kicker */}
        <div className="mb-1.5 font-hand text-[clamp(28px,4vw,40px)] font-bold leading-none text-mint">
          Descubre lo nuestro
        </div>

        {/* Main heading */}
        <h2 className="m-0 mb-3.5 font-display text-[clamp(28px,5vw,50px)] font-extrabold leading-[1.04] tracking-[-.025em] text-white">
          Tu próxima aventura<br />empieza aquí
        </h2>

        {/* Subtext */}
        <p className="mx-auto mb-5 max-w-[460px] text-[15px] leading-[1.55] text-white/76">
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
              <Icon name={btn.icon} className="text-xl" />
              <span className="text-left leading-[1.2]">
                <span className="block font-display text-[9.5px] font-bold uppercase tracking-[.08em] text-white/72">
                  Próximamente en
                </span>
                <span className="font-display text-[13.5px] font-extrabold">{btn.store}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Atajo a la audiencia B2B sin salir de la card */}
        <div className="text-[13px] text-white/55">
          ¿Tienes un negocio?{" "}
          <button
            type="button"
            onClick={() => requestSubscribe("negocio")}
            className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-[13px] font-bold text-mango"
          >
            Regístralo aquí →
          </button>
        </div>
      </div>
    </div>
  );
}
