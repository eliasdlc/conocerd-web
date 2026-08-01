// ─────────────────────────────────────────────────────────────────────────────
//  Copia de /lista, dividida por audiencia.
//
//  La página tiene dos públicos con motivaciones opuestas — el viajero busca
//  a dónde ir, el negocio busca que lo encuentren — y hasta ahora sólo hablaba
//  del primero. En vez de dos páginas, el toggle del formulario gobierna toda
//  la columna de contenido: el titular, lo que ganas por entrar ahora y qué es
//  ConoceRD cambian con él.
//
//  Las features salen de las mismas fuentes que la home (`ViajerosSection` y
//  `NegociosSection`) y los beneficios de la lista, de WAITLIST_PLAN §5, para
//  que la promesa no se bifurque entre páginas.
// ─────────────────────────────────────────────────────────────────────────────

import type { Audience } from "@/lib/waitlist/schema";
import type { IconName } from "@/components/Icon";

export interface Item {
  icon: IconName;
  title: string;
  desc: string;
}

export interface AudienceContent {
  /** Etiqueta corta del chip que abre la columna de contenido. */
  eyebrow: string;
  eyebrowIcon: IconName;
  headline: string;
  /** Cola del titular en itálica coral: el acento editorial de Fase D. */
  headlineAccent: string;
  sub: string;
  /** Lo que se gana *por entrar ahora* — el argumento de la lista de espera. */
  perksTitle: string;
  perks: Item[];
  /** Qué es ConoceRD para esta audiencia — el argumento del producto. */
  featuresTitle: string;
  features: Item[];
  /** Cifras del estudio de mercado. Vacío = no se pinta la franja. */
  stats: { value: string; label: string; color: string }[];
  success: { title: string; body: string };
}

export const CONTENT: Record<Audience, AudienceContent> = {
  viajero: {
    eyebrow: "Para viajeros",
    eyebrowIcon: "hiking",
    headline: "Se de los primeros",
    headlineAccent: "en usar ConoceRD",
    sub: "Déjanos tu correo y entras a la lista de fundadores. Te avisamos antes que a nadie cuando la app esté lista.",
    perksTitle: "Lo que te llevas por entrar ahora",
    perks: [
      {
        icon: "workspace_premium",
        title: "Badge de fundador",
        desc: "Una insignia permanente en tu perfil. Sólo la tiene quien se apuntó antes del lanzamiento.",
      },
      {
        icon: "rocket_launch",
        title: "Acceso anticipado a la beta",
        desc: "Pruebas la app semanas antes de que se abra al público.",
      },
      {
        icon: "notifications_active",
        title: "Aviso antes que nadie",
        desc: "Te escribimos el día que la app esté lista para descargar.",
      },
    ],
    featuresTitle: "Qué vas a poder hacer",
    features: [
      {
        icon: "explore",
        title: "Destinos que no salen en las guías",
        desc: "Playas, saltos y pueblos reales, con lo que de verdad se puede hacer allí.",
      },
      {
        icon: "route",
        title: "Arma tu recorrido",
        desc: "Encadena varios lugares en una ruta y llévala contigo el día del viaje.",
      },
      {
        icon: "storefront",
        title: "Negocios locales, no cadenas",
        desc: "Come, duerme y compra donde compra la gente de la zona.",
      },
      {
        icon: "auto_stories",
        title: "Tu diario de viaje",
        desc: "Guarda tu historial, sube fotos y gana insignias por cada destino visitado.",
      },
    ],
    stats: [],
    success: {
      title: "¡Ya eres fundador!",
      body: "Tu badge te está esperando. Te escribimos antes que a nadie cuando la app esté lista.",
    },
  },

  negocio: {
    eyebrow: "Para negocios",
    eyebrowIcon: "storefront",
    headline: "Pon tu negocio en el mapa",
    headlineAccent: "antes que nadie",
    sub: "Regístralo hoy y entras al lanzamiento con perfil destacado. Sin costo y sin compromiso.",
    perksTitle: "Lo que te llevas por entrar ahora",
    perks: [
      {
        icon: "star",
        title: "Perfil destacado gratis",
        desc: "Los primeros meses tras el lanzamiento apareces destacado, sin pagar nada.",
      },
      {
        icon: "rocket_launch",
        title: "Acceso anticipado al panel",
        desc: "Dejas tus fotos, horarios y contacto listos antes de que lleguen los primeros viajeros.",
      },
      {
        icon: "support_agent",
        title: "Te ayudamos a montarlo",
        desc: "Nos sentamos contigo a configurar tu perfil. No tienes que hacerlo solo.",
      },
    ],
    featuresTitle: "Qué hace ConoceRD por tu negocio",
    features: [
      {
        icon: "visibility",
        title: "Más visibilidad ante viajeros reales",
        desc: "Perfil digital con fotos, reseñas y contacto directo.",
      },
      {
        icon: "insights",
        title: "Decisiones basadas en datos",
        desc: "Visitas, flujo de clientes y procedencia, en tiempo real.",
      },
      {
        icon: "chat",
        title: "Contacto directo, sin intermediarios",
        desc: "El viajero te escribe por WhatsApp o Instagram. Nadie se queda con parte de la venta.",
      },
      {
        icon: "qr_code_2",
        title: "Trato especial con QR",
        desc: "Reconoce a tus clientes de ConoceRD al escanear y prémialos.",
      },
    ],
    stats: [
      { value: "74.6%", label: "de los negocios quiere aparecer en la app", color: "#B23410" },
      { value: "60.6%", label: "aún depende sólo del boca a boca", color: "#985409" },
    ],
    success: {
      title: "¡Tu negocio está dentro!",
      body: "Te contactamos para dejar tu perfil listo antes del lanzamiento.",
    },
  },
};

/** Cuenta de Instagram a la que empujamos después del registro. */
export const INSTAGRAM = {
  handle: "@conocerd.app",
  url: "https://instagram.com/conocerd.app",
};
