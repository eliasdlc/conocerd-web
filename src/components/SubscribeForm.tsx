"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Formulario único de la lista de espera (plan §2.1 y §2.2).
//
//  Una sola superficie para dos audiencias: un toggle Viajero/Negocio arriba y
//  campos condicionales debajo. Para el viajero el paso 1 es literalmente el
//  correo y nada más — el perfilado (provincia, intereses) llega en el paso 2
//  después de enviar, para que el activo valioso se capture aunque la persona
//  abandone. El negocio sí necesita nombre y tipo desde el principio: sin eso
//  el registro no sirve para nada.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AUDIENCES,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  HONEYPOT_FIELD,
  type Audience,
  type SubscribeResult,
} from "@/lib/waitlist/schema";

// ─── Tono visual ──────────────────────────────────────────────────────────────
// El form vive sobre la card oscura del CTA, sobre el footer y sobre el crema de
// /lista. Un solo prop decide los colores; no hay una segunda copia del markup.

type Tone = "light" | "dark";

const TONES: Record<Tone, {
  text: string; muted: string; field: string; fieldBorder: string;
  fieldText: string; placeholder: string; toggleBg: string; toggleActive: string;
  toggleActiveText: string; toggleText: string; error: string; success: string;
}> = {
  dark: {
    text: "#fff",
    muted: "rgba(255,255,255,0.66)",
    field: "rgba(255,255,255,0.10)",
    fieldBorder: "rgba(255,255,255,0.22)",
    fieldText: "#fff",
    placeholder: "rgba(255,255,255,0.45)",
    toggleBg: "rgba(255,255,255,0.10)",
    toggleActive: "#fff",
    toggleActiveText: "#1D3A45",
    toggleText: "rgba(255,255,255,0.75)",
    error: "#FFB3A0",
    success: "#25CCB8",
  },
  light: {
    text: "#264653",
    muted: "#5B6B72",
    field: "#fff",
    fieldBorder: "#EBE6D9",
    fieldText: "#264653",
    placeholder: "#97A2A8",
    toggleBg: "#F5EFE2",
    toggleActive: "#264653",
    toggleActiveText: "#fff",
    toggleText: "#5B6B72",
    error: "#B23410",
    success: "#0C6A60",
  },
};

const AUDIENCE_LABEL: Record<Audience, string> = {
  viajero: "Soy viajero",
  negocio: "Tengo un negocio",
};

const SUCCESS_COPY: Record<Audience, { title: string; body: string }> = {
  viajero: {
    title: "¡Ya estás dentro!",
    body: "Te escribiremos antes del lanzamiento. Como parte de la lista tendrás badge de fundador en tu perfil y acceso anticipado a la beta.",
  },
  negocio: {
    title: "¡Negocio registrado!",
    body: "Te contactamos para configurar tu perfil. Los negocios de la lista entran con perfil destacado gratis los primeros meses tras el lanzamiento.",
  },
};

// ─── Captura del `ref` (§2.3) ─────────────────────────────────────────────────
// La landing del QR llega como /lista?ref=expo-ozrd. Se lee del `location` en vez
// de `useSearchParams` a propósito: así el componente se puede montar dentro de
// páginas estáticas (la home) sin arrastrar un límite de Suspense. Se persiste en
// sessionStorage para que sobreviva a una navegación dentro del sitio.

const REF_KEY = "crd:ref";

/** Guarda el `?ref=` de la URL para que sobreviva a una navegación interna. */
function persistReferral() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (fromUrl) sessionStorage.setItem(REF_KEY, fromUrl.slice(0, 60));
  } catch {
    // sessionStorage bloqueado (modo privado estricto): el ref no se persiste.
  }
}

/** Se lee en el submit, no en render: no hay nada que pintar con este valor. */
function readReferral(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim();
    return (fromUrl || sessionStorage.getItem(REF_KEY) || undefined)?.slice(0, 60);
  } catch {
    return undefined;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Status = "idle" | "submitting" | "success" | "error";

/** Lo que la página anfitriona necesita saber cuando el registro sale bien. */
export interface SubscribeSuccess {
  audience: Audience;
  /** El correo ya estaba en la lista: no es un alta nueva. */
  alreadyIn: boolean;
}

export interface SubscribeFormProps {
  tone?: Tone;
  /** Audiencia con la que abre el toggle. */
  defaultAudience?: Audience;
  /**
   * Audiencia controlada desde fuera. Cuando se pasa junto a `onAudienceChange`,
   * el toggle deja de tener estado propio y la página puede reaccionar al cambio
   * (en /lista los beneficios de la página cambian con él).
   */
  audience?: Audience;
  onAudienceChange?: (a: Audience) => void;
  /** `compact` = una línea (footer). `full` = toggle + campos (CTA, /lista). */
  layout?: "full" | "compact";
  /** Se rellena solo en la variante compacta, donde no cabe el toggle. */
  audienceLocked?: boolean;
  autoFocus?: boolean;
  /** Identifica de dónde salió el registro en los logs/analítica futura. */
  source?: string;
  /** Efectos de la página al registrarse (confeti, scroll, analítica). */
  onSuccess?: (info: SubscribeSuccess) => void;
  /** Sustituye el aviso de éxito por defecto por el de la página anfitriona. */
  renderSuccess?: (info: SubscribeSuccess) => ReactNode;
}

export default function SubscribeForm({
  tone = "light",
  defaultAudience = "viajero",
  audience: audienceProp,
  onAudienceChange,
  layout = "full",
  audienceLocked = false,
  autoFocus = false,
  source,
  onSuccess,
  renderSuccess,
}: SubscribeFormProps) {
  const t = TONES[tone];
  const compact = layout === "compact";
  const uid = useId();

  const controlled = audienceProp !== undefined;
  const [innerAudience, setInnerAudience] = useState<Audience>(defaultAudience);
  const audience = controlled ? audienceProp : innerAudience;
  const setAudience = useCallback(
    (a: Audience) => {
      if (!controlled) setInnerAudience(a);
      onAudienceChange?.(a);
    },
    [controlled, onAudienceChange]
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alreadyIn, setAlreadyIn] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toggleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(persistReferral, []);

  // Un cambio de audiencia desde fuera (p. ej. "Registra tu negocio") debe
  // reflejarse aunque el componente ya esté montado. Se ajusta durante el
  // render —no en un efecto— para no encadenar un segundo render.
  const [lastDefault, setLastDefault] = useState<Audience>(defaultAudience);
  if (!controlled && lastDefault !== defaultAudience) {
    setLastDefault(defaultAudience);
    setInnerAudience(defaultAudience);
  }

  const isBusiness = audience === "negocio";

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (status === "submitting") return;
      setStatus("submitting");
      setError(null);
      setFieldErrors({});

      const fd = new FormData(e.currentTarget);
      const ref = readReferral();
      const payload = {
        audience,
        email: String(fd.get("email") ?? ""),
        businessName: isBusiness ? String(fd.get("businessName") ?? "") : undefined,
        businessType: isBusiness ? String(fd.get("businessType") ?? "") : undefined,
        whatsapp: isBusiness ? String(fd.get("whatsapp") ?? "") : undefined,
        consent: fd.get("consent") === "on",
        ref: source && !ref ? source : ref,
        [HONEYPOT_FIELD]: String(fd.get(HONEYPOT_FIELD) ?? ""),
      };

      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as SubscribeResult;
        if (!data.ok) {
          setError(data.error);
          setFieldErrors(data.fields ?? {});
          setStatus("error");
          return;
        }
        const already = data.status === "already_subscribed";
        setAlreadyIn(already);
        setStatus("success");
        onSuccess?.({ audience, alreadyIn: already });
      } catch {
        setError("No hay conexión. Revisa tu señal e inténtalo de nuevo.");
        setStatus("error");
      }
    },
    [audience, isBusiness, onSuccess, source, status]
  );

  const fieldStyle = useMemo<React.CSSProperties>(
    () => ({
      width: "100%",
      height: 48,
      padding: "0 14px",
      borderRadius: 14,
      border: `1px solid ${t.fieldBorder}`,
      background: t.field,
      color: t.fieldText,
      fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
      fontSize: 15,
      outline: "none",
    }),
    [t]
  );

  // ── Éxito ──
  if (status === "success") {
    if (renderSuccess) return <>{renderSuccess({ audience, alreadyIn })}</>;
    const copy = SUCCESS_COPY[audience];
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          textAlign: "left",
          background: tone === "dark" ? "rgba(37,204,184,0.14)" : "#C6F3EB",
          border: `1px solid ${tone === "dark" ? "rgba(37,204,184,0.35)" : "#25CCB8"}`,
          borderRadius: 16,
          padding: compact ? "12px 14px" : "16px 18px",
        }}
      >
        <span className="ms" aria-hidden="true" style={{ fontSize: 24, color: t.success, flexShrink: 0 }}>
          check_circle
        </span>
        <div>
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              color: t.text,
            }}
          >
            {alreadyIn ? "Ya estabas en la lista" : copy.title}
          </div>
          <p style={{ margin: "3px 0 0", color: t.muted, fontSize: 13, lineHeight: 1.5 }}>
            {alreadyIn
              ? "Tu correo ya estaba registrado — no hace falta nada más de tu parte."
              : copy.body}
          </p>
        </div>
      </div>
    );
  }

  const emailId = `${uid}-email`;
  const consentId = `${uid}-consent`;
  const errorId = `${uid}-error`;
  const submitting = status === "submitting";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate style={{ width: "100%", textAlign: "left" }}>
      {/* Toggle de audiencia */}
      {!compact && !audienceLocked && (
        <div
          role="radiogroup"
          aria-label="¿Quién eres?"
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: t.toggleBg,
            borderRadius: 999,
            marginBottom: 14,
          }}
        >
          {AUDIENCES.map((a, i) => {
            const active = a === audience;
            return (
              <button
                key={a}
                ref={(el) => {
                  toggleRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setAudience(a)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const next = AUDIENCES[(i + 1) % AUDIENCES.length];
                  setAudience(next);
                  toggleRefs.current[AUDIENCES.indexOf(next)]?.focus();
                }}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: active ? t.toggleActive : "transparent",
                  color: active ? t.toggleActiveText : t.toggleText,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 13.5,
                  transition: "background .2s, color .2s",
                }}
              >
                {AUDIENCE_LABEL[a]}
              </button>
            );
          })}
        </div>
      )}

      {/* Campos de negocio — sólo cuando hacen falta */}
      {!compact && isBusiness && (
        <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
          <div>
            <input
              name="businessName"
              type="text"
              required
              autoComplete="organization"
              placeholder="Nombre de tu negocio"
              aria-label="Nombre de tu negocio"
              aria-invalid={Boolean(fieldErrors.businessName)}
              style={fieldStyle}
            />
            {fieldErrors.businessName && (
              <p style={{ margin: "5px 2px 0", color: t.error, fontSize: 12.5 }}>
                {fieldErrors.businessName}
              </p>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="crd-sub-row">
            <select
              name="businessType"
              defaultValue="restaurante"
              aria-label="Tipo de negocio"
              style={{ ...fieldStyle, cursor: "pointer" }}
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b} value={b} style={{ color: "#264653" }}>
                  {BUSINESS_TYPE_LABELS[b]}
                </option>
              ))}
            </select>
            <input
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="WhatsApp (opcional)"
              aria-label="WhatsApp (opcional)"
              style={fieldStyle}
            />
          </div>
        </div>
      )}

      {/* Correo + enviar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus={autoFocus}
          placeholder="tucorreo@ejemplo.com"
          aria-label="Tu correo electrónico"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={error ? errorId : undefined}
          // `minWidth: 0` es lo que permite que el campo encoja: un input como
          // flex item toma su ancho intrínseco (~200px) como mínimo, y en la
          // columna estrecha del footer eso empujaba el botón a otra línea.
          style={{
            ...fieldStyle,
            flex: compact ? "1 1 130px" : "1 1 200px",
            width: "auto",
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            height: 48,
            padding: compact ? "0 16px" : "0 22px",
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#FF6B4A,#F76C4D)",
            color: "#fff",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 15,
            cursor: submitting ? "progress" : "pointer",
            opacity: submitting ? 0.75 : 1,
            boxShadow: "0 8px 22px rgba(247,108,77,.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          {submitting ? "Enviando…" : isBusiness ? "Registrar negocio" : "Unirme"}
          {!submitting && !compact && (
            <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>
              arrow_forward
            </span>
          )}
        </button>
      </div>

      {fieldErrors.email && (
        <p style={{ margin: "6px 2px 0", color: t.error, fontSize: 12.5 }}>{fieldErrors.email}</p>
      )}

      {/* Honeypot: fuera de la vista pero dentro del DOM, sin aria y sin tab. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor={`${uid}-hp`}>No llenar</label>
        <input id={`${uid}-hp`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Consentimiento explícito (§2.5) */}
      <label
        htmlFor={consentId}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          margin: "10px 2px 0",
          color: t.muted,
          fontSize: 12,
          lineHeight: 1.45,
          cursor: "pointer",
        }}
      >
        <input
          id={consentId}
          name="consent"
          type="checkbox"
          required
          aria-invalid={Boolean(fieldErrors.consent)}
          style={{ marginTop: 2, width: 16, height: 16, accentColor: "#F76C4D", flexShrink: 0 }}
        />
        <span>
          Acepto recibir correos de ConoceRD sobre el lanzamiento. Puedo darme de baja cuando
          quiera.
        </span>
      </label>
      {fieldErrors.consent && (
        <p style={{ margin: "4px 2px 0", color: t.error, fontSize: 12.5 }}>{fieldErrors.consent}</p>
      )}

      {/* Error general */}
      <p
        id={errorId}
        role="alert"
        aria-live="assertive"
        style={{
          margin: error ? "8px 2px 0" : 0,
          color: t.error,
          fontSize: 13,
          minHeight: error ? undefined : 0,
        }}
      >
        {error}
      </p>
    </form>
  );
}
