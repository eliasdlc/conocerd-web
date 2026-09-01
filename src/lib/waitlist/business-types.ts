// ─────────────────────────────────────────────────────────────────────────────
//  Vocabulario de tipos de negocio y lugar de la lista de espera.
//
//  Es un subconjunto turístico del eje funcional de la app
//  (`place_type.dart`, 45 tipos): mismo slug y misma idea, para que un registro
//  de /lista entre al catálogo sin tabla de traducción. Un subconjunto no rompe
//  ese vocabulario cerrado — todo lo que guardamos aquí sigue siendo un
//  `placeType` válido allá.
//
//  Fuera quedan los tipos que la app tiene porque un viajero los busca en
//  carretera (gasolinera, banco, cajero, remesas, clínica, hospital, policía,
//  taller, gomera, supermercado, farmacia) y la infraestructura pública que
//  nadie registra (parqueo, terminal, aeropuerto, puerto, área de descanso,
//  baño público). /lista es un formulario de registro con una oferta detrás:
//  nadie pide perfil destacado en una app de turismo desde una clínica. Colmado
//  y mercado también salen. Lo que no encaja entra por `otro` y su texto se
//  guarda en `businessTypeOther`.
//
//  `tour` y `transporte` no existen en la app: son servicios, no lugares, y no
//  se pintan en el mapa. Ya eran slugs de la web desde el primer día.
//
//  Sin zod, igual que `constants.ts` y por lo mismo: estas listas viajan al
//  navegador y el validador pesa 278 KB.
// ─────────────────────────────────────────────────────────────────────────────

type CatalogEntry = {
  readonly slug: string;
  readonly label: string;
  /**
   * Cómo lo llama la gente cuando no usa la etiqueta. Es lo único que hace útil
   * al buscador: nadie escribe "Cascada", escribe "salto". Se comparan
   * normalizados (sin acentos, en minúscula), así que se escriben sin acento.
   * Vacío cuando la etiqueta es la única forma de nombrarlo.
   */
  readonly aliases: readonly string[];
};

type CatalogGroup = {
  readonly key: string;
  readonly label: string;
  readonly types: readonly CatalogEntry[];
};

/** El catálogo, en el orden en que lo pinta el selector. */
export const BUSINESS_TYPE_GROUPS = [
  {
    key: "comida",
    label: "Comida y bebida",
    types: [
      {
        slug: "restaurante",
        label: "Restaurante",
        aliases: ["restaurant", "pica pollo", "picapollo", "marisqueria", "pizzeria", "asadero", "parrillada", "comida"],
      },
      {
        slug: "comedor",
        label: "Comedor",
        aliases: ["comida criolla", "almuerzo", "bufet", "buffet", "cocina economica"],
      },
      { slug: "cafeteria", label: "Cafetería", aliases: ["cafe", "coffee shop", "brunch"] },
      { slug: "bar", label: "Bar", aliases: ["discoteca", "terraza", "cerveceria", "pub", "night club", "licores"] },
      {
        slug: "panaderia",
        label: "Panadería",
        aliases: ["pan", "reposteria", "pasteleria", "bizcochos", "dulceria"],
      },
      { slug: "heladeria", label: "Heladería", aliases: ["helados", "paletas", "yogurt helado"] },
      {
        slug: "puesto_carretera",
        label: "Puesto de carretera",
        aliases: ["chimi", "chimichurri", "friquitin", "fritura", "kiosco", "food truck"],
      },
    ],
  },
  {
    key: "alojamiento",
    label: "Alojamiento",
    types: [
      {
        slug: "hotel",
        label: "Hotel",
        aliases: ["hospedaje", "resort", "hostal", "posada", "motel", "airbnb", "apartahotel", "aparta hotel", "villa", "alojamiento", "hostel", "guest house"],
      },
      { slug: "cabana", label: "Cabaña", aliases: ["eco lodge", "lodge", "casa de campo", "rancho"] },
      { slug: "camping", label: "Camping", aliases: ["glamping", "acampada"] },
    ],
  },
  {
    key: "tours",
    label: "Tours y traslados",
    types: [
      {
        slug: "tour",
        label: "Tour operador",
        aliases: ["excursion", "excursiones", "agencia de viajes", "guia turistico", "paseo en bote", "buceo", "snorkel", "tirolesa", "experiencia"],
      },
      {
        slug: "transporte",
        label: "Transporte",
        aliases: ["taxi", "motoconcho", "rent a car", "alquiler de vehiculos", "traslado", "transfer", "chofer", "guagua turistica"],
      },
    ],
  },
  {
    key: "turistico",
    label: "Turismo y naturaleza",
    types: [
      {
        slug: "atraccion",
        label: "Atracción",
        aliases: ["parque tematico", "zoologico", "acuario", "centro de visitantes"],
      },
      { slug: "mirador", label: "Mirador", aliases: ["vista panoramica", "viewpoint"] },
      { slug: "playa", label: "Playa", aliases: ["club de playa"] },
      {
        slug: "balneario",
        label: "Balneario",
        aliases: ["charco", "poza", "aguas termales", "piscina natural", "hoyo"],
      },
      { slug: "rio", label: "Río", aliases: [] },
      { slug: "laguna", label: "Laguna", aliases: ["lago"] },
      { slug: "parque", label: "Parque", aliases: ["plaza publica", "parque nacional"] },
      { slug: "museo", label: "Museo", aliases: ["galeria", "casa museo"] },
      {
        slug: "monumento",
        label: "Monumento",
        aliases: ["iglesia", "catedral", "faro", "ruinas", "fortaleza"],
      },
      { slug: "cascada", label: "Cascada", aliases: ["salto", "chorro"] },
      { slug: "cueva", label: "Cueva", aliases: ["caverna"] },
      { slug: "finca", label: "Finca", aliases: ["hacienda", "agroturismo", "cacao", "plantacion"] },
      { slug: "sendero", label: "Sendero", aliases: ["trail", "senderismo", "camino", "ruta de montana"] },
    ],
  },
  {
    key: "compras",
    label: "Compras y artesanía",
    types: [
      {
        slug: "tienda",
        label: "Tienda o artesanía",
        aliases: ["boutique", "artesania", "souvenir", "ropa", "regalos", "gift shop", "bazar"],
      },
    ],
  },
  {
    key: "otro",
    label: "Otro",
    types: [{ slug: "otro", label: "Otro", aliases: [] }],
  },
] as const satisfies readonly CatalogGroup[];

export type BusinessType = (typeof BUSINESS_TYPE_GROUPS)[number]["types"][number]["slug"];

/** Valor de escape: lo que no está en el catálogo. Su texto va aparte. */
export const OTHER_BUSINESS_TYPE = "otro" satisfies BusinessType;

/** Tope del texto libre que acompaña a `otro`, en el cliente y en el esquema. */
export const BUSINESS_TYPE_OTHER_MAX = 60;

// ─── Índices ──────────────────────────────────────────────────────────────────
// Se arman una vez recorriendo el catálogo. El bucle evita `.map` sobre la
// unión de tuplas que produce `as const`, que TypeScript no sabe llamar.

const slugs: BusinessType[] = [];
const labelOf = new Map<string, string>();
/** Clave normalizada (etiqueta, sinónimo o el propio slug) al tipo que resuelve. */
const bySearchKey = new Map<string, BusinessType>();

for (const group of BUSINESS_TYPE_GROUPS) {
  for (const type of group.types) {
    slugs.push(type.slug);
    labelOf.set(type.slug, type.label);
    bySearchKey.set(type.slug, type.slug);
    bySearchKey.set(normalize(type.label), type.slug);
    for (const alias of type.aliases) bySearchKey.set(normalize(alias), type.slug);
  }
}

/** Todos los tipos que ofrece el selector, aplanados. Vocabulario cerrado. */
export const BUSINESS_TYPES: readonly BusinessType[] = slugs;

/**
 * Etiquetas de slugs que salieron del selector pero siguen en filas guardadas.
 * Sin esto el panel y el CSV los muestran crudos.
 */
const LEGACY_LABELS: Record<string, string> = {
  hospedaje: "Hospedaje",
};

/**
 * Etiqueta legible de un tipo guardado. Un slug que no conocemos se muestra tal
 * cual: hace visible un dato malo en vez de esconderlo.
 */
export function businessTypeLabel(value: string): string {
  return labelOf.get(value) ?? LEGACY_LABELS[value] ?? value;
}

/**
 * Forma con la que se compara todo: minúsculas, sin acentos y sin espacios de
 * sobra. "Cafetería", "cafeteria" y " CAFETERIA " son la misma búsqueda.
 */
function normalize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * El tipo que corresponde a lo escrito, si lo escrito ES una etiqueta, un
 * sinónimo o un slug. Coincidencia exacta a propósito: "cafe" resuelve a
 * Cafetería porque es su sinónimo, pero "cafe de la esquina" no resuelve nada
 * y termina en `otro` con su texto.
 */
export function resolveBusinessType(raw: string): BusinessType | undefined {
  return bySearchKey.get(normalize(raw));
}

/**
 * Si lo escrito empieza una palabra del texto. Buscar por subcadena suelta
 * traía "Restaurante" al escribir "ca", por el sinónimo "pica pollo"; el
 * resultado se lee como un error del buscador aunque técnicamente coincida.
 */
function startsWord(text: string, query: string): boolean {
  return text.startsWith(query) || text.includes(` ${query}`);
}

export interface BusinessTypeMatch {
  slug: BusinessType;
  label: string;
  /** El sinónimo que produjo la coincidencia; ausente si fue la etiqueta. */
  alias?: string;
}

export interface BusinessTypeGroupMatches {
  key: string;
  label: string;
  matches: BusinessTypeMatch[];
}

/**
 * Resultados del buscador, agrupados y en el orden del catálogo. Una consulta
 * vacía devuelve el catálogo entero, que es lo que ve quien abre el campo sin
 * escribir. Los grupos sin coincidencias no se devuelven.
 */
export function searchBusinessTypes(query: string): BusinessTypeGroupMatches[] {
  const q = normalize(query);
  const groups: BusinessTypeGroupMatches[] = [];

  for (const group of BUSINESS_TYPE_GROUPS) {
    const matches: BusinessTypeMatch[] = [];
    for (const type of group.types) {
      if (!q || startsWord(normalize(type.label), q)) {
        matches.push({ slug: type.slug, label: type.label });
        continue;
      }
      const alias = type.aliases.find((a) => startsWord(normalize(a), q));
      if (alias) matches.push({ slug: type.slug, label: type.label, alias });
    }
    if (matches.length) groups.push({ key: group.key, label: group.label, matches });
  }

  return groups;
}
