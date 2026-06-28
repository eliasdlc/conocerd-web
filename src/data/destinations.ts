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
// texto/ícono sobre fondo claro. Íconos = Material Symbols (alineados con la app).

export type CategoryMeta = {
  label: string;
  icon: string;
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

export const DESTINATIONS: Destination[] = [
  // ── Featured (journey de polaroids) ──────────────────────────────────────
  {
    id: "aguilas",
    name: "Bahía de las Águilas",
    province: "Pedernales",
    coords: [-71.77, 17.89],
    category: "playa",
    image: "/assets/ph-playa.png",
    activities: ["Snorkel", "Paseo en bote", "Fotografía"],
    rating: 4.9,
    desc: "8 km de arena sin un solo edificio.",
    featured: true,
    featuredOrder: 0,
    meta: "Pedernales · 17.88°N",
    tagline: "Playa virgen",
    rotate: -4,
  },
  {
    id: "duarte",
    name: "Pico Duarte",
    province: "La Vega",
    coords: [-70.99, 19.05],
    category: "aventura",
    image: "/assets/ph-montana.png",
    activities: ["Senderismo", "Camping", "Avistamiento"],
    rating: 4.8,
    desc: "El techo del Caribe, a tu alcance.",
    featured: true,
    featuredOrder: 1,
    meta: "La Vega · 3,098 m",
    tagline: "Montaña",
    rotate: 3,
  },
  {
    id: "limon",
    name: "Salto El Limón",
    province: "Samaná",
    coords: [-69.58, 19.15],
    category: "naturaleza",
    image: "/assets/ph-cascada.png",
    activities: ["Cabalgata", "Baño", "Senderismo"],
    rating: 4.7,
    desc: "A caballo entre montañas verdes.",
    featured: true,
    featuredOrder: 2,
    meta: "Samaná · 40 m",
    tagline: "Cascada",
    rotate: -2,
  },
  {
    id: "charcos",
    name: "27 Charcos",
    province: "Puerto Plata",
    coords: [-70.58, 19.62],
    category: "aventura",
    image: "/assets/ph-rio.png",
    activities: ["Saltos", "Natación", "Rappel"],
    rating: 4.8,
    desc: "Salta y nada entre cascadas turquesa.",
    featured: true,
    featuredOrder: 3,
    meta: "Puerto Plata · Damajagua",
    tagline: "Ecoturismo",
    rotate: 4,
  },
  {
    id: "constanza",
    name: "Constanza",
    province: "La Vega",
    coords: [-70.72, 18.91],
    category: "naturaleza",
    image: "/assets/ph-pueblo.png",
    activities: ["Senderismo", "Granjas", "Miradores"],
    rating: 4.6,
    desc: "Clima fresco, fresas y pinares.",
    featured: true,
    featuredOrder: 4,
    meta: "La Vega · 1,200 m",
    tagline: "Pueblo & valle",
    rotate: -3,
  },
  {
    id: "haitises",
    name: "Los Haitises",
    province: "Samaná",
    coords: [-69.66, 19.13],
    category: "naturaleza",
    image: "/assets/ph-sunset.png",
    activities: ["Kayak", "Cuevas", "Avistamiento de aves"],
    rating: 4.7,
    desc: "Manglares, cuevas y cayos en bote.",
    featured: true,
    featuredOrder: 5,
    meta: "Samaná · Parque Nacional",
    tagline: "Naturaleza",
    rotate: 2,
  },

  // ── Resto del mapa "Arma tu recorrido" ───────────────────────────────────
  {
    id: "playa-rincon",
    name: "Playa Rincón",
    province: "Samaná",
    coords: [-69.55, 19.33],
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
    coords: [-69.47, 19.38],
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
    coords: [-69.54, 19.30],
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
    coords: [-71.10, 18.21],
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
    coords: [-71.62, 18.48],
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
    coords: [-70.70, 19.45],
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
    coords: [-68.97, 18.43],
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
    coords: [-69.89, 18.47],
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
    coords: [-68.97, 18.42],
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
    coords: [-70.69, 19.79],
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
    coords: [-70.40, 19.76],
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
    coords: [-70.64, 19.11],
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

export const SCENE_CAMERAS: Record<string, Viewport> = {
  "destinos-intro": { center: [-70.35, 18.85], zoom: 7.2, pitch: 0, bearing: 0 },
  "polaroid-0": { center: [-71.77, 17.89], zoom: 11.5, pitch: 45, bearing: -20 },
  "polaroid-1": { center: [-70.99, 19.05], zoom: 10.5, pitch: 50, bearing: 15 },
  "polaroid-2": { center: [-69.58, 19.15], zoom: 11.0, pitch: 40, bearing: 5 },
  "polaroid-3": { center: [-70.58, 19.62], zoom: 11.5, pitch: 35, bearing: -10 },
  "polaroid-4": { center: [-70.72, 18.91], zoom: 11.5, pitch: 50, bearing: 20 },
  "polaroid-5": { center: [-69.66, 19.13], zoom: 11.0, pitch: 30, bearing: 0 },
  "destinos-finale": { center: [-70.35, 18.85], zoom: 7.2, pitch: 0, bearing: 0 },
  mapa: { center: [-70.35, 18.85], zoom: 7.2, pitch: 0, bearing: 0 },
  viajeros: { center: [-70.35, 18.85], zoom: 6.5, pitch: 0, bearing: 0 },
  negocios: { center: [-70.30, 19.00], zoom: 8.5, pitch: 20, bearing: 0 },
  equipo: { center: [-70.6901, 19.4517], zoom: 12.5, pitch: 30, bearing: 5 },
  cta: { center: [-69.0, 17.0], zoom: 3.5, pitch: 15, bearing: -5 },
};
