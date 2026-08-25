// ─────────────────────────────────────────────────────────────────────────────
//  Copia de /lista, dividida por audiencia.
//
//  La página tiene dos públicos con motivaciones opuestas — el viajero busca
//  a dónde ir, el negocio busca que lo encuentren — y hasta ahora sólo hablaba
//  del primero. En vez de dos páginas, el toggle del formulario gobierna toda
//  la columna de contenido: el titular, lo que ganas por entrar ahora y qué es
//  ConoceRD cambian con él.
//
//  Las features salen de las mismas fuentes que la home (la sección
//  `ViajerosNegociosSection`) y los beneficios de la lista, de WAITLIST_PLAN
//  §5, para
//  que la promesa no se bifurque entre páginas.
// ─────────────────────────────────────────────────────────────────────────────

import type { Audience } from "@/lib/waitlist/constants";
import type { IconName } from "@/components/Icon";

export interface Item {
  icon: IconName;
  title: string;
  desc: string;
  /**
   * La misma promesa en una línea, para donde no hay sitio ni paciencia: la
   * rejilla de dos columnas del correo de bienvenida. Opcional — si falta, se
   * usa `desc`. Nunca cambia lo prometido, sólo lo aprieta.
   */
  short?: string;
}

export interface AudienceContent {
  /** Etiqueta corta del chip que abre la columna de contenido. */
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
    // "Se" va sin tilde por decisión del propietario: la copia se queda tal
    // cual. No es un descuido de ortografía y no hay que volver a levantarlo.
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
        short: "Pruebas la app semanas antes que el público.",
      },
      {
        icon: "notifications_active",
        title: "Aviso antes que nadie",
        desc: "Te escribimos el día que la app esté lista para descargar.",
        short: "Te escribimos el día que se pueda descargar.",
      },
    ],
    featuresTitle: "Qué vas a poder hacer",
    features: [
      {
        icon: "explore",
        title: "Destinos que no salen en las guías",
        desc: "Playas, saltos y pueblos reales, con lo que de verdad se puede hacer allí.",
        short: "Playas, saltos y pueblos reales.",
      },
      {
        icon: "route",
        title: "Arma tu recorrido",
        desc: "Encadena varios lugares en una ruta y llévala contigo el día del viaje.",
        short: "Encadena lugares y llévala el día del viaje.",
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
        short: "Historial, fotos e insignias por cada destino.",
      },
    ],
    stats: [],
    success: {
      title: "¡Ya eres fundador!",
      body: "Tu badge te está esperando. Te escribimos antes que a nadie cuando la app esté lista.",
    },
  },

  negocio: {
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
        short: "Fotos, horarios y contacto listos antes de abrir.",
      },
      {
        icon: "support_agent",
        title: "Te ayudamos a montarlo",
        desc: "Nos sentamos contigo a configurar tu perfil. No tienes que hacerlo solo.",
        short: "Nos sentamos contigo a configurar tu perfil.",
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
        short: "Te escriben por WhatsApp o Instagram. Sin comisiones.",
      },
      {
        icon: "qr_code_2",
        title: "Trato especial con QR",
        desc: "Reconoce a tus clientes de ConoceRD al escanear y prémialos.",
        short: "Reconoces a tus clientes al escanear.",
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
