// ─────────────────────────────────────────────────────────────────────────────
//  Quién está midiendo, sin que nadie lo escriba a mano.
//
//  El objetivo es que un informe se explique solo: qué teléfono, qué navegador,
//  qué red, qué GPU y con qué ajustes puestos. Comparar diez corridas de cinco
//  dispositivos no puede depender de que alguien recuerde cuál era cuál.
// ─────────────────────────────────────────────────────────────────────────────

export type Contexto = {
  dispositivo: string;
  plataforma: string;
  navegador: string;
  gpu: string;
  viewport: string;
  dpr: number;
  orientacion: string;
  pantalla: string;
  nucleos: number | null;
  memoriaGB: number | null;
  tactil: boolean;
  movimientoReducido: boolean;
};

type UAData = {
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
  getHighEntropyValues?: (h: string[]) => Promise<Record<string, unknown>>;
};

/** El renderer real, no el fabricante. Es lo que distingue un móvil de gama alta de uno de gama baja. */
function gpu(): string {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") ?? c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return "sin webgl";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return String(r);
  } catch {
    return "desconocida";
  }
}

/** Del User-Agent clásico, cuando no hay Client Hints (Safari, Firefox). */
function delUAClasico(ua: string) {
  const nav =
    /Firefox\/([\d.]+)/.exec(ua)?.[0] ??
    (/Edg\/([\d.]+)/.exec(ua) ? `Edge ${/Edg\/([\d.]+)/.exec(ua)![1]}` : null) ??
    (/CriOS\/([\d.]+)/.exec(ua) ? `Chrome iOS ${/CriOS\/([\d.]+)/.exec(ua)![1]}` : null) ??
    (/Chrome\/([\d.]+)/.exec(ua) ? `Chrome ${/Chrome\/([\d.]+)/.exec(ua)![1].split(".")[0]}` : null) ??
    (/Version\/([\d.]+).*Safari/.exec(ua) ? `Safari ${/Version\/([\d.]+)/.exec(ua)![1]}` : null) ??
    "desconocido";
  const plat =
    /Android ([\d.]+)/.exec(ua)?.[0] ??
    /iPhone OS ([\d_]+)/.exec(ua)?.[0].replace(/_/g, ".") ??
    /Mac OS X ([\d_]+)/.exec(ua)?.[0].replace(/_/g, ".") ??
    (/Windows NT ([\d.]+)/.exec(ua) ? `Windows NT ${/Windows NT ([\d.]+)/.exec(ua)![1]}` : null) ??
    (/Linux/.test(ua) ? "Linux" : "desconocida");
  return { navegador: nav, plataforma: plat };
}

/**
 * Chrome en Android congela el modelo en el User-Agent ("Android 10; K") desde
 * la reducción del UA, así que el modelo real sólo sale por Client Hints de
 * alta entropía, y sólo si se piden explícitamente.
 */
export async function contexto(): Promise<Contexto> {
  const ua = navigator.userAgent;
  const base = delUAClasico(ua);
  let dispositivo = /Mobi|Android|iPhone|iPad/.test(ua) ? "movil sin identificar" : "escritorio";
  let plataforma = base.plataforma;
  let navegador = base.navegador;

  const uad = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  if (uad?.getHighEntropyValues) {
    try {
      const h = await uad.getHighEntropyValues([
        "model", "platform", "platformVersion", "fullVersionList", "mobile",
      ]);
      const modelo = String(h.model ?? "").trim();
      if (modelo) dispositivo = modelo;
      else if (h.mobile === false) dispositivo = "escritorio";
      if (h.platform) plataforma = `${h.platform} ${h.platformVersion ?? ""}`.trim();
      const lista = h.fullVersionList as Array<{ brand: string; version: string }> | undefined;
      const real = lista?.find((b) => !/Not.?A.?Brand/i.test(b.brand) && b.brand !== "Chromium");
      if (real) navegador = `${real.brand} ${real.version.split(".")[0]}`;
    } catch {
      // Client Hints de alta entropía requieren contexto seguro y permiso; si
      // no están, se queda lo que dijo el User-Agent clásico.
    }
  }

  return {
    dispositivo, plataforma, navegador,
    gpu: gpu(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: Math.round(window.devicePixelRatio * 100) / 100,
    orientacion: window.innerWidth >= window.innerHeight ? "horizontal" : "vertical",
    pantalla: `${window.screen.width}x${window.screen.height}`,
    nucleos: navigator.hardwareConcurrency ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    memoriaGB: (navigator as any).deviceMemory ?? null,
    tactil: navigator.maxTouchPoints > 0,
    movimientoReducido: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

/** Una línea que identifica la corrida de un vistazo. */
export const titular = (c: Contexto, red: { tipo?: unknown; bajadaMbps?: unknown }) =>
  `${c.dispositivo} · ${c.navegador} · ${c.plataforma} · ${red.tipo ?? "?"} ${red.bajadaMbps ?? "?"}Mbps · ${c.viewport}@${c.dpr}x`;
