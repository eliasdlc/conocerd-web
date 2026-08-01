import type { IconName } from "@/components/Icon";
// ─────────────────────────────────────────────────────────────────────────────
//  Fuente de verdad única de datos geográficos de ConoceRD (#5).
//
//  Antes los destinos estaban duplicados en DestinosOverlay (POLAROIDS) y
//  MapaOverlay (MAP_PINS), y las cámaras en MapScrollJourney (LOCATIONS). Todo
//  vive aquí ahora: overlays, sistema de pines, constructor de ruta y motor de
//  scroll leen de este archivo. Editar una coordenada = un solo lugar.
// ─────────────────────────────────────────────────────────────────────────────

export type Category =
  | "playa"
  | "naturaleza"
  | "cultura"
  | "gastronomia"
  | "aventura";

export type Destination = {
  id: string;
  name: string;
  province: string;
  coords: [number, number]; // [lng, lat]
  category: Category;
  image: string; // /assets/ph-*.png
  activities: string[];
  rating: number; // 0–5
  desc: string;
  /** Aparece en el journey de polaroids (Destinos). El orden lo da `featuredOrder`. */
  featured?: boolean;
  /** Orden dentro del journey de polaroids (0..5). Solo en destinos `featured`. */
  featuredOrder?: number;
  /** Línea secundaria estilo polaroid: "Pedernales · 3,098 m". */
  meta?: string;
  /** Chip corto de la polaroid: "Playa virgen". */
  tagline?: string;
  /** Rotación visual de la polaroid en grados (presentación). */
  rotate?: number;
};

// ─── Presentación por categoría ───────────────────────────────────────────────
// Único lugar para color/ícono/label de cada categoría. `color` = hue de marca
// (relleno de pin + tinte de chip). `ink` = variante accesible WCAG AA solo para
// texto/ícono sobre fondo claro. `icon` se valida contra el set de `Icon`.

export type CategoryMeta = {
  label: string;
  icon: IconName;
  color: string;
  ink: string;
};

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  playa: { label: "Playas", icon: "beach_access", color: "#25CCB8", ink: "#0C6A60" },
  naturaleza: { label: "Naturaleza", icon: "forest", color: "#4CAF50", ink: "#2E7D32" },
  gastronomia: { label: "Gastro", icon: "restaurant", color: "#F76C4D", ink: "#B23410" },
  cultura: { label: "Cultura", icon: "account_balance", color: "#2D9CDB", ink: "#1F6FA8" },
  aventura: { label: "Aventura", icon: "hiking", color: "#FF8D16", ink: "#985409" },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

// ─── Destinos ─────────────────────────────────────────────────────────────────
// Los 6 primeros (`featured`) son los que recorre el journey de polaroids, en
// el orden de `featuredOrder`. El resto puebla el mapa "Arma tu recorrido".

// Coordenadas verificadas contra OpenStreetMap/Nominatim (jul 2026): la cámara
// aterriza en el lugar real, no en una aproximación. El `meta` de cada polaroid
// es un dato cierto del lugar (parque, altura, municipio), no una coordenada.
export const DESTINATIONS: Destination[] = [
  // ── Featured (journey de polaroids) ──────────────────────────────────────
  {
    id: "aguilas",
    name: "Bahía de las Águilas",
    province: "Pedernales",
    coords: [-71.7013, 17.8207],
    category: "playa",
    image: "/assets/destino-aguilas.webp",
    activities: ["Snorkel", "Paseo en bote", "Fotografía"],
    rating: 4.9,
    desc: "8 km de arena sin un solo edificio.",
    featured: true,
    featuredOrder: 0,
    meta: "P. N. Jaragua, Pedernales",
    tagline: "Playa virgen",
    rotate: -4,
  },
  {
    id: "duarte",
    name: "Pico Duarte",
    province: "Santiago",
    coords: [-70.998, 19.023],
    category: "aventura",
    image: "/assets/destino-duarte.webp",
    activities: ["Senderismo", "Camping", "Avistamiento"],
    rating: 4.8,
    desc: "El techo del Caribe, a tu alcance.",
    featured: true,
    featuredOrder: 1,
    meta: "Cordillera Central · 3,087 m",
    tagline: "Montaña",
    rotate: 3,
  },
  {
    id: "limon",
    name: "Salto El Limón",
    province: "Samaná",
    coords: [-69.4462, 19.2703],
    category: "naturaleza",
    image: "/assets/destino-limon.webp",
    activities: ["Cabalgata", "Baño", "Senderismo"],
    rating: 4.7,
    desc: "A caballo entre montañas verdes.",
    featured: true,
    featuredOrder: 2,
    meta: "El Limón, Samaná · 40 m",
    tagline: "Cascada",
    rotate: -2,
  },
  {
    id: "charcos",
    name: "27 Charcos",
    province: "Puerto Plata",
    coords: [-70.8192, 19.7342],
    category: "aventura",
    image: "/assets/destino-charcos.webp",
    activities: ["Saltos", "Natación", "Rappel"],
    rating: 4.8,
    desc: "Salta y nada entre cascadas turquesa.",
    featured: true,
    featuredOrder: 3,
    meta: "Damajagua, Imbert",
    tagline: "Ecoturismo",
    rotate: 4,
  },
  {
    id: "constanza",
    name: "Constanza",
    province: "La Vega",
    coords: [-70.6913, 18.8651],
    category: "naturaleza",
    image: "/assets/destino-constanza.webp",
    activities: ["Senderismo", "Granjas", "Miradores"],
    rating: 4.6,
    desc: "Clima fresco, fresas y pinares.",
    featured: true,
    featuredOrder: 4,
    meta: "Valle de Constanza · 1,200 m",
    tagline: "Pueblo & valle",
    rotate: -3,
  },
  {
    id: "haitises",
    name: "Los Haitises",
    province: "Samaná",
    coords: [-69.6037, 18.9941],
    category: "naturaleza",
    image: "/assets/destino-haitises.webp",
    activities: ["Kayak", "Cuevas", "Avistamiento de aves"],
    rating: 4.7,
    desc: "Manglares, cuevas y cayos en bote.",
    featured: true,
    featuredOrder: 5,
    meta: "Bahía de San Lorenzo",
    tagline: "Naturaleza",
    rotate: 2,
  },

  // ── Resto del mapa "Arma tu recorrido" ───────────────────────────────────
  {
    id: "playa-rincon",
    name: "Playa Rincón",
    province: "Samaná",
    coords: [-69.2518, 19.2911],
    category: "playa",
    image: "/assets/ph-playa.png",
    activities: ["Baño", "Snorkel", "Fotografía"],
    rating: 4.8,
    desc: "Una de las playas más bellas del Caribe.",
  },
  {
    id: "playa-fronton",
    name: "Playa Frontón",
    province: "Samaná",
    coords: [-69.1516, 19.2972],
    category: "playa",
    image: "/assets/ph-playa.png",
    activities: ["Senderismo", "Snorkel", "Escalada"],
    rating: 4.7,
    desc: "Acantilados y arena solo accesible en bote.",
  },
  {
    id: "las-terrenas",
    name: "Las Terrenas",
    province: "Samaná",
    coords: [-69.5431, 19.311],
    category: "playa",
    image: "/assets/ph-playa.png",
    activities: ["Playa", "Gastronomía", "Atardecer"],
    rating: 4.6,
    desc: "Pueblo costero con sabor europeo.",
  },
  {
    id: "barahona",
    name: "Barahona",
    province: "Barahona",
    coords: [-71.1004, 18.2085],
    category: "playa",
    image: "/assets/ph-playa.png",
    activities: ["Playa de piedras", "Café", "Larimar"],
    rating: 4.5,
    desc: "Costa salvaje de piedras y ecoturismo.",
  },
  {
    id: "lago-enriquillo",
    name: "Lago Enriquillo",
    province: "Independencia",
    coords: [-71.5813, 18.4854],
    category: "naturaleza",
    image: "/assets/ph-rio.png",
    activities: ["Cocodrilos", "Iguanas", "Bote"],
    rating: 4.4,
    desc: "El lago más grande del Caribe, bajo el mar.",
  },
  {
    id: "santiago",
    name: "Santiago",
    province: "Santiago",
    coords: [-70.6947, 19.4508],
    category: "gastronomia",
    image: "/assets/ph-sunset.png",
    activities: ["Gastronomía", "Monumento", "Cigarros"],
    rating: 4.5,
    desc: "Corazón del Cibao y su cultura.",
  },
  {
    id: "la-romana",
    name: "La Romana",
    province: "La Romana",
    coords: [-68.9663, 18.4227],
    category: "gastronomia",
    image: "/assets/ph-sunset.png",
    activities: ["Gastronomía", "Golf", "Marina"],
    rating: 4.4,
    desc: "Lujo, marina y sabor del este.",
  },
  {
    id: "zona-colonial",
    name: "Zona Colonial",
    province: "Santo Domingo",
    coords: [-69.8868, 18.4715],
    category: "cultura",
    image: "/assets/ph-pueblo.png",
    activities: ["Historia", "Museos", "Vida nocturna"],
    rating: 4.8,
    desc: "La primera ciudad de América.",
  },
  {
    id: "altos-chavon",
    name: "Altos de Chavón",
    province: "La Romana",
    coords: [-68.8917, 18.4213],
    category: "cultura",
    image: "/assets/ph-pueblo.png",
    activities: ["Anfiteatro", "Arte", "Miradores"],
    rating: 4.6,
    desc: "Una aldea mediterránea sobre el río Chavón.",
  },
  {
    id: "puerto-plata",
    name: "Puerto Plata",
    province: "Puerto Plata",
    coords: [-70.6933, 19.7977],
    category: "cultura",
    image: "/assets/ph-pueblo.png",
    activities: ["Teleférico", "Fortaleza", "Playa"],
    rating: 4.5,
    desc: "Casas victorianas y el monte Isabel.",
  },
  {
    id: "cabarete",
    name: "Cabarete",
    province: "Puerto Plata",
    coords: [-70.4139, 19.7496],
    category: "aventura",
    image: "/assets/ph-montana.png",
    activities: ["Kitesurf", "Surf", "Vida nocturna"],
    rating: 4.6,
    desc: "Capital del kitesurf en el Caribe.",
  },
  {
    id: "jarabacoa",
    name: "Jarabacoa",
    province: "La Vega",
    coords: [-70.6419, 19.1209],
    category: "aventura",
    image: "/assets/ph-montana.png",
    activities: ["Rafting", "Cascadas", "Parapente"],
    rating: 4.7,
    desc: "La ciudad de la eterna primavera.",
  },
];

/** Los 6 destinos del journey, ya ordenados por `featuredOrder`. */
export const FEATURED_DESTINATIONS: Destination[] = DESTINATIONS.filter(
  (d) => d.featured
).sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));

// ─── Cámaras por escena ───────────────────────────────────────────────────────
// Migra LOCATIONS + SCENE_TO_LOCATION de MapScrollJourney a un único mapa
// escena→viewport. El motor de scroll (#3) interpola entre estos keyframes.

export type Viewport = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

/**
 * Keyframe de escena. Los valores base están **autorizados para desktop**
 * (referencia 1440×900); `mobile` sobreescribe solo lo que cambia en pantallas
 * angostas. No es una derivación automática a propósito: un teléfono no es un
 * desktop encogido — a igual zoom, un viewport de 390px muestra menos de la
 * mitad de la isla, así que cada escena tiene su encuadre pensado.
 * Resolución: `resolveCamera()` (lo usa `lib/journey.ts`).
 */
export type SceneCamera = Viewport & { mobile?: Partial<Viewport> };

/** Ancho de pantalla para el que están afinados los overrides `mobile`. */
export const MOBILE_CAMERA_REF_WIDTH = 390;

export function resolveCamera(c: SceneCamera, mobile: boolean, width = MOBILE_CAMERA_REF_WIDTH): Viewport {
  if (!mobile || !c.mobile) return c;
  // "Mobile" cubre 320–899px pero cada zoom está pensado en 390: a igual zoom,
  // una tablet de 834px muestra la isla diminuta rodeada de océano vacío
  // (audit 2.4). El corrimiento log2 mantiene constante la fracción de
  // pantalla que ocupa la escena en todo el rango del breakpoint.
  const zoomShift = Math.log2(width / MOBILE_CAMERA_REF_WIDTH);
  return {
    center: c.mobile.center ?? c.center,
    zoom: (c.mobile.zoom ?? c.zoom) + zoomShift,
    pitch: c.mobile.pitch ?? c.pitch,
    bearing: c.mobile.bearing ?? c.bearing,
  };
}

// Centro de cada closeup = la coordenada real del destino: si el dato de
// arriba se corrige, la cámara aterriza en el lugar corregido sin tocar nada
// más. Sólo zoom/pitch/bearing siguen afinados a mano por escena.
const featuredCenter = (order: number): [number, number] => {
  const d = DESTINATIONS.find((x) => x.featuredOrder === order);
  if (!d) throw new Error(`No featured destination with order ${order}`);
  return d.coords;
};

// Bearings: deriva monótona y de baja amplitud a lo largo del journey
// (-20° → 10° → 0° → -20°). Antes alternaban de signo entre escenas vecinas
// (-20, 15, 5, -10, 20) y cada salto rotaba la isla en sentido contrario al
// anterior: mareante, sobre todo en móvil. Ahora la cámara "gira" siempre en
// la misma dirección dentro de un tramo.
export const SCENE_CAMERAS: Record<string, SceneCamera> = {
  // Escena 0 — vista globo del hero. El motor interpola de aquí al primer
  // polaroid ⇒ el globo baja y aterriza directo en el primer destino; la
  // escena "destinos-intro" (isla vacía con titular) se eliminó porque era
  // un frame muerto de scroll.
  // Móvil: zoom 1.15 ⇒ diámetro ≈ 512·2^z/π ≈ 360px, cabe entero en 390px de
  // ancho. Con 2.5 el globo medía 920px y se salía por los cuatro lados.
  hero: {
    center: [-70.1627, 18.7357], zoom: 2.5, pitch: 0, bearing: -20,
    mobile: { zoom: 1.15 },
  },
  // Los closeups en móvil bajan ~1.5 niveles: a z11.5 en un teléfono solo se ve
  // territorio sin rasgos (ni costa ni contorno) y el vuelo pierde referencia.
  "polaroid-0": {
    center: featuredCenter(0), zoom: 11.5, pitch: 42, bearing: -14,
    mobile: { zoom: 10.0, pitch: 30 },
  },
  "polaroid-1": {
    center: featuredCenter(1), zoom: 10.5, pitch: 46, bearing: -8,
    mobile: { zoom: 9.4, pitch: 32 },
  },
  "polaroid-2": {
    center: featuredCenter(2), zoom: 11.0, pitch: 40, bearing: -2,
    mobile: { zoom: 9.8, pitch: 28 },
  },
  "polaroid-3": {
    center: featuredCenter(3), zoom: 11.5, pitch: 38, bearing: 4,
    mobile: { zoom: 10.0, pitch: 26 },
  },
  "polaroid-4": {
    center: featuredCenter(4), zoom: 11.5, pitch: 44, bearing: 10,
    mobile: { zoom: 9.6, pitch: 30 },
  },
  "polaroid-5": {
    center: featuredCenter(5), zoom: 11.0, pitch: 34, bearing: 6,
    mobile: { zoom: 9.7, pitch: 24 },
  },
  // Pan-out del recorrido: en móvil se centra en el centroide de la ruta
  // (Águilas ↔ Los Haitises), no en el centro geográfico de la isla.
  "destinos-finale": {
    center: [-70.35, 18.85], zoom: 7.2, pitch: 0, bearing: 0,
    mobile: { center: [-70.62, 18.85], zoom: 6.2 },
  },
  // Escena interactiva: los pines se tocan con el dedo, así que en móvil se
  // acerca lo máximo que permite la isla completa para separarlos.
  mapa: {
    center: [-70.35, 18.85], zoom: 7.2, pitch: 0, bearing: 0,
    mobile: { center: [-70.45, 18.87], zoom: 6.1 },
  },
  viajeros: {
    center: [-70.35, 18.85], zoom: 6.5, pitch: 0, bearing: 0,
    mobile: { zoom: 5.1 },
  },
  // El negocio (Santiago) vive al noroeste del centro de la isla: con el centro
  // genérico quedaba pegado al borde superior, bajo el nav.
  negocios: {
    center: [-70.30, 19.00], zoom: 8.5, pitch: 18, bearing: 0,
    mobile: { center: [-70.62, 19.38], zoom: 7.2, pitch: 12 },
  },
  // Santiago de los Caballeros: la ciudad desde donde se construye ConoceRD.
  equipo: {
    center: [-70.6947, 19.4508], zoom: 12.5, pitch: 28, bearing: 6,
    mobile: { zoom: 10.8, pitch: 20 },
  },
  // Cierre = apertura: vuelve al globo con el mismo bearing del hero. El
  // journey empieza en el mundo, aterriza en RD y se despide desde el mundo.
  cta: {
    center: [-70.1627, 18.7357], zoom: 2.2, pitch: 0, bearing: -20,
    mobile: { zoom: 1.05 },
  },
};
