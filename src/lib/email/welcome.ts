// ─────────────────────────────────────────────────────────────────────────────
//  El correo de bienvenida de la lista de espera.
//
//  Apuntarse a una lista no devuelve nada tangible: la persona deja su correo y
//  se queda mirando una pantalla de éxito. Este mensaje es lo que convierte ese
//  registro en algo real.
//
//  El orden es el del interés, no el del guion. Primero LO QUE YA SE LLEVÓ —la
//  credencial de fundador, que es lo que de verdad le importa a quien abre
//  esto—, después LO ÚNICO que puede hacer hoy (la demo de rutas), y sólo al
//  final lo que vendrá cuando la app abra. Nada de un párrafo de
//  agradecimiento antes del premio.
//
//  Dos públicos, dos correos. El viajero quiere saber a dónde ir; el negocio,
//  que lo encuentren. Los beneficios NO se escriben aquí: salen de
//  `components/lista/content.ts`, la misma fuente que la página /lista, para
//  que la promesa no se bifurque entre el correo y el sitio. Del correo sale
//  sólo el tono: la credencial cuenta en primera persona el primer beneficio
//  de esa lista (el badge, el perfil destacado), que por eso no se repite
//  debajo.
// ─────────────────────────────────────────────────────────────────────────────

import { CONTENT } from "@/components/lista/content";
import type { Audience } from "@/lib/waitlist/schema";

import { loadEmailAssets, type RenderMode } from "./assets";
import {
  DEMO_URL,
  LOGO_ASSET,
  band,
  button,
  credential,
  grid2,
  kicker,
  row,
  shell,
  stampAsset,
  type HeaderTag,
} from "./layout";
import { C, F, esc } from "./theme";
import { sendEmail, type RenderedEmail, type SendResult } from "./send";

export interface WelcomeRecipient {
  /** Nombre de pila de la persona, si lo dejó. */
  name?: string;
  /** Sólo negocios: el nombre del sitio, que es como quieren que les hablen. */
  businessName?: string;
}

/** Primer nombre, capitalizado. La gente escribe "elias" y "ELIAS DE LA CRUZ". */
function firstName(raw?: string): string | undefined {
  const first = raw?.trim().split(/\s+/)[0];
  if (!first || first.length > 24) return undefined;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** «3 de agosto de 2026». La fecha del alta es el único dato del carnet que es
 *  suyo y verificable; sin ella la credencial es un adorno. */
function longDate(d: Date): string {
  return new Intl.DateTimeFormat("es-DO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Descripción corta para la rejilla; si no hay, la larga de la página. */
function short(it: { title: string; desc: string; short?: string }) {
  return { title: it.title, desc: it.short ?? it.desc };
}

interface Copy {
  subject: string;
  preheader: string;
  tag: HeaderTag;
  stampSlug: "viajero" | "negocio";
  eyebrow: string;
  eyebrowColor: string;
  headline: string;
  credentialBody: string;
  factLabel: string;
  includesLabel: string;
  includes: string;
  ctaEyebrow: string;
  ctaTitle: string;
  ctaBody: string;
  ctaLabel: string;
  ctaColor: string;
  ps: string;
  footerNote: string;
}

function copyFor(audience: Audience, who: WelcomeRecipient): Copy {
  if (audience === "negocio") {
    const business = who.businessName?.trim();
    return {
      subject: business
        ? `${business} ya está en el mapa de ConoceRD`
        : "Tu negocio ya está en el mapa de ConoceRD",
      preheader:
        "Tu perfil destacado gratis ya está reservado. Mira lo que verá el viajero cuando la app abra.",
      tag: { text: "NEGOCIO · FUNDADOR", bg: C.mintSoft, fg: C.mintInk },
      stampSlug: "negocio",
      eyebrow: "Credencial de negocio fundador",
      eyebrowColor: C.mint,
      headline: business ? `${business} ya está dentro` : "Tu negocio ya está dentro",
      credentialBody:
        "Tienes reservado el perfil destacado gratis de los primeros meses tras el lanzamiento. Sólo lo tienen los negocios que se registraron antes de que la app abriera.",
      factLabel: "Registrado desde",
      includesLabel: "Tu reserva incluye",
      includes: "Perfil destacado y panel anticipado",
      ctaEyebrow: "Mientras tanto",
      ctaTitle: "Mira lo que va a ver el viajero",
      ctaBody:
        "En la página ya funciona la demo del mapa: se arma una ruta parada por parada, con distancias y tiempos por carretera de verdad. Es exactamente el momento en el que tu negocio va a aparecer.",
      ctaLabel: "Ver la demo del mapa",
      ctaColor: C.mintInk,
      ps: "PS: ¿tienes un vecino que también debería estar en el mapa? Reenvíale este correo.",
      footerNote:
        "Te llegó esto porque registraste tu negocio en la lista de espera de ConoceRD.",
    };
  }

  const name = firstName(who.name);
  return {
    subject: name ? `${name}, ya eres fundador de ConoceRD` : "Ya eres fundador de ConoceRD",
    preheader:
      "Tu badge de fundador ya es tuyo. Y mientras la app llega, puedes armar tu próxima ruta hoy.",
    tag: { text: "VIAJERO · FUNDADOR", bg: C.coralSoft, fg: C.coralInk },
    stampSlug: "viajero",
    eyebrow: "Credencial de fundador",
    eyebrowColor: C.mangoOnInk,
    headline: name ? `${name}, ya eres fundador` : "Ya eres fundador",
    credentialBody:
      "Tu insignia queda para siempre en tu perfil. Sólo la tiene quien se apuntó antes de que la app abriera: después del lanzamiento ya no se puede conseguir.",
    factLabel: "Fundador desde",
    includesLabel: "Tu insignia incluye",
    includes: "Beta anticipada y aviso primero",
    ctaEyebrow: "Mientras tanto",
    ctaTitle: "Arma tu próxima ruta hoy mismo",
    ctaBody:
      "La demo del mapa ya funciona en la página: eliges los lugares, te dice cuánto manejas entre uno y otro por carretera de verdad, y te manda el itinerario escrito al correo.",
    ctaLabel: "Armar mi ruta",
    ctaColor: C.mango,
    ps: "PS: si conoces un negocio que debería estar en el mapa, reenvíale este correo — también pueden apuntarse.",
    footerNote:
      "Te llegó esto porque te apuntaste a la lista de espera de ConoceRD como viajero.",
  };
}

export async function renderWelcomeEmail(
  audience: Audience,
  who: WelcomeRecipient = {},
  mode: RenderMode = "send"
): Promise<RenderedEmail> {
  const c = copyFor(audience, who);
  const { perks, features, perksTitle, featuresTitle } = CONTENT[audience];
  // El logo y el sello son los dos binarios que viajan dentro del mensaje.
  const assets = await loadEmailAssets([LOGO_ASSET, stampAsset(c.stampSlug)], mode);

  // El primer beneficio ya lo cuenta la credencial; la rejilla enseña el resto.
  const rest = perks.slice(1).map(short);
  const grid = features.map(short);

  const content = [
    row(
      credential({
        assets,
        slug: c.stampSlug,
        eyebrow: c.eyebrow,
        eyebrowColor: c.eyebrowColor,
        headline: c.headline,
        body: c.credentialBody,
        facts: [
          { label: c.factLabel, value: longDate(new Date()) },
          { label: c.includesLabel, value: c.includes },
        ],
      }),
      "0 0 30px 0"
    ),

    // Lo único accionable hoy, suelto sobre el crema y con el botón a la
    // izquierda: después del panel oscuro, el aire es lo que marca el ritmo.
    row(
      `${kicker(c.ctaEyebrow)}
       <h2 style="margin:9px 0 0 0;font:700 23px/1.2 ${F.serif};color:${C.ink};">${esc(c.ctaTitle)}</h2>
       <p style="margin:10px 0 20px 0;font:400 15px/1.6 ${F.sans};color:${C.muted};">${esc(c.ctaBody)}</p>
       ${button(DEMO_URL, c.ctaLabel, c.ctaColor, "#FFFFFF", "left")}`,
      "0 0 32px 0"
    ),

    row(
      band(
        `${kicker(perksTitle)}
         <div style="height:14px;font-size:0;line-height:0;">&nbsp;</div>
         ${grid2(rest)}`
      ),
      "0 0 30px 0"
    ),

    row(
      `${kicker(featuresTitle)}
       <div style="height:16px;font-size:0;line-height:0;">&nbsp;</div>
       ${grid2(grid)}`,
      "0 0 22px 0"
    ),

    row(
      `<p style="margin:0;font:400 14px/1.6 ${F.sans};color:${C.muted};">${esc(c.ps)}</p>`,
      "0"
    ),
  ].join("");

  const html = shell({
    title: c.subject,
    preheader: c.preheader,
    content,
    footerNote: c.footerNote,
    assets,
    tag: c.tag,
  });

  const text = [
    c.headline,
    "",
    c.credentialBody,
    `${c.factLabel}: ${longDate(new Date())}. ${c.includesLabel}: ${c.includes}.`,
    "",
    `${c.ctaTitle}: ${c.ctaBody}`,
    `${c.ctaLabel}: ${DEMO_URL}`,
    "",
    perksTitle.toUpperCase(),
    ...rest.map((p) => `· ${p.title} — ${p.desc}`),
    "",
    featuresTitle.toUpperCase(),
    ...grid.map((f) => `· ${f.title} — ${f.desc}`),
    "",
    c.ps,
    c.footerNote,
    "Si no quieres más correos, responde a este con «Baja».",
  ].join("\n");

  return { subject: c.subject, html, text, attachments: assets.attachments };
}

export async function sendWelcomeEmail(
  to: string,
  audience: Audience,
  who: WelcomeRecipient = {}
): Promise<SendResult> {
  const { subject, html, text, attachments } = await renderWelcomeEmail(audience, who);
  return sendEmail({ to, subject, html, text, attachments });
}
