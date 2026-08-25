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

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import {
  trackWaitlistError,
  trackWaitlistSubmit,
  trackWaitlistSuccess,
  trackWaitlistView,
} from "@/lib/analytics";
import {
  AUDIENCES,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  HONEYPOT_FIELD,
  type Audience,
  type SubscribeResult,
} from "@/lib/waitlist/constants";

// ─── Tono visual ──────────────────────────────────────────────────────────────
// El form vive sobre la card oscura del CTA, sobre el footer y sobre el crema de
// /lista. Un solo prop decide los colores; no hay una segunda copia del markup.

type Tone = "light" | "dark";

// Cada tono es un juego de clases, no de valores. Son literales en el código
// fuente, que es lo que Tailwind escanea; una clase compuesta por interpolación
// nunca se generaría.
const TONES: Record<Tone, {
  text: string; muted: string; field: string; prefix: string; toggleBg: string;
  toggleActive: string; toggleInactive: string; error: string; success: string;
  successBox: string; successBody: string;
}> = {
  dark: {
    text: "text-white",
    muted: "text-white/70",
    field: "border-white/28 bg-white/[0.08] text-white",
    prefix: "text-white/70",
    toggleBg: "bg-white/10",
    toggleActive: "bg-paper text-ink",
    toggleInactive: "text-white/75",
    // Sobre tinta el `danger` del sistema (#B42318) es ilegible: ahí el rojo
    // sube de luz. El token vive para el tono claro.
    error: "text-[#FFB3A0]",
    success: "text-mint",
    successBox: "border-mint/35 bg-mint/[0.14]",
    successBody: "text-white/70",
  },
  light: {
    text: "text-ink",
    muted: "text-muted",
    // El borde va en `muted-2` y no en `line`: con `line` daba 1.25:1 y el
    // campo desaparecía contra el papel.
    field: "border-muted-2 bg-paper text-ink",
    prefix: "text-muted",
    toggleBg: "bg-cream-2",
    toggleActive: "bg-selected text-on-selected",
    toggleInactive: "text-muted",
    error: "text-danger",
    success: "text-mint-ink",
    successBox: "border-mint-ink bg-mint-soft",
    // En `muted` el cuerpo del éxito sobre mint-soft daba 4.14:1 y reprobaba.
    successBody: "text-ink-3",
  },
};

// Chrome común de todos los campos: sustituye al objeto fieldStyle que antes se
// memorizaba y se extendía con spread en cada input.
// Sin `outline-none`: las utilities le ganan al anillo de focus global de
// @layer base (globals.css) y los campos del embudo quedaban sin focus visible
// al navegar con teclado (audit 5.2).
const FIELD = "h-12 w-full rounded-ctrl border px-3.5 font-sans text-body";

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

/**
 * El campo de Instagram ya pinta un `@` fijo a la izquierda, así que quien
 * escriba o pegue el suyo con arroba —o pegue la URL entera— vería `@@casona`.
 * Se limpia mientras escribe; el servidor vuelve a normalizar de todas formas,
 * esto es sólo para que lo que se ve sea lo que se guarda.
 */
function stripInstagramPrefix(value: string): string {
  return value
    .replace(/^\s+/, "")
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "");
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

// ─── Conmutador de audiencia ──────────────────────────────────────────────────
//
// Dos píldoras en `cream-2` con la elegida en `selected`, el mismo toggle de los
// ajustes de la app. Sobre tinta el carril va en blanco al 10 % y la elegida en
// `paper`. Se exporta porque en /lista no vive dentro del formulario: gobierna
// la página entera y por eso va en su cabecera.

export function AudienceToggle({
  audience,
  onChange,
  tone = "light",
  className = "",
}: {
  audience: Audience;
  onChange: (a: Audience) => void;
  tone?: Tone;
  className?: string;
}) {
  const t = TONES[tone];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <div
      role="radiogroup"
      aria-label="¿Quién eres?"
      className={`flex gap-1 rounded-full p-1 ${t.toggleBg} ${className}`}
    >
      {AUDIENCES.map((a, i) => {
        const active = a === audience;
        return (
          <button
            key={a}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(a)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = AUDIENCES[(i + 1) % AUDIENCES.length];
              onChange(next);
              refs.current[AUDIENCES.indexOf(next)]?.focus();
            }}
            className={`h-11 flex-1 cursor-pointer rounded-full border-none font-label text-copy font-bold transition-[background-color,color] duration-200 ${
              active ? t.toggleActive : `bg-transparent ${t.toggleInactive}`
            }`}
          >
            {AUDIENCE_LABEL[a]}
          </button>
        );
      })}
    </div>
  );
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
  // Controlado sólo este campo: es el único que se reescribe mientras se teclea.
  const [instagram, setInstagram] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(persistReferral, []);

  // Vista del formulario (audit 5.7). Se cuenta cuando entra en pantalla, no al
  // montar: en la home el formulario está al final de un journey largo y
  // contarlo al montar inflaría la tasa vista→envío hasta hacerla inútil.
  // El efecto se resuscribe si cambia la audiencia —para registrar el valor
  // vigente— pero `viewed` garantiza un solo evento por montaje.
  const viewed = useRef(false);
  useEffect(() => {
    const el = formRef.current;
    if (!el || viewed.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (viewed.current || !entries.some((e) => e.isIntersecting)) return;
        viewed.current = true;
        io.disconnect();
        trackWaitlistView({ source, audience });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [source, audience]);

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
        instagram: isBusiness ? String(fd.get("instagram") ?? "") : undefined,
        consent: fd.get("consent") === "on",
        ref: source && !ref ? source : ref,
        [HONEYPOT_FIELD]: String(fd.get(HONEYPOT_FIELD) ?? ""),
      };

      trackWaitlistSubmit({ source, audience });

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
          trackWaitlistError({ source, audience, reason: "validacion" });
          return;
        }
        const already = data.status === "already_subscribed";
        setAlreadyIn(already);
        setStatus("success");
        trackWaitlistSuccess({ source, audience, already });
        onSuccess?.({ audience, alreadyIn: already });
      } catch {
        setError("No hay conexión. Revisa tu señal e inténtalo de nuevo.");
        setStatus("error");
        trackWaitlistError({ source, audience, reason: "red" });
      }
    },
    [audience, isBusiness, onSuccess, source, status]
  );

  const field = `${FIELD} ${t.field}`;

  // ── Éxito ──
  if (status === "success") {
    if (renderSuccess) return <>{renderSuccess({ audience, alreadyIn })}</>;
    const copy = SUCCESS_COPY[audience];
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-3 rounded-block border text-left ${t.successBox} ${
          compact ? "px-3.5 py-3" : "px-[18px] py-4"
        }`}
      >
        <Icon name="check_circle" className={`shrink-0 text-2xl ${t.success}`} />
        <div>
          <div className={`font-label text-body font-bold ${t.text}`}>
            {alreadyIn ? "Ya estabas en la lista" : copy.title}
          </div>
          <p className={`mt-[3px] text-copy leading-[1.5] ${t.successBody}`}>
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
    <form ref={formRef} onSubmit={onSubmit} noValidate className="w-full text-left">
      {/* Toggle de audiencia. En /lista vive en la cabecera de la página, no
          aquí: allí gobierna el titular, los beneficios y las features, así que
          pertenece a la página. Este render es para el CTA del journey. */}
      {!compact && !audienceLocked && (
        <AudienceToggle audience={audience} onChange={setAudience} tone={tone} className="mb-3.5" />
      )}

      {/* Campos de negocio — sólo cuando hacen falta */}
      {!compact && isBusiness && (
        <div className="mb-2.5 grid gap-2.5">
          <div>
            <input
              name="businessName"
              type="text"
              required
              autoComplete="organization"
              placeholder="Nombre de tu negocio"
              aria-label="Nombre de tu negocio"
              aria-invalid={Boolean(fieldErrors.businessName)}
              className={field}
            />
            {fieldErrors.businessName && (
              <p className={`mx-0.5 mt-[5px] text-tiny ${t.error}`}>
                {fieldErrors.businessName}
              </p>
            )}
          </div>
          <div className="crd-sub-row grid grid-cols-2 gap-2.5">
            <select
              name="businessType"
              defaultValue="restaurante"
              aria-label="Tipo de negocio"
              className={`${field} cursor-pointer`}
            >
              {BUSINESS_TYPES.map((b) => (
                <option key={b} value={b} style={{ color: "#0F1A2E" }}>
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
              className={field}
            />
          </div>
          {/* Instagram: para muchos negocios de RD es su única vitrina en línea,
              así que es de donde saldrán las fotos y horarios de su perfil. El
              `@` va pintado fuera del input para que nadie lo escriba dos veces
              (igual lo normalizamos en el servidor si lo hacen). */}
          <div>
            <div className="relative">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-3.5 top-0 flex h-12 items-center font-sans text-body ${t.prefix}`}
              >
                @
              </span>
              <input
                name="instagram"
                type="text"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={instagram}
                onChange={(e) => setInstagram(stripInstagramPrefix(e.target.value))}
                placeholder="instagram del negocio (opcional)"
                aria-label="Usuario de Instagram del negocio (opcional)"
                aria-invalid={Boolean(fieldErrors.instagram)}
                className={`${field} pl-7`}
              />
            </div>
            {fieldErrors.instagram && (
              <p className={`mx-0.5 mt-[5px] text-tiny ${t.error}`}>
                {fieldErrors.instagram}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Correo + enviar */}
      <div className="flex flex-wrap gap-2">
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
          // min-w-0 es lo que permite que el campo encoja: un input como flex
          // item toma su ancho intrínseco (~200px) como mínimo, y en la columna
          // estrecha del footer eso empujaba el botón a otra línea.
          className={`${field} w-auto min-w-0 ${compact ? "flex-[1_1_130px]" : "flex-[1_1_200px]"}`}
        />
        {/* En móvil el botón baja a su propia línea al 44% del ancho, con un
            vacío enorme a la derecha (audit 2.2) → ancho completo, como el
            resto de los CTA. El footer (compact) sí cabe en una línea. */}
        <button
          type="submit"
          disabled={submitting}
          // La primaria del sistema: 54 de alto y etiqueta 19/700, que es
          // exactamente el cuerpo desde el que blanco sobre coral pasa AA
          // (3.81:1). En la variante compacta del pie no cabe una pieza de 54,
          // así que ahí se queda en 48 y se rellena de `selected`, que da
          // 17.39:1 a cualquier tamaño.
          className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border-none font-label font-bold disabled:cursor-progress disabled:opacity-75 ${
            compact
              ? "h-12 bg-selected px-4 text-body text-on-selected"
              : "h-[54px] bg-coral px-[26px] text-[19px] text-white shadow-e2 max-desk:w-full max-desk:justify-center"
          } ${submitting ? "" : "cursor-pointer"}`}
        >
          {submitting ? "Enviando…" : isBusiness ? "Registrar negocio" : "Unirme"}
          {!submitting && !compact && <Icon name="arrow_forward" className="text-lg" />}
        </button>
      </div>

      {fieldErrors.email && (
        <p className={`mx-0.5 mt-1.5 text-tiny ${t.error}`}>{fieldErrors.email}</p>
      )}

      {/* Honeypot: fuera de la vista pero dentro del DOM, sin aria y sin tab. */}
      <div aria-hidden="true" className="absolute left-[-9999px] size-px overflow-hidden">
        <label htmlFor={`${uid}-hp`}>No llenar</label>
        <input id={`${uid}-hp`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Consentimiento explícito (§2.5). El checkbox es obligatorio para
          convertir: 22px de caja + padding vertical del label (todo él
          clicable) llevan el target táctil a ≥44px de alto (audit 2.3). */}
      <label
        htmlFor={consentId}
        className={`mx-0.5 mt-1.5 flex cursor-pointer items-start gap-2.5 py-1.5 text-xs leading-[1.45] ${t.muted}`}
      >
        <input
          id={consentId}
          name="consent"
          type="checkbox"
          required
          aria-invalid={Boolean(fieldErrors.consent)}
          // La selección del sistema es `selected`, nunca el acento: el coral
          // marca acciones, y una casilla marcada es estado.
          className="size-[22px] shrink-0 rounded-[6px] accent-selected"
        />
        <span>
          Acepto recibir correos de ConoceRD sobre el lanzamiento. Puedo darme de baja cuando
          quiera.
        </span>
      </label>
      {fieldErrors.consent && (
        <p className={`mx-0.5 mt-1 text-tiny ${t.error}`}>{fieldErrors.consent}</p>
      )}

      {/* Error general — sin error no ocupa alto, para no reservar hueco vacío. */}
      <p
        id={errorId}
        role="alert"
        aria-live="assertive"
        className={`text-copy ${t.error} ${error ? "mx-0.5 mt-2" : "m-0 min-h-0"}`}
      >
        {error}
      </p>
    </form>
  );
}
