// ─────────────────────────────────────────────────────────────────────────────
//  El correo de bienvenida de la lista de espera.
//
//  Apuntarse a una lista no devuelve nada tangible: la persona deja su correo y
//  se queda mirando una pantalla de éxito. Este mensaje es lo que convierte ese
//  registro en algo real — da las gracias, cuenta qué se lleva por entrar
//  ahora, enseña qué podrá hacer cuando la app abra y, sobre todo, le da algo
//  que hacer HOY: la demo de rutas del mapa.
//
//  Dos públicos, dos correos. El viajero quiere saber a dónde ir; el negocio,
//  que lo encuentren. Los beneficios NO se escriben aquí: salen de
//  `components/lista/content.ts`, la misma fuente que la página /lista, para
//  que la promesa no se bifurque entre el correo y el sitio.
// ─────────────────────────────────────────────────────────────────────────────

import { CONTENT } from "@/components/lista/content";
import { SITE_URL } from "@/lib/site";
import type { Audience } from "@/lib/waitlist/schema";

import {
  DEMO_URL,
  bulletList,
  button,
  card,
  heading,
  kicker,
  paragraph,
  row,
  shell,
  stamp,
  subheading,
} from "./layout";
import { C, esc } from "./theme";
import { sendEmail, type SendResult } from "./send";

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

interface Copy {
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  ctaColor: string;
  demoTitle: string;
  demoBody: string;
  perksTitle: string;
  featuresTitle: string;
  footerNote: string;
  stampSlug: "viajero" | "negocio";
  dot: string;
}

function copyFor(audience: Audience, who: WelcomeRecipient): Copy {
  const name = firstName(who.name);
  const content = CONTENT[audience];

  if (audience === "negocio") {
    const business = who.businessName?.trim();
    return {
      subject: business
        ? `${business} ya está en la lista de ConoceRD`
        : "Tu negocio ya está en la lista de ConoceRD",
      preheader:
        "Te contactamos para dejar tu perfil listo antes del lanzamiento. Mientras, mira la demo de rutas.",
      eyebrow: "Lista de espera · Negocios",
      headline: business ? `Gracias por registrar ${business}` : "Gracias por registrar tu negocio",
      intro:
        "Ya estás dentro. Cuando ConoceRD abra, tu negocio aparecerá en el mapa justo cuando un viajero esté planificando su parada cerca de ti. Antes de eso te escribimos para dejar tu perfil montado — fotos, horario y contacto — sin que tengas que pelearte con nada.",
      ctaLabel: "Ver la demo de rutas",
      ctaHref: DEMO_URL,
      ctaColor: C.mintInk,
      demoTitle: "Mira lo que ve el viajero",
      demoBody:
        "En la página ya funciona la demo del mapa: se arma una ruta parada por parada, con distancias y tiempos por carretera de verdad. Es exactamente el momento en el que tu negocio va a aparecer.",
      perksTitle: content.perksTitle,
      featuresTitle: content.featuresTitle,
      footerNote:
        "Te llegó esto porque registraste tu negocio en la lista de espera de ConoceRD.",
      stampSlug: "negocio",
      dot: C.mint,
    };
  }

  return {
    subject: name ? `Gracias, ${name} — ya estás en la lista de ConoceRD` : "Ya estás en la lista de ConoceRD",
    preheader:
      "Te avisamos antes que a nadie cuando la app abra. Mientras tanto, arma tu próxima ruta en la demo.",
    eyebrow: "Lista de espera · Viajeros",
    headline: name ? `Gracias por apuntarte, ${name}` : "Gracias por apuntarte",
    intro:
      "Ya eres fundador de ConoceRD. La app todavía no está en las tiendas, pero no tienes que esperar de brazos cruzados: en la página ya puedes armar tu próxima ruta por el país y recibirla por correo, parada por parada.",
    ctaLabel: "Arma tu próxima ruta",
    ctaHref: DEMO_URL,
    ctaColor: C.mango,
    demoTitle: "Empieza a planear hoy",
    demoBody:
      "La demo del mapa ya funciona: eliges los lugares que quieres ver, te dice cuánto manejas entre uno y otro por carretera de verdad, y te manda el itinerario escrito al correo.",
    perksTitle: CONTENT.viajero.perksTitle,
    featuresTitle: CONTENT.viajero.featuresTitle,
    footerNote:
      "Te llegó esto porque te apuntaste a la lista de espera de ConoceRD como viajero.",
    stampSlug: "viajero",
    dot: C.mango,
  };
}

export function renderWelcomeEmail(
  audience: Audience,
  who: WelcomeRecipient = {}
): { subject: string; html: string; text: string } {
  const c = copyFor(audience, who);
  const { perks, features } = CONTENT[audience];

  const content = [
    row(
      `${stamp(c.stampSlug, "Sello de ConoceRD")}
       <div style="text-align:center;">
         ${kicker(c.eyebrow, audience === "negocio" ? C.mintInk : C.coralInk)}
         ${heading(c.headline)}
       </div>`,
      "0 0 6px 0"
    ),
    row(paragraph(esc(c.intro)), "0 0 22px 0"),

    // La acción que sí puede hacer hoy va antes que cualquier promesa futura.
    row(
      card(
        `${subheading(c.demoTitle)}
         <p style="margin:0 0 16px 0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:${C.muted};">${esc(
           c.demoBody
         )}</p>
         ${button(c.ctaHref, c.ctaLabel, c.ctaColor)}`,
        "20px 20px 22px 20px"
      )
    ),

    row(card(`${subheading(c.perksTitle)}${bulletList(perks, c.dot)}`)),
    row(card(`${subheading(c.featuresTitle)}${bulletList(features, c.dot)}`)),

    row(
      `<p style="margin:0;text-align:center;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:${C.muted};">
        ¿Prefieres verlo todo con calma?
        <a href="${SITE_URL}" style="color:${C.ink};font-weight:700;">Date una vuelta por la página</a>.
      </p>`,
      "6px 0 0 0"
    ),
  ].join("");

  const html = shell({
    title: c.subject,
    preheader: c.preheader,
    content,
    footerNote: c.footerNote,
  });

  const text = [
    c.headline,
    "",
    c.intro,
    "",
    `${c.demoTitle}: ${c.demoBody}`,
    `${c.ctaLabel}: ${c.ctaHref}`,
    "",
    c.perksTitle.toUpperCase(),
    ...perks.map((p) => `· ${p.title} — ${p.desc}`),
    "",
    c.featuresTitle.toUpperCase(),
    ...features.map((f) => `· ${f.title} — ${f.desc}`),
    "",
    `La página completa: ${SITE_URL}`,
    "",
    c.footerNote,
    "Si no quieres más correos, responde a este con «Baja».",
  ].join("\n");

  return { subject: c.subject, html, text };
}

export async function sendWelcomeEmail(
  to: string,
  audience: Audience,
  who: WelcomeRecipient = {}
): Promise<SendResult> {
  const { subject, html, text } = renderWelcomeEmail(audience, who);
  return sendEmail({ to, subject, html, text });
}
