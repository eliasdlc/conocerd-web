"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Cuerpo de /lista.
//
//  El toggle del formulario ya no gobierna sólo qué campos se piden: gobierna
//  la página entera. Titular, beneficios de la lista y features cambian con él,
//  así que las dos audiencias de ConoceRD —viajeros y negocios— reciben su
//  propio argumento sin duplicar la URL ni partir el tráfico del QR.
//
//  Sigue sin haber mapa, GSAP ni journey: el movimiento son keyframes CSS de
//  una pasada. Es la página que se abre en el 4G de un salón lleno.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import { AppleGlyph, GooglePlayGlyph } from "@/components/StoreGlyphs";
import InstagramTile from "./InstagramTile";
import SubscribeForm, { AudienceToggle, type SubscribeSuccess } from "@/components/SubscribeForm";
import SuccessPanel from "./SuccessPanel";
import { CONTENT, type Item } from "./content";
import { AUDIENCES, type Audience } from "@/lib/waitlist/schema";

// ─── Piezas ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-[20px] font-bold tracking-[-.02em] text-ink">
      {children}
    </h2>
  );
}

/**
 * Beneficio de la lista de espera, dibujado como cupón de pasaporte: borde
 * troquelado, baldosa de tono y, al registrarse, el sello estampado en diagonal
 * y escalonado por índice.
 *
 * El fondo del cupón conseguido es `#EAFBF7` literal y no `mint-soft`: es la
 * superficie contra la que se midió el sello, que va a .90 de opacidad y ahí da
 * 4.92:1. Sobre `mint-soft` la misma tinta cae a 4.41:1 y el sello reprueba
 * siendo texto de 10.
 */
function PerkCard({ item, unlocked, index }: { item: Item; unlocked: boolean; index: number }) {
  return (
    <li
      className={`relative flex items-start gap-[13px] overflow-hidden rounded-block border-[1.5px] border-dashed px-[15px] py-3.5 transition-[background-color,border-color] duration-[350ms] ease-in-out ${
        unlocked ? "border-mint-ink bg-[#EAFBF7]" : "border-line-strong bg-paper"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative flex size-10 shrink-0 items-center justify-center rounded-chip transition-colors duration-[350ms] ease-in-out ${
          unlocked ? "bg-mint-ink" : "bg-mango-soft"
        }`}
      >
        <Icon
          name={unlocked ? "check" : item.icon}
          className={`text-feature ${unlocked ? "text-white" : "text-mango-ink"}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-label text-body font-bold text-ink">{item.title}</div>
        {/* Conseguido, el cuerpo sube a ink-3: en `muted` sobre el tinte mint
            daba 4.14:1 y reprobaba. */}
        <p className={`mt-0.5 text-copy leading-[1.5] ${unlocked ? "text-ink-3" : "text-muted"}`}>
          {item.desc}
        </p>
      </div>

      {unlocked && (
        <span
          // Escalonado: los tres sellos no deben caer a la vez, y el retardo
          // depende del índice → va por style.
          className="crd-sello absolute -right-3 bottom-2 animate-[crdPerkTick_.45s_cubic-bezier(.2,.9,.3,1.3)_both] [--crd-sello-rot:-6deg]"
          style={{ animationDelay: `${index * 0.12 + 0.15}s` }}
        >
          Sellado
        </span>
      )}
    </li>
  );
}

function FeatureRow({ item }: { item: Item }) {
  return (
    <li className="flex items-start gap-3">
      <Icon name={item.icon} className="mt-px shrink-0 text-feature text-mint-ink" />
      <div>
        <div className="font-label text-body font-bold text-ink">{item.title}</div>
        <p className="mt-px text-copy leading-[1.5] text-muted">{item.desc}</p>
      </div>
    </li>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

const AUDIENCE_TAB_LABEL: Record<Audience, string> = {
  viajero: "Soy viajero",
  negocio: "Tengo un negocio",
};

const FOOT_LINK = "inline-flex h-11 items-center text-xs text-muted no-underline";

export default function ListaExperience() {
  const [audience, setAudience] = useState<Audience>("viajero");
  const [done, setDone] = useState<SubscribeSuccess | null>(null);
  // Remontar el formulario es la forma más simple de devolverlo a `idle` tras
  // un registro, sin exponer un `reset()` imperativo desde SubscribeForm.
  const [formKey, setFormKey] = useState(0);

  const c = CONTENT[audience];
  const unlocked = done?.audience === audience;

  const switchAfterSuccess = useCallback(() => {
    setAudience((a) => (a === "viajero" ? "negocio" : "viajero"));
    setDone(null);
    setFormKey((k) => k + 1);
  }, []);

  const renderSuccess = useCallback(
    (info: SubscribeSuccess) => (
      <SuccessPanel
        audience={info.audience}
        alreadyIn={info.alreadyIn}
        onSwitchAudience={switchAfterSuccess}
      />
    ),
    [switchAfterSuccess]
  );

  return (
    <div className="crd-lista-grid">
      {/* ── Columna de marca y conversión ── */}
      <aside className="crd-lista-aside">
        {/* La cabecera es el wordmark y el conmutador, nada más: aquí la marca
            va en compacto —el bloque entero es del hero de la home— y el
            conmutador gobierna la página, así que vive fuera del formulario. */}
        <div className="crd-lista-in mb-[18px] flex flex-wrap items-center gap-4">
          <Link href="/" aria-label="ConoceRD — ir al inicio" className="inline-block">
            <Image
              src="/assets/wordmark.svg"
              alt="ConoceRD"
              width={102}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </Link>
          {/* Ancho acotado: el conmutador es cromo de cabecera, no un bloque de
              contenido. Suelto en `flex-1` se comía media columna a 1440. */}
          <AudienceToggle
            audience={audience}
            onChange={setAudience}
            className="w-full max-w-[320px] flex-1 sm:w-auto"
          />
        </div>

        <h1
          key={`h-${audience}`}
          className="crd-lista-swap mb-2.5 font-display text-[clamp(28px,6.6vw,34px)] font-extrabold leading-[1.06] tracking-[-.03em] text-ink"
        >
          {c.headline} <em className="crd-accent">{c.headlineAccent}</em>
        </h1>

        <p
          key={`p-${audience}`}
          className="crd-lista-swap mb-5 text-body leading-[1.55] text-muted"
        >
          {c.sub}
        </p>

        {/* El formulario es la única acción de la página: siempre sobre el fold.
            overflow-visible porque el confeti del panel de éxito se sale. */}
        <div className="crd-lista-in overflow-visible rounded-surface border border-line bg-paper px-5 pb-[18px] pt-5 shadow-e1 [animation-delay:.12s]">
          <SubscribeForm
            key={formKey}
            tone="light"
            layout="full"
            audienceLocked
            source="lista"
            audience={audience}
            onAudienceChange={setAudience}
            onSuccess={setDone}
            renderSuccess={renderSuccess}
          />
        </div>

        <div className="crd-lista-in mt-4 flex flex-wrap items-center gap-2 text-tiny text-muted [animation-delay:.18s]">
          <AppleGlyph size={15} />
          <GooglePlayGlyph size={15} mono />
          Próximamente en App Store y Google Play
        </div>

        {/* Instagram es lo único que ya existe hoy: mientras la app no esté en
            las tiendas, es la vía real para no perder a quien llegó por el QR.
            Aquí aparece como acompañamiento; el empujón fuerte va después del
            registro, en el panel de éxito. */}
        <InstagramTile className="crd-lista-in mt-4 [animation-delay:.22s]" />
      </aside>

      {/* ── Columna de argumento ── */}
      <div className="crd-lista-main">
        {/* Beneficios de entrar *ahora*: es lo que distingue la lista de espera
            de "descargar la app cuando salga". Va antes que el producto. */}
        <section
          key={`perks-${audience}`}
          className="crd-lista-swap mb-7"
          aria-live="polite"
        >
          <SectionTitle>{c.perksTitle}</SectionTitle>
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {c.perks.map((p, i) => (
              <PerkCard key={p.title} item={p} unlocked={Boolean(unlocked)} index={i} />
            ))}
          </ul>
        </section>

        <section key={`feat-${audience}`} className="crd-lista-swap mb-[26px]">
          <SectionTitle>{c.featuresTitle}</SectionTitle>
          <ul className="m-0 grid list-none gap-4 p-0">
            {c.features.map((f) => (
              <FeatureRow key={f.title} item={f} />
            ))}
          </ul>

          {c.stats.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-[22px] border-t border-line pt-[18px]">
              {c.stats.map((s) => (
                <div key={s.label} className="max-w-[150px]">
                  <div
                    className="font-display text-[26px] font-bold tracking-[-.012em]"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <p className="mt-0.5 text-xs leading-[1.4] text-muted">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Puente a la otra audiencia para quien no se identificó con esta. */}
        <button
          type="button"
          onClick={() => setAudience(audience === "viajero" ? "negocio" : "viajero")}
          // El par del puente son tokens: `#F7B39D` y `#FFF4EE` eran el mismo
          // par coral sin nombre, escrito a mano.
          className="mb-6 flex w-full cursor-pointer items-center gap-2.5 rounded-block border-[1.5px] border-dashed border-coral-ink bg-coral-soft px-[15px] py-[13px] text-left font-[inherit]"
        >
          <Icon
            name={audience === "viajero" ? "storefront" : "hiking"}
            className="text-feature text-coral-ink"
          />
          <span className="text-copy leading-[1.45] text-ink-3">
            {audience === "viajero" ? (
              <>
                ¿Tienes un negocio en RD?{" "}
                <strong className="font-label font-bold text-coral-ink">Mira lo que ConoceRD hace por ti</strong>
              </>
            ) : (
              <>
                ¿También viajas por el país?{" "}
                <strong className="font-label font-bold text-coral-ink">Mira la app del viajero</strong>
              </>
            )}
          </span>
          <Icon name="arrow_forward" className="ml-auto text-xl text-coral-ink" />
        </button>

        <div className="flex flex-wrap gap-4 border-t border-line pt-3.5">
          <Link href="/" className={FOOT_LINK}>Ver el sitio completo</Link>
          <Link href="/privacidad" className={FOOT_LINK}>Privacidad</Link>
          <Link href="/terminos" className={FOOT_LINK}>Términos</Link>
        </div>
      </div>

      {/* Etiquetas del toggle en el HTML servido: el contenido de la página
          depende de una audiencia que sólo existe en cliente, y sin esto el
          crawler no vería que /lista también habla de negocios. */}
      <div className="sr-only">
        {AUDIENCES.map((a) => (
          <p key={a}>
            {AUDIENCE_TAB_LABEL[a]}: {CONTENT[a].headline}. {CONTENT[a].sub}
          </p>
        ))}
      </div>
    </div>
  );
}
