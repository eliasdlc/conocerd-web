// ─────────────────────────────────────────────────────────────────────────────
//  La sonda: qué tarda, cuánto, y en qué escena.
//
//  Se descarga sólo con `?medir` en la URL (components/Medicion), así que nada
//  de esto pesa para quien visita el sitio. Lee tres fuentes y las cruza por
//  tiempo:
//
//    1. Las marcas que el recorrido escribe (lib/medicion/marcas).
//    2. `PerformanceResourceTiming`, que el navegador ya lleva: cada tesela,
//       chunk, fuente e imagen con su instante, su duración y sus bytes. No
//       hace falta instrumentar la red, sólo agruparla.
//    3. `PerformanceObserver` de tareas largas y el reloj de frames, que es lo
//       que explica un tirón cuando la red ya trajo todo.
//
//  El resultado es un informe por escena: desde que se pide el paso hasta que
//  la cámara llega, hasta que el mapa queda quieto, y qué se descargó en medio.
//  `window.__crdMedicion()` lo devuelve; `scripts/medir-recorrido.mjs` lo lee.
// ─────────────────────────────────────────────────────────────────────────────

import { conectarSonda, type Detalle, type MapaObservable, type Marca } from "./marcas";

// ─── Tipos del informe ───────────────────────────────────────────────────────

export interface Hito {
  marca: Marca;
  t: number;
  detalle?: Detalle;
}

export interface TramoDeEscena {
  escena: number;
  /** Instante en que se pidió el paso, desde el inicio de la navegación. */
  pedido: number;
  /** Cuánto tardó la cámara en asentarse en el keyframe. */
  vueloMs: number | null;
  /** Cuánto MÁS tardó el mapa en quedarse quieto con todo pintado. Es el hueco
   *  en el que la escena ya está montada y el mapa sigue apareciendo a trozos. */
  hastaQuietoMs: number | null;
  /** Lo que llegó DESPUÉS de que la cámara se asentó, por fuente. */
  teselasTarde: number;
  relieveTarde: number;
  kbTarde: number;
  fps: number | null;
  framesLargos: number;
  peorFrameMs: number | null;
  peorTareaMs: number;
}

export interface GrupoDeRed {
  grupo: string;
  peticiones: number;
  kb: number;
  medianaMs: number;
  p95Ms: number;
  peorMs: number;
}

export interface Informe {
  url: string;
  viewport: { w: number; h: number; dpr: number };
  arranque: {
    ttfbMs: number | null;
    fcpMs: number | null;
    lcpMs: number | null;
    hidratadoMs: number | null;
    mapaLoadMs: number | null;
    mapaQuietoMs: number | null;
  };
  escenas: TramoDeEscena[];
  red: GrupoDeRed[];
  totales: { peticiones: number; kb: number; tareasLargas: number; peorTareaMs: number };
  hitos: Hito[];
}

// ─── Agrupación de la red ────────────────────────────────────────────────────
//
// El nombre del grupo es lo que se lee en la tabla, así que dice de dónde sale
// el byte y no qué extensión tiene: "relieve" y no "webp de public".

const ES_RELIEVE = /\/relieve\/v\d+\//;
const ES_TESELA = /\.(pbf|mvt)($|\?)/;

const GRUPOS: [RegExp, string][] = [
  [ES_RELIEVE, "relieve"],
  [ES_TESELA, "teselas Carto"],
  [/cartocdn\.com.*(sprite|glyph|\.json)/, "estilo y glifos Carto"],
  [/gibs\.earthdata|blue.?marble|nasa/i, "NASA (hero)"],
  [/\/_next\/static\/.*\.js|\.js($|\?)/, "JS de la app"],
  [/\.css($|\?)/, "CSS"],
  [/\.(woff2?|ttf|otf)($|\?)/, "fuentes"],
  [/\.(mp4|webm|mov)($|\?)/, "vídeo"],
  [/\.(webp|png|jpe?g|avif|svg|gif)($|\?)/, "imágenes"],
];

function grupoDe(url: string): string {
  for (const [re, nombre] of GRUPOS) if (re.test(url)) return nombre;
  return "otros";
}

const percentil = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const orden = [...xs].sort((a, b) => a - b);
  return Math.round(orden[Math.min(orden.length - 1, Math.floor(orden.length * p))]);
};

const kb = (rs: PerformanceResourceTiming[]) =>
  Math.round(rs.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0) / 1024);

// ─── La sonda ────────────────────────────────────────────────────────────────

type Tarea = { t: number; ms: number };

class SondaDelRecorrido {
  private hitos: Hito[] = [];
  private tareas: Tarea[] = [];
  private quietos: number[] = [];
  private mapa: MapaObservable | null = null;

  /** Deltas entre frames del vuelo en curso, y a qué paso pertenecen. */
  private ventana: number[] = [];
  private pasoEnVuelo = -1;
  private midiendo = false;
  private porPaso = new Map<number, number[]>();

  private alQuieto = () => this.quietos.push(this.ahora());

  private lcpMs: number | null = null;

  constructor() {
    this.observarTareasLargas();
    this.observarLCP();
  }

  private ahora() {
    return Math.round(performance.now());
  }

  anotar(marca: Marca, detalle?: Detalle) {
    const t = this.ahora();
    this.hitos.push({ marca, t, detalle });
    // El vuelo de un paso es lo único que hay que mirar frame a frame: fuera de
    // él la página está quieta y contar frames sólo gastaría batería.
    if (marca === "paso:pide") {
      this.pasoEnVuelo = this.hitos.filter((h) => h.marca === "paso:pide").length - 1;
      this.arrancarFrames();
    }
    if (marca === "paso:llega") this.pararFrames();
  }

  observarMapa(map: MapaObservable) {
    this.mapa?.off("idle", this.alQuieto);
    this.mapa = map;
    map.on("idle", this.alQuieto);
  }

  // ── Frames ────────────────────────────────────────────────────────────────

  private arrancarFrames() {
    this.ventana = [];
    if (this.midiendo) return;
    this.midiendo = true;
    let previo = performance.now();
    const tick = (t: number) => {
      this.ventana.push(t - previo);
      previo = t;
      if (this.midiendo) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private pararFrames() {
    this.midiendo = false;
    // El primer delta arrastra el tiempo transcurrido desde antes del gesto.
    if (this.pasoEnVuelo >= 0) this.porPaso.set(this.pasoEnVuelo, this.ventana.slice(1));
    this.pasoEnVuelo = -1;
  }

  private observarTareasLargas() {
    try {
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) {
          this.tareas.push({ t: Math.round(e.startTime), ms: e.duration });
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {
      // Firefox y Safari no traen longtask: el resto del informe sigue valiendo.
    }
  }

  // ── El informe ────────────────────────────────────────────────────────────

  private pintura(nombre: string): number | null {
    const e = performance.getEntriesByName(nombre)[0];
    return e ? Math.round(e.startTime) : null;
  }

  /**
   * El LCP NO se puede leer con `getEntriesByType`: Chrome sólo lo entrega a un
   * observador con `buffered`, y el último que llega es el bueno.
   */
  private observarLCP() {
    try {
      new PerformanceObserver((lista) => {
        const xs = lista.getEntries();
        if (xs.length) this.lcpMs = Math.round(xs[xs.length - 1].startTime);
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Firefox no lo implementa.
    }
  }

  private hito(marca: Marca): Hito | undefined {
    return this.hitos.find((h) => h.marca === marca);
  }

  private red(desde = 0, hasta = Infinity): PerformanceResourceTiming[] {
    return performance
      .getEntriesByType("resource")
      .filter((e): e is PerformanceResourceTiming => e.entryType === "resource")
      .filter((e) => e.responseEnd >= desde && e.startTime < hasta);
  }

  /**
   * Un tramo por cada paso pedido. Lo que interesa de cada uno es la distancia
   * entre "la cámara ya está" y "el mapa ya está": ese hueco es exactamente lo
   * que se ve cargar a trozos encima de una escena ya montada.
   */
  private escenas(): TramoDeEscena[] {
    const pasos = this.hitos.filter((h) => h.marca === "paso:pide");
    return pasos.map((pide, i) => {
      const fin = pasos[i + 1]?.t ?? Infinity;
      const llega = this.hitos.find((h) => h.marca === "paso:llega" && h.t >= pide.t && h.t < fin);
      const quieto = llega ? this.quietos.find((q) => q >= llega.t && q < fin) : undefined;
      const tarde = llega ? this.red(llega.t, fin) : [];
      const deltas = this.porPaso.get(i) ?? [];
      const duracion = deltas.reduce((a, b) => a + b, 0);
      const tareas = this.tareas.filter((x) => x.t >= pide.t && x.t < fin).map((x) => x.ms);
      return {
        escena: Number(pide.detalle?.a ?? i),
        pedido: pide.t,
        vueloMs: llega ? llega.t - pide.t : null,
        hastaQuietoMs: llega && quieto !== undefined ? quieto - llega.t : null,
        teselasTarde: tarde.filter((r) => ES_TESELA.test(r.name)).length,
        relieveTarde: tarde.filter((r) => ES_RELIEVE.test(r.name)).length,
        kbTarde: kb(tarde),
        fps: duracion > 0 ? Math.round((deltas.length / duracion) * 1000) : null,
        framesLargos: deltas.filter((d) => d > 50).length,
        peorFrameMs: deltas.length ? Math.round(Math.max(...deltas)) : null,
        peorTareaMs: Math.round(Math.max(0, ...tareas)),
      };
    });
  }

  private grupos(): GrupoDeRed[] {
    const por = new Map<string, PerformanceResourceTiming[]>();
    for (const r of this.red()) {
      const g = grupoDe(r.name);
      const lista = por.get(g);
      if (lista) lista.push(r);
      else por.set(g, [r]);
    }
    return [...por.entries()]
      .map(([grupo, rs]) => {
        const ds = rs.map((r) => r.duration);
        return {
          grupo,
          peticiones: rs.length,
          kb: kb(rs),
          medianaMs: percentil(ds, 0.5),
          p95Ms: percentil(ds, 0.95),
          peorMs: Math.round(Math.max(0, ...ds)),
        };
      })
      .sort((a, b) => b.kb - a.kb);
  }

  informe(): Informe {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const red = this.red();
    return {
      url: location.href,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
      arranque: {
        ttfbMs: nav ? Math.round(nav.responseStart) : null,
        fcpMs: this.pintura("first-contentful-paint"),
        lcpMs: this.lcpMs,
        hidratadoMs: this.hito("hidratado")?.t ?? null,
        mapaLoadMs: this.hito("mapa:load")?.t ?? null,
        mapaQuietoMs: this.quietos[0] ?? null,
      },
      escenas: this.escenas(),
      red: this.grupos(),
      totales: {
        peticiones: red.length,
        kb: kb(red),
        tareasLargas: this.tareas.length,
        peorTareaMs: Math.round(Math.max(0, ...this.tareas.map((x) => x.ms))),
      },
      hitos: this.hitos,
    };
  }
}

/** Una sola sonda por página. La arranca el componente que la carga. */
export function arrancarSonda(): () => Informe {
  const s = new SondaDelRecorrido();
  conectarSonda(s);
  const leer = () => s.informe();
  (window as unknown as { __crdMedicion: () => Informe }).__crdMedicion = leer;
  return leer;
}
