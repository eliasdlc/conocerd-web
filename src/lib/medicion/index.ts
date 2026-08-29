// ─────────────────────────────────────────────────────────────────────────────
//  Sonda de rendimiento en el dispositivo real.
//
//  Mide tres cosas que antes no se veían juntas: cuánto tarda la página en
//  arrancar, cuánto tarda CADA escena del recorrido en quedar lista, y cuánto
//  tarda el dispositivo en responder a cada toque. Y se identifica sola, para
//  que comparar diez corridas de cinco dispositivos no dependa de que alguien
//  recuerde cuál era cuál.
//
//  ESTÁ APAGADA salvo que la URL traiga `?medir=1`. Sin ese parámetro todo lo
//  de aquí es de coste cero y el panel ni se descarga.
//
//  Lo que sigue sin poder verse, y por eso no se reporta:
//  · Bytes de las teselas: las piden los workers y el Resource Timing del hilo
//    principal no ve sus peticiones.
//  · Si una tesela salió de caché o de red: MapLibre no emite evento al pedirla,
//    y Carto no manda `Timing-Allow-Origin`, así que sus entradas de Resource
//    Timing llegan con los tamaños en cero.
// ─────────────────────────────────────────────────────────────────────────────

import { contexto, midiendoGpu, titular, type Contexto } from "@/lib/medicion/contexto";

export type Escena = {
  escena: string;
  entra: number;
  lista: number | null;
  ms: number | null;
  teselas: number;
  fps: number | null;
  peorFotogramaMs: number | null;
  tareasLargas: number;
  msBloqueado: number;
};

export type Informe = {
  version: number;
  id: string;
  titular: string;
  contexto: Contexto;
  red: Record<string, unknown>;
  pagina: Record<string, number | null>;
  mapa: Record<string, number | null>;
  escenas: Escena[];
  interacciones: { total: number; inpMs: number | null; peores: Array<{ tipo: string; ms: number; en: string }> };
  teselas: { cargadas: number; enElArranque: number; enElRecorrido: number; ultimaCargada: number | null };
  calentador: { corrio: boolean; motivo: string; teselas: number; ms: number | null };
  bloqueo: { tareasLargas: number; msTotal: number; peorMs: number; medible: boolean };
  diagnostico: Record<string, number | string>;
};

const activa = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("medir") === "1";
export const midiendo = activa;

// ─── Estado ──────────────────────────────────────────────────────────────────

const hitos: Record<string, number> = {};
const marca = (k: string) => { if (hitos[k] === undefined) hitos[k] = Math.round(performance.now()); };

let ctx: Contexto | null = null;
const id = Math.random().toString(36).slice(2, 7);

let cargadas = 0;
let cargadasAlLlegarIdle: number | null = null;
let ultimaCargada: number | null = null;

const escenas: Escena[] = [];
let abierta: Escena | null = null;

let inp: number | null = null;
let interacciones = 0;
const peores: Array<{ tipo: string; ms: number; en: string }> = [];

let tareasLargas = 0;
let msBloqueadoTotal = 0;
let peorTareaMs = 0;
let lcp: number | null = null;
let cls = 0;

let calentador = { corrio: false, motivo: "no llego a arrancar", teselas: 0, ms: null as number | null };
let saltado = false;

// ─── Fotogramas ──────────────────────────────────────────────────────────────
// Un solo bucle, con testigo. Encadenar un rAF nuevo por transición sin parar
// los anteriores multiplica el conteo y produce cifras que parecen reales.

let testigoFrames = 0;
let frames = 0;
let peorFrame = 0;
let inicioFrames = 0;

function medirFotogramas() {
  const mio = ++testigoFrames;
  frames = 0; peorFrame = 0; inicioFrames = performance.now();
  let previo = inicioFrames;
  const paso = (t: number) => {
    if (mio !== testigoFrames) return;
    const dt = t - previo;
    previo = t;
    if (frames > 0 && dt > peorFrame) peorFrame = dt;
    frames++;
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function pararFotogramas() {
  testigoFrames++;
  const dur = performance.now() - inicioFrames;
  return {
    fps: dur > 250 && frames > 1 ? Math.round((frames / dur) * 1000) : null,
    peor: peorFrame > 0 ? Math.round(peorFrame) : null,
  };
}

// ─── Enganches ───────────────────────────────────────────────────────────────

/** Se llama en la hidratación, antes de que exista el mapa. */
export function arrancar() {
  if (!activa()) return;
  // El informe queda alcanzable desde fuera para poder conducir la pagina con
  // un automatizador y leer las mismas cifras que ve el panel. Solo con
  // `?medir=1`, igual que todo lo demas de aqui.
  (window as unknown as { __crdInforme?: () => Informe }).__crdInforme = informe;
  contexto().then((c) => { ctx = c; });

  const obs = (tipo: string, cb: (e: PerformanceEntry) => void, extra: Record<string, unknown> = {}) => {
    try {
      new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type: tipo, buffered: true, ...extra });
    } catch {
      // Firefox y Safari no traen todos los tipos; lo que falte queda en null.
    }
  };

  obs("largest-contentful-paint", (e) => { lcp = Math.round(e.startTime); });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obs("layout-shift", (e: any) => { if (!e.hadRecentInput) cls += e.value; });
  obs("longtask", (e) => {
    tareasLargas++;
    msBloqueadoTotal += e.duration;
    if (e.duration > peorTareaMs) peorTareaMs = e.duration;
    if (abierta) { abierta.tareasLargas++; abierta.msBloqueado += Math.round(e.duration); }
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obs("event", (e: any) => {
    // Sólo cuentan las entradas con `interactionId`: son toque, clic y teclado.
    // Sin este filtro un `pointerleave` del ratón daba un INP de 240 ms que no
    // corresponde a nada que nadie haya sentido.
    if (!e.interactionId) return;
    interacciones++;
    const ms = Math.round(e.duration);
    if (inp === null || ms > inp) inp = ms;
    peores.push({ tipo: e.name, ms, en: abierta?.escena ?? "arranque" });
    peores.sort((a, b) => b.ms - a.ms);
    peores.length = Math.min(peores.length, 5);
  }, { durationThreshold: 16 });

  engancharLienzo();
}

/** Cuándo MapLibre creó su contexto WebGL y cuándo dibujó por primera vez. */
function engancharLienzo() {
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipo: string, ...resto: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (getContext as any).call(this, tipo, ...resto);
    if (c && typeof tipo === "string" && tipo.startsWith("webgl") && !midiendoGpu) {
      marca("contextoWebGL");
      const proto = Object.getPrototypeOf(c);
      for (const fn of ["drawElements", "drawArrays"]) {
        const orig = proto[fn];
        if (typeof orig !== "function" || orig.__crd) continue;
        const env = function (this: unknown, ...a: unknown[]) { marca("primerDibujo"); proto[fn] = orig; return orig.apply(this, a); };
        env.__crd = true;
        proto[fn] = env;
      }
    }
    return c;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

export function marcaChunkMapa(cual: "pide" | "llega") {
  if (!activa()) return;
  marca(cual === "pide" ? "chunkPide" : "chunkLlega");
}

export function calentadorSaltado(motivo: string) {
  if (!activa()) return;
  saltado = true;
  calentador = { corrio: false, motivo, teselas: 0, ms: 0 };
}

export function calentadorTermino(teselas: number, ms: number) {
  if (!activa()) return;
  // No se pisa un salto ya marcado: `calentarRecorrido` devuelve 0 en los dos
  // casos y quien llama no puede distinguirlos.
  if (saltado) return;
  calentador = { corrio: teselas > 0, motivo: teselas > 0 ? "ok" : "corrio y no trajo nada", teselas, ms: Math.round(ms) };
}

type MapaMinimo = { on: (ev: string, cb: (e: { sourceId?: string; tile?: unknown }) => void) => void };

export function engancharMapa(map: MapaMinimo) {
  if (!activa()) return;
  map.on("data", (e) => {
    if (e.sourceId !== "carto" || !e.tile) return;
    cargadas++;
    if (abierta) abierta.teselas++;
    marca("primeraTeselaCargada");
    ultimaCargada = Math.round(performance.now());
  });
  map.on("load", () => marca("mapaLoad"));
  // `idle` es "el mapa terminó de pintar lo que se le pidió": es lo que cierra
  // cada escena, y de ahí sale cuánto tarda cada salto en quedar listo.
  map.on("idle", () => {
    marca("mapaIdle");
    if (cargadasAlLlegarIdle === null) cargadasAlLlegarIdle = cargadas;
    cerrarEscena();
  });
}

/** El recorrido avisa de cada cambio de escena. */
export function escenaCambio(nombre: string) {
  if (!activa()) return;
  cerrarEscena();
  abierta = {
    escena: nombre, entra: Math.round(performance.now()), lista: null, ms: null,
    teselas: 0, fps: null, peorFotogramaMs: null, tareasLargas: 0, msBloqueado: 0,
  };
  medirFotogramas();
}

function cerrarEscena() {
  if (!abierta) return;
  const { fps, peor } = pararFotogramas();
  abierta.lista = Math.round(performance.now());
  abierta.ms = abierta.lista - abierta.entra;
  abierta.fps = fps;
  abierta.peorFotogramaMs = peor;
  escenas.push(abierta);
  abierta = null;
}

// ─── Informe ─────────────────────────────────────────────────────────────────

/** Firefox y Safari no implementan longtask: ahí el bloqueo no es cero, es ciego. */
const soportaLongtask = () => Boolean(PerformanceObserver.supportedEntryTypes?.includes("longtask"));

const nav = () => (performance.getEntriesByType("navigation")[0] ?? null) as PerformanceNavigationTiming | null;
const pintado = (n: string) => performance.getEntriesByName(n)[0]?.startTime ?? null;

export function informe(): Informe {
  const n = nav();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (navigator as any).connection ?? {};
  const red = {
    tipo: c.effectiveType ?? null, bajadaMbps: c.downlink ?? null,
    rttMs: c.rtt ?? null, ahorroDatos: c.saveData ?? null,
  };
  const vacio: Contexto = {
    dispositivo: "midiendo", plataforma: "", navegador: "", gpu: "", viewport: "",
    dpr: 1, orientacion: "", pantalla: "", nucleos: null, memoriaGB: null,
    tactil: false, movimientoReducido: false,
  };
  const cc = ctx ?? vacio;

  return {
    version: 3,
    id,
    titular: titular(cc, red),
    contexto: cc,
    red,
    pagina: {
      respuesta: n ? Math.round(n.responseEnd) : null,
      domContentLoaded: n ? Math.round(n.domContentLoadedEventEnd) : null,
      load: n ? Math.round(n.loadEventEnd) : null,
      primerPintado: pintado("first-contentful-paint") ? Math.round(pintado("first-contentful-paint")!) : null,
      lcp,
      clsPorMil: Math.round(cls * 1000),
    },
    mapa: {
      chunkPide: hitos.chunkPide ?? null,
      chunkLlega: hitos.chunkLlega ?? null,
      construccion: hitos.contextoWebGL ?? null,
      primerDibujo: hitos.primerDibujo ?? null,
      load: hitos.mapaLoad ?? null,
      primerEncuadre: hitos.mapaIdle ?? null,
    },
    escenas: [...escenas, ...(abierta ? [abierta] : [])],
    interacciones: { total: interacciones, inpMs: inp, peores: [...peores] },
    teselas: {
      cargadas,
      enElArranque: cargadasAlLlegarIdle ?? cargadas,
      enElRecorrido: cargadas - (cargadasAlLlegarIdle ?? cargadas),
      ultimaCargada,
    },
    calentador,
    bloqueo: soportaLongtask()
      ? { tareasLargas, msTotal: Math.round(msBloqueadoTotal), peorMs: Math.round(peorTareaMs), medible: true }
      : { tareasLargas: 0, msTotal: 0, peorMs: 0, medible: false },
    diagnostico: {
      recursosVistos: performance.getEntriesByType("resource").length,
      escenasCerradas: escenas.length,
      soporteLongtask: PerformanceObserver.supportedEntryTypes?.includes("longtask") ? 1 : 0,
      soporteEvent: PerformanceObserver.supportedEntryTypes?.includes("event") ? 1 : 0,
    },
  };
}
