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
import SubscribeForm, { type SubscribeSuccess } from "@/components/SubscribeForm";
import SuccessPanel from "./SuccessPanel";
import InstagramGlyph from "./InstagramGlyph";
import { CONTENT, INSTAGRAM, type Item } from "./content";
import { AUDIENCES, type Audience } from "@/lib/waitlist/schema";

// ─── Piezas ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: "0 0 12px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        fontSize: 17,
        letterSpacing: "-.015em",
        color: "#1D3A45",
      }}
    >
      {children}
    </h2>
  );
}

/** Beneficio de la lista de espera. Al registrarse pasa a estado conseguido. */
function PerkCard({ item, unlocked, index }: { item: Item; unlocked: boolean; index: number }) {
  return (
    <li
      style={{
        display: "flex",
        gap: 13,
        alignItems: "flex-start",
        background: unlocked ? "#EAFBF7" : "#fff",
        border: `1px solid ${unlocked ? "#25CCB8" : "#EBE6D9"}`,
        borderRadius: 16,
        padding: "14px 15px",
        transition: "background .35s ease, border-color .35s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          width: 40,
          height: 40,
          borderRadius: 12,
          background: unlocked ? "#25CCB8" : "#FFE6C8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background .35s ease",
        }}
      >
        <span className="ms" style={{ fontSize: 22, color: unlocked ? "#fff" : "#985409" }}>
          {unlocked ? "check" : item.icon}
        </span>
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* El distintivo se ancla arriba a la derecha en vez de seguir al
            título: si lo arrastra, con títulos de distinto largo cae a una
            segunda línea en unas tarjetas sí y en otras no. */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 14.5,
              color: "#264653",
            }}
          >
            {item.title}
          </span>
          {unlocked && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "#0C6A60",
                background: "#C6F3EB",
                borderRadius: 999,
                padding: "3px 8px",
                marginTop: 1,
                // Escalonado: los tres tics no deben aparecer a la vez.
                animation: `crdPerkTick .45s cubic-bezier(.2,.9,.3,1.3) ${index * 0.12 + 0.15}s both`,
              }}
            >
              Desbloqueado
            </span>
          )}
        </div>
        <p style={{ margin: "2px 0 0", color: "#5B6B72", fontSize: 13, lineHeight: 1.5 }}>
          {item.desc}
        </p>
      </div>
    </li>
  );
}

function FeatureRow({ item }: { item: Item }) {
  return (
    <li style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span
        className="ms"
        aria-hidden="true"
        style={{ fontSize: 22, color: "#0C6A60", flexShrink: 0, marginTop: 1 }}
      >
        {item.icon}
      </span>
      <div>
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 14.5,
            color: "#264653",
          }}
        >
          {item.title}
        </div>
        <p style={{ margin: "1px 0 0", color: "#5B6B72", fontSize: 13, lineHeight: 1.5 }}>
          {item.desc}
        </p>
      </div>
    </li>
  );
}

// ─── Componente ───────────────────────────────────────────────────────────────

const AUDIENCE_TAB_LABEL: Record<Audience, string> = {
  viajero: "Soy viajero",
  negocio: "Tengo un negocio",
};

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
          className="crd-lista-in"
          style={{ display: "inline-block", marginBottom: 18 }}
        >
          <Image
            src="/assets/logo.png"
            alt="ConoceRD — Descubre lo nuestro"
            width={210}
            height={100}
            priority
            style={{ height: "clamp(62px,14vw,84px)", width: "auto" }}
          />
        </Link>

        <div
          className="crd-lista-in"
          style={{ marginBottom: 10, animationDelay: ".06s" }}
        >
          <span
            key={audience}
            className="crd-lista-swap"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#C6F3EB",
              color: "#0C6A60",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              padding: "5px 12px",
              borderRadius: 999,
            }}
          >
            <span className="ms" aria-hidden="true" style={{ fontSize: 14 }}>
              {c.eyebrowIcon}
            </span>
            {c.eyebrow}
          </span>
        </div>

        <h1
          key={`h-${audience}`}
          className="crd-lista-swap"
          style={{
            margin: "0 0 10px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            letterSpacing: "-.028em",
            fontSize: "clamp(28px,6.6vw,42px)",
            lineHeight: 1.06,
            color: "#1D3A45",
          }}
        >
          {c.headline}
        </h1>

        <p
          key={`p-${audience}`}
          className="crd-lista-swap"
          style={{ margin: "0 0 20px", color: "#5B6B72", fontSize: 15.5, lineHeight: 1.55 }}
        >
          {c.sub}
        </p>

        {/* El formulario es la única acción de la página: siempre sobre el fold. */}
        <div
          className="crd-lista-in"
          style={{
            background: "#fff",
            border: "1px solid #EBE6D9",
            borderRadius: 22,
            padding: "20px 20px 18px",
            boxShadow: "0 18px 44px rgba(38,70,83,.10)",
            animationDelay: ".12s",
            // El confeti del panel de éxito se sale de la tarjeta.
            overflow: "visible",
          }}
        >
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

        <div
          className="crd-lista-in"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            color: "#66747B",
            fontSize: 12.5,
            margin: "16px 0 0",
            animationDelay: ".18s",
          }}
        >
          <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>phone_iphone</span>
          <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>android</span>
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
          className="crd-lista-in crd-lista-ig-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            padding: "13px 15px",
            borderRadius: 16,
            background: "rgba(255,255,255,.72)",
            border: "1px solid #EBE6D9",
            textDecoration: "none",
            animationDelay: ".22s",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#fff",
              background: "linear-gradient(135deg,#F58529 0%,#DD2A7B 55%,#8134AF 100%)",
            }}
          >
            <InstagramGlyph size={20} />
          </span>
          <span>
            <span
              style={{
                display: "block",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: "#264653",
              }}
            >
              {INSTAGRAM.handle}
            </span>
            <span style={{ display: "block", color: "#5B6B72", fontSize: 12.5, lineHeight: 1.4 }}>
              Los destinos que vamos sumando, antes de que salga la app.
            </span>
          </span>
          <span
            className="ms"
            aria-hidden="true"
            style={{ fontSize: 20, color: "#66747B", marginLeft: "auto" }}
          >
            arrow_outward
          </span>
        </a>
      </aside>

      {/* ── Columna de argumento ── */}
      <div className="crd-lista-main">
        {/* Beneficios de entrar *ahora*: es lo que distingue la lista de espera
            de "descargar la app cuando salga". Va antes que el producto. */}
        <section
          key={`perks-${audience}`}
          className="crd-lista-swap"
          style={{ marginBottom: 28 }}
          aria-live="polite"
        >
          <SectionTitle>{c.perksTitle}</SectionTitle>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {c.perks.map((p, i) => (
              <PerkCard key={p.title} item={p} unlocked={Boolean(unlocked)} index={i} />
            ))}
          </ul>
        </section>

        <section key={`feat-${audience}`} className="crd-lista-swap" style={{ marginBottom: 26 }}>
          <SectionTitle>{c.featuresTitle}</SectionTitle>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 16 }}>
            {c.features.map((f) => (
              <FeatureRow key={f.title} item={f} />
            ))}
          </ul>

          {c.stats.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 22,
                flexWrap: "wrap",
                marginTop: 20,
                paddingTop: 18,
                borderTop: "1px solid #EBE6D9",
              }}
            >
              {c.stats.map((s) => (
                <div key={s.label} style={{ maxWidth: 150 }}>
                  <div
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 800,
                      fontSize: 26,
                      letterSpacing: "-.02em",
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                  <p style={{ margin: "2px 0 0", color: "#5B6B72", fontSize: 12, lineHeight: 1.4 }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Puente a la otra audiencia para quien no se identificó con esta. */}
        <button
          type="button"
          onClick={() => setAudience(audience === "viajero" ? "negocio" : "viajero")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            textAlign: "left",
            background: "#FFF4EE",
            border: "1px dashed #F7B39D",
            borderRadius: 16,
            padding: "13px 15px",
            cursor: "pointer",
            marginBottom: 24,
            fontFamily: "inherit",
          }}
        >
          <span className="ms" aria-hidden="true" style={{ fontSize: 22, color: "#B23410" }}>
            {audience === "viajero" ? "storefront" : "hiking"}
          </span>
          <span style={{ fontSize: 13.5, color: "#5B6B72", lineHeight: 1.45 }}>
            {audience === "viajero" ? (
              <>
                ¿Tienes un negocio en RD?{" "}
                <strong style={{ color: "#B23410" }}>
                  Mira lo que ConoceRD hace por ti
                </strong>
              </>
            ) : (
              <>
                ¿También viajas por el país?{" "}
                <strong style={{ color: "#B23410" }}>Mira la app del viajero</strong>
              </>
            )}
          </span>
          <span
            className="ms"
            aria-hidden="true"
            style={{ fontSize: 20, color: "#B23410", marginLeft: "auto" }}
          >
            arrow_forward
          </span>
        </button>

        <div
          style={{
            borderTop: "1px solid #EBE6D9",
            paddingTop: 14,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: "#66747B",
          }}
        >
          <Link href="/" style={{ color: "#66747B", textDecoration: "none" }}>
            Ver el sitio completo
          </Link>
          <Link href="/privacidad" style={{ color: "#66747B", textDecoration: "none" }}>
            Privacidad
          </Link>
          <Link href="/terminos" style={{ color: "#66747B", textDecoration: "none" }}>
            Términos
          </Link>
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
