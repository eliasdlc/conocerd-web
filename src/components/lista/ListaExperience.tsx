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
import SubscribeForm, { type SubscribeSuccess } from "@/components/SubscribeForm";
import SuccessPanel from "./SuccessPanel";
import InstagramGlyph from "./InstagramGlyph";
import { CONTENT, INSTAGRAM, type Item } from "./content";
import { AUDIENCES, type Audience } from "@/lib/waitlist/schema";
import Kicker from "@/components/Kicker";

// ─── Piezas ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-lead font-bold tracking-[-.015em] text-ink-2">
      {children}
    </h2>
  );
}

/**
 * Beneficio de la lista de espera, dibujado como cupón de pasaporte (audit §3,
 * movimiento 9): borde troquelado, número de sello en mono y, al registrarse,
 * el sello estampado en diagonal. Antes era una card blanca con borde gris e
 * icono en cuadradito pastel — el momento más genérico del sitio.
 */
function PerkCard({ item, unlocked, index }: { item: Item; unlocked: boolean; index: number }) {
  return (
    <li
      className={`relative flex items-start gap-[13px] overflow-hidden rounded-card border border-dashed px-[15px] py-3.5 transition-[background-color,border-color] duration-[350ms] ease-in-out ${
        unlocked ? "border-mint bg-[#EAFBF7]" : "border-muted-2/35 bg-white"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative flex size-10 shrink-0 items-center justify-center rounded-tile transition-colors duration-[350ms] ease-in-out ${
          unlocked ? "bg-mint" : "bg-mango-soft"
        }`}
      >
        <Icon
          name={unlocked ? "check" : item.icon}
          className={`text-feature ${unlocked ? "text-white" : "text-mango-ink"}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        {/* El distintivo se ancla arriba a la derecha en vez de seguir al
            título: si lo arrastra, con títulos de distinto largo cae a una
            segunda línea en unas tarjetas sí y en otras no. */}
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-body font-bold text-ink">
            {item.title}
          </span>
          <span
            aria-hidden="true"
            className="mt-px shrink-0 font-mono text-micro font-bold tracking-[.1em] text-muted-2"
          >
            N.º {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <p className="mt-0.5 text-copy leading-[1.5] text-muted">{item.desc}</p>
      </div>

      {unlocked && (
        <span
          // Escalonado: los tres sellos no deben caer a la vez, y el retardo
          // depende del índice → va por style.
          className="crd-sello absolute -right-3 bottom-2 animate-[crdPerkTick_.45s_cubic-bezier(.2,.9,.3,1.3)_both]"
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
        <div className="text-body font-bold text-ink">{item.title}</div>
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

const FOOT_LINK = "text-xs text-muted-2 no-underline";

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
        <Link
          href="/"
          aria-label="ConoceRD — ir al inicio"
          className="crd-lista-in mb-[18px] inline-block"
        >
          <Image
            src="/assets/logo.png"
            alt="ConoceRD — Descubre lo nuestro"
            width={210}
            height={100}
            priority
            sizes="176px"
            className="h-[clamp(62px,14vw,84px)] w-auto"
          />
        </Link>

        <div className="crd-lista-in mb-2.5 [animation-delay:.06s]">
          <Kicker key={audience} icon={c.eyebrowIcon} className="crd-lista-swap">
            {c.eyebrow}
          </Kicker>
        </div>

        <h1
          key={`h-${audience}`}
          className="crd-lista-swap mb-2.5 font-display text-[clamp(28px,6.6vw,42px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2"
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
        <div className="crd-lista-in overflow-visible rounded-panel border border-line bg-white px-5 pb-[18px] pt-5 shadow-modal [animation-delay:.12s]">
          <SubscribeForm
            key={formKey}
            tone="light"
            layout="full"
            source="lista"
            audience={audience}
            onAudienceChange={setAudience}
            onSuccess={setDone}
            renderSuccess={renderSuccess}
          />
        </div>

        <div className="crd-lista-in mt-4 flex flex-wrap items-center gap-2 text-tiny text-muted-2 [animation-delay:.18s]">
          <Icon name="phone_iphone" className="text-lg" />
          <Icon name="android" className="text-lg" />
          Próximamente en App Store y Google Play
        </div>

        {/* Instagram es lo único que ya existe hoy: mientras la app no esté en
            las tiendas, es la vía real para no perder a quien llegó por el QR.
            Aquí aparece como acompañamiento; el empujón fuerte va después del
            registro, en el panel de éxito. */}
        <a
          href={INSTAGRAM.url}
          target="_blank"
          rel="noopener noreferrer"
          className="crd-lista-in crd-lista-ig-card mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white/72 px-[15px] py-[13px] no-underline [animation-delay:.22s]"
        >
          <span
            aria-hidden="true"
            // Monocromo ink, no el degradado oficial de Instagram: era el único
            // sitio del sitio con la paleta de otra marca a todo color, y se
            // comía la jerarquía de la página (audit §3, movimiento 9).
            className="flex size-[38px] shrink-0 items-center justify-center rounded-tile bg-ink-2 text-cream"
          >
            <InstagramGlyph size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold text-ink">{INSTAGRAM.handle}</span>
            <span className="block text-tiny leading-[1.4] text-muted">
              Los destinos que vamos sumando, antes de que salga la app.
            </span>
          </span>
          <Icon name="arrow_outward" className="ml-auto text-xl text-muted-2" />
        </a>
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
          className="mb-6 flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-dashed border-[#F7B39D] bg-[#FFF4EE] px-[15px] py-[13px] text-left font-[inherit]"
        >
          <Icon
            name={audience === "viajero" ? "storefront" : "hiking"}
            className="text-feature text-coral-ink"
          />
          <span className="text-copy leading-[1.45] text-muted">
            {audience === "viajero" ? (
              <>
                ¿Tienes un negocio en RD?{" "}
                <strong className="text-coral-ink">Mira lo que ConoceRD hace por ti</strong>
              </>
            ) : (
              <>
                ¿También viajas por el país?{" "}
                <strong className="text-coral-ink">Mira la app del viajero</strong>
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
