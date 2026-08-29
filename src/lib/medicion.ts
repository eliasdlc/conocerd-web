// ─────────────────────────────────────────────────────────────────────────────
//  Sonda de medición en el propio teléfono.
//
//  Existe porque todo lo que se midió del arranque del mapa fue con red y CPU
//  emuladas en un servidor de laboratorio. Eso da el orden de magnitud correcto
//  pero no es la radio de nadie ni el SoC de nadie. Esta sonda corre en el
//  dispositivo real, sobre la red real, y no necesita cable ni consola.
//
//  ESTÁ APAGADA salvo que la URL traiga `?medir=1`. Sin ese parámetro todas las
//  funciones de aquí son de coste cero y el panel no entra en el bundle.
//
//  Lo que esta sonda NO puede ver, y por eso no lo reporta:
//  · Bytes de las teselas. Las piden los workers de MapLibre y el Resource
//    Timing del hilo principal no ve sus peticiones.
//  · Si una tesela salió del disco o de la red, ni cuánto tardó. MapLibre no
//    emite un evento por tesela pedida, sólo por tesela cargada, así que no hay
//    de dónde restar. Y tampoco sirve el Resource Timing: Carto no manda
//    `Timing-Allow-Origin`, así que sus entradas llegan con todos los tamaños
//    en cero. Eso se comprueba en un `curl -sI` a cualquier tesela. Lo que sí
//    se ve es cuántas cargó y cuándo.
//  · El instante exacto en que el mapa "se ve". Se reporta el primer dibujo de
//    WebGL, que es lo más cerca que se llega sin capturar la pantalla.
// ─────────────────────────────────────────────────────────────────────────────

export type Medicion = {
  version: number;
  url: string;
  dispositivo: Record<string, unknown>;
  red: Record<string, unknown>;
  pagina: Record<string, number | null>;
  mapa: Record<string, number | null>;
  teselas: {
    cargadas: number;
    enElArranque: number;
    enElRecorrido: number;
    primeraCargada: number | null;
    ultimaCargada: number | null;
  };
  calentador: { teselas: number; ms: number | null };
  recursos: Array<{ que: string; empieza: number; termina: number; kb: number | null }>;
};

const activa = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("medir") === "1";

export const midiendo = activa;

const hitos: Record<string, number> = {};
let cargadas = 0;
let cargadasAlLlegarIdle: number | null = null;
let calentador = { teselas: 0, ms: null as number | null };

const marca = (k: string) => {
  if (hitos[k] === undefined) hitos[k] = Math.round(performance.now());
};

/** Cuándo MapLibre creó su contexto WebGL, y cuándo dibujó por primera vez. */
export function engancharLienzo() {
  if (!activa()) return;
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    tipo: string,
    ...resto: unknown[]
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (getContext as any).call(this, tipo, ...resto);
    if (ctx && typeof tipo === "string" && tipo.startsWith("webgl")) {
      marca("contextoWebGL");
      const proto = Object.getPrototypeOf(ctx);
      for (const fn of ["drawElements", "drawArrays"]) {
        const orig = proto[fn];
        if (typeof orig !== "function" || orig.__crd) continue;
        const envuelto = function (this: unknown, ...a: unknown[]) {
          marca("primerDibujo");
          proto[fn] = orig;
          return orig.apply(this, a);
        };
        envuelto.__crd = true;
        proto[fn] = envuelto;
      }
    }
    return ctx;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

/** El calentador de teselas informa de lo que trajo. */
export function calentadorTermino(teselas: number, ms: number) {
  if (!activa()) return;
  calentador = { teselas, ms: Math.round(ms) };
}

type MapaMinimo = {
  on: (ev: string, cb: (e: { sourceId?: string; tile?: unknown }) => void) => void;
};

/**
 * Teselas cargadas, vistas desde los eventos del mapa. MapLibre emite un `data`
 * con `tile` por cada tesela que termina; no hay evento equivalente al pedirla,
 * y por eso aquí no hay duraciones.
 */
export function engancharMapa(map: MapaMinimo) {
  if (!activa()) return;
  marca("mapaLoad");

  map.on("data", (e) => {
    if (e.sourceId !== "carto" || !e.tile) return;
    cargadas++;
    marca("primeraTeselaCargada");
    hitos.ultimaTeselaCargada = Math.round(performance.now());
  });

  // `idle` marca el final del primer encuadre: lo cargado hasta ahí es el
  // arranque, lo de después es lo que cuesta recorrer la página.
  map.on("idle", () => {
    marca("mapaIdle");
    if (cargadasAlLlegarIdle === null) cargadasAlLlegarIdle = cargadas;
  });
}

// ─── Informe ─────────────────────────────────────────────────────────────────

const nav = () =>
  (performance.getEntriesByType("navigation")[0] ?? null) as PerformanceNavigationTiming | null;

const pintado = (nombre: string) =>
  performance.getEntriesByName(nombre)[0]?.startTime ?? null;

const recurso = (que: string, patron: RegExp) => {
  const r = performance
    .getEntriesByType("resource")
    .filter((x) => patron.test(x.name))
    .sort((a, b) => a.startTime - b.startTime)[0] as PerformanceResourceTiming | undefined;
  return r
    ? { que, empieza: Math.round(r.startTime), termina: Math.round(r.responseEnd),
        kb: r.transferSize ? Math.round(r.transferSize / 1024) : null }
    : null;
};

export function informe(): Medicion {
  const n = nav();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (navigator as any).connection ?? {};
  const chunkMapa = performance
    .getEntriesByType("resource")
    .filter((x) => /_next\/static\/chunks\/.*\.js$/.test(x.name))
    .sort((a, b) => ((b as PerformanceResourceTiming).transferSize ?? 0) - ((a as PerformanceResourceTiming).transferSize ?? 0))[0] as
    | PerformanceResourceTiming
    | undefined;

  return {
    version: 1,
    url: location.pathname + location.search,
    dispositivo: {
      ua: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nucleos: navigator.hardwareConcurrency ?? null, memoriaGB: (navigator as any).deviceMemory ?? null,
    },
    red: {
      tipo: c.effectiveType ?? null, bajadaMbps: c.downlink ?? null,
      rttMs: c.rtt ?? null, ahorroDatos: c.saveData ?? null,
    },
    pagina: {
      respuesta: n ? Math.round(n.responseEnd) : null,
      domContentLoaded: n ? Math.round(n.domContentLoadedEventEnd) : null,
      load: n ? Math.round(n.loadEventEnd) : null,
      primerPintado: pintado("first-contentful-paint") ? Math.round(pintado("first-contentful-paint")!) : null,
    },
    mapa: {
      chunkPide: chunkMapa ? Math.round(chunkMapa.startTime) : null,
      chunkLlega: chunkMapa ? Math.round(chunkMapa.responseEnd) : null,
      chunkKB: chunkMapa?.transferSize ? Math.round(chunkMapa.transferSize / 1024) : null,
      contextoWebGL: hitos.contextoWebGL ?? null,
      primerDibujo: hitos.primerDibujo ?? null,
      load: hitos.mapaLoad ?? null,
      idle: hitos.mapaIdle ?? null,
    },
    teselas: {
      cargadas,
      enElArranque: cargadasAlLlegarIdle ?? cargadas,
      enElRecorrido: cargadas - (cargadasAlLlegarIdle ?? cargadas),
      primeraCargada: hitos.primeraTeselaCargada ?? null,
      ultimaCargada: hitos.ultimaTeselaCargada ?? null,
    },
    calentador,
    recursos: [
      recurso("style.json", /positron-gl-style\/style\.json/),
      recurso("tiles.json", /carto\.streets\/v1\/tiles\.json/),
      recurso("sprite.png", /sprite\.png/),
      recurso("primer glyph", /\/fonts\/.*\.pbf/),
    ].filter((x): x is NonNullable<typeof x> => x !== null),
  };
}
