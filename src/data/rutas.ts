// Los tres viajes recomendados de Tu ruta. Viven aquí y no dentro de la
// sección porque también los necesita el servidor: la URL de una ruta armada
// (`/ruta/<slug>`) reconoce estos tres por sus paradas y les pone su nombre en
// el título y en la imagen que WhatsApp enseña.

export type Preset = {
  id: string;
  name: string;
  tagline: string;
  /** id del destino cuya foto ilustra la carta */
  cover: string;
  stops: string[];
};

// El orden de paradas está pensado como se maneja de verdad (los km de la
// matriz lo confirman), no en el orden en que se nombran los lugares.
export const PRESETS: Preset[] = [
  {
    id: "sur",
    name: "Sur salvaje",
    tagline: "Playa virgen, costa y lago",
    cover: "aguilas",
    stops: ["aguilas", "barahona", "lago-enriquillo"],
  },
  {
    id: "samana",
    name: "Samaná completo",
    tagline: "Cascada, playas y Los Haitises",
    cover: "limon",
    stops: ["las-terrenas", "limon", "playa-rincon", "playa-fronton", "haitises"],
  },
  {
    id: "cibao",
    name: "Cibao aventurero",
    tagline: "Charcos, kite y montaña",
    cover: "charcos",
    stops: ["charcos", "cabarete", "jarabacoa", "constanza"],
  },
];
