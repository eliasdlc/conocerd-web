// ─────────────────────────────────────────────────────────────────────────────
//  Qué teselas calentar, y cuándo.
//
//  Quien entra por primera vez descarga cada destino en el momento en que la
//  cámara llega, y por eso el primer pase se siente a tirones y el segundo no.
//  Esto trae de antemano las teselas de los keyframes para que el primer pase
//  ya salga del disco.
//
//  Arranca cuando el mapa termina de pintar lo que la persona mira, nunca
//  antes. Se probó a calentar también el encuadre del hero durante la
//  hidratación y se midió al revés de lo esperado: el primer píxel empeoraba de
//  2572 a 2995 ms con perfil de teléfono, porque en 4G esas descargas retrasan
//  el chunk de MapLibre. En un enlace estrecho no existe la precarga cortés,
//  sólo la precarga a destiempo.
// ─────────────────────────────────────────────────────────────────────────────

import { cameraForBand, SCENE_BANDS, type JourneyViewport } from "@/lib/journey";
import { calentadorSaltado } from "@/lib/medicion";
import {
  plantillasDeTesela,
  teselasDeEncuadre,
  tocaRD,
  traerTeselas,
  unicas,
  urlDeTesela,
  type Tesela,
} from "@/lib/calentarTeselas";

/**
 * Teselas de los keyframes del recorrido, sobre República Dominicana.
 *
 * Se toma el nivel de cada escena y su padre, no sólo el nivel exacto: entre
 * dos destinos la cámara baja de 2,4 a 2,9 niveles de zoom antes de volver a
 * subir, así que el nivel de arriba también se pide durante el vuelo. Se filtra
 * a RD porque el recorrido no sale de la isla salvo en el globo del hero y el
 * del cierre, que ya están cubiertos por la otra fase.
 */
export function teselasDelRecorrido(v: JourneyViewport): Tesela[] {
  const out: Tesela[] = [];
  for (const banda of SCENE_BANDS) {
    const cam = cameraForBand(banda, v);
    for (const salto of [0, 1]) {
      const zoom = cam.zoom - salto;
      if (zoom < 3) continue;
      // Sin holgura en el nivel de la escena y con una tesela de holgura en el
      // padre. El margen en el nivel profundo casi triplicaba el conjunto: a
      // z11 traia 109 teselas y el mapa nunca pedia 51, o sea 269 KB tirados.
      // En el padre las teselas son cuatro veces menos y cubren el arco de
      // vuelo, asi que ahi la holgura se paga sola.
      out.push(...teselasDeEncuadre(cam.center, zoom, v.width, v.height, salto));
    }
  }
  return unicas(out).filter(tocaRD);
}

async function calentar(teselas: Tesela[], señal?: AbortSignal, concurrencia = 4) {
  if (!teselas.length) return 0;
  const plantillas = await plantillasDeTesela(señal);
  return traerTeselas(teselas.map((t) => urlDeTesela(plantillas, t)), { concurrencia, señal });
}

/**
 * `true` cuando el navegador dice que no conviene gastar datos: el ahorro de
 * datos está puesto, o la conexión es de las lentas. Calentar el recorrido son
 * del orden de 1,8 MB, y eso no se le impone a nadie que haya dicho que no.
 */
function motivoParaNoGastar(): string | null {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
  };
  const c = nav.connection;
  if (!c) return null;
  if (c.saveData) return "ahorro de datos activado";
  if (c.effectiveType === "2g" || c.effectiveType === "slow-2g") return `conexion ${c.effectiveType}`;
  // Medido en un telefono real: `effectiveType` decia 4g con 0,35 Mbps de
  // bajada. Los 2 MB del calentador ahi son casi un minuto de descarga
  // compitiendo con lo que la persona esta mirando, asi que la etiqueta no
  // basta y hay que mirar el ancho de banda.
  if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink < 1.5) {
    return `bajada de ${c.downlink} Mbps`;
  }
  return null;
}

/**
 * Se lanza cuando el mapa ya terminó de pintar lo que la persona mira, con
 * concurrencia 2 para no competir por la conexión con las teselas del encuadre
 * actual. Devuelve cuántas teselas quedaron en caché.
 */
export const calentarRecorrido = (v: JourneyViewport, señal?: AbortSignal) => {
  const ahorro = motivoParaNoGastar();
  if (ahorro) {
    calentadorSaltado(ahorro);
    return Promise.resolve(0);
  }
  return calentar(teselasDelRecorrido(v), señal, 2);
};
