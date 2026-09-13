"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  /dev/camara — posicionador de cámara por escena y por tramo de pantalla.
//
//  El lienzo (iframe) corre el journey real al tamaño exacto del tramo: cromo
//  verdadero, media queries verdaderas. Aquí viven los controles: escena,
//  tramo, lectura en vivo de la cámara, guardado por tramo (localStorage
//  mientras se trabaja) y el bloque `tramos:` listo para pegar en
//  SCENE_CAMERAS (data/destinations.ts).
//
//  Ruta interna de desarrollo: no está enlazada desde el sitio ni en el
//  sitemap, igual que /dev/email-assets.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { SCENES } from "@/lib/journey";

type Camara = { center: [number, number]; zoom: number; pitch: number; bearing: number };
type Guardado = Camara & { w: number; h: number };
/** escena → "WxH" → encuadre guardado. */
type Borradores = Record<string, Record<string, Guardado>>;

type Tramo = { id: string; w: number; h: number; grupo: string; nombre: string };

// Viewports CSS nominales de dispositivos reales (decisión del dueño, ago
// 2026: anclar a pantallas específicas, no a medidas sueltas). Ojo: son la
// pantalla completa; un navegador con barra entrega menos alto (Safari en un
// 430x932 da 430x748) y la corrección de franja del motor absorbe esa
// diferencia. Cualquier medida que falte se agrega desde el campo de tramo
// personalizado, sin tocar código.
const PRESETS: Tramo[] = [
  { id: "393x852", w: 393, h: 852, grupo: "iPhone", nombre: "15 · 16" },
  { id: "402x874", w: 402, h: 874, grupo: "iPhone", nombre: "17 · 16 Pro" },
  { id: "430x932", w: 430, h: 932, grupo: "iPhone", nombre: "15 Pro Max" },
  { id: "440x956", w: 440, h: 956, grupo: "iPhone", nombre: "17 Pro Max" },
  { id: "360x780", w: 360, h: 780, grupo: "Samsung", nombre: "Galaxy S" },
  { id: "384x824", w: 384, h: 824, grupo: "Samsung", nombre: "Galaxy Ultra" },
  { id: "412x915", w: 412, h: 915, grupo: "Samsung", nombre: "Galaxy A" },
  { id: "1280x832", w: 1280, h: 832, grupo: "MacBook", nombre: "Air 13" },
  { id: "1440x932", w: 1440, h: 932, grupo: "MacBook", nombre: "Air 15" },
  { id: "1512x982", w: 1512, h: 982, grupo: "MacBook", nombre: "Pro 14" },
  { id: "1728x1117", w: 1728, h: 1117, grupo: "MacBook", nombre: "Pro 16" },
  { id: "1366x768", w: 1366, h: 768, grupo: "Windows", nombre: "básica" },
  { id: "1536x864", w: 1536, h: 864, grupo: "Windows", nombre: "1080p·125%" },
  { id: "1920x1080", w: 1920, h: 1080, grupo: "Windows", nombre: "1080p" },
];

const CLAVE = "crd-camara-borradores";
const CLAVE_TRAMOS = "crd-camara-tramos-extra";
const RAIL = 340; // ancho de la columna de controles

// Redondeos del bloque generado: los mismos órdenes de magnitud que ya usan
// las entradas escritas a mano de SCENE_CAMERAS.
const n = (v: number, d: number) => Number(v.toFixed(d));

// El bloque siempre nombra su escena: se pega dentro de la entrada correcta
// de SCENE_CAMERAS y sin la referencia no se sabe cuál es.
function bloqueDeCodigo(escena: string, borradores: Record<string, Guardado> | undefined): string {
  if (!borradores || Object.keys(borradores).length === 0) return "";
  const porModo = { mobile: [] as Guardado[], desktop: [] as Guardado[] };
  for (const g of Object.values(borradores)) porModo[g.w < 900 ? "mobile" : "desktop"].push(g);
  const linea = (g: Guardado) =>
    `    { w: ${g.w}, h: ${g.h}, center: [${n(g.center[0], 4)}, ${n(g.center[1], 4)}], ` +
    `zoom: ${n(g.zoom, 2)}, pitch: ${n(g.pitch, 1)}, bearing: ${n(g.bearing, 1)} },`;
  const modos = (["mobile", "desktop"] as const)
    .filter((m) => porModo[m].length > 0)
    .map((m) => {
      const lineas = porModo[m].sort((a, b) => a.w - b.w).map(linea).join("\n");
      return `  ${m}: [\n${lineas}\n  ],`;
    })
    .join("\n");
  return `// escena: ${escena}\ntramos: {\n${modos}\n},`;
}

/** Todas las escenas con encuadres guardados, en el orden del recorrido. */
function bloqueCompleto(borradores: Borradores): string {
  return SCENES.map((s) => bloqueDeCodigo(s.name, borradores[s.name]))
    .filter(Boolean)
    .join("\n\n");
}

export default function Herramienta() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [escena, setEscena] = useState("hero");
  const [tramoId, setTramoId] = useState<string>("393x852");
  // Tramos personalizados (medidas de navegador real, tamaños futuros…),
  // persistidos aparte de los borradores para sobrevivir recargas.
  const [extras, setExtras] = useState<Tramo[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(CLAVE_TRAMOS) ?? "[]");
    } catch {
      return [];
    }
  });
  const [nuevoW, setNuevoW] = useState("");
  const [nuevoH, setNuevoH] = useState("");
  const [camara, setCamara] = useState<Camara | null>(null);
  // Perezoso y con guardia de servidor, como `pasoInicial` en Viajeros.
  const [borradores, setBorradores] = useState<Borradores>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    } catch {
      return {};
    }
  });
  const [ventana, setVentana] = useState(() =>
    typeof window === "undefined"
      ? { w: 1280, h: 800 }
      : { w: window.innerWidth, h: window.innerHeight }
  );
  const [copiado, setCopiado] = useState<"escena" | "todo" | null>(null);

  const tramos = [...PRESETS, ...extras];
  const tramo = tramos.find((t) => t.id === tramoId) ?? PRESETS[0];

  const alLienzo = useCallback((msg: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(msg, location.origin);
  }, []);

  // Los borradores y los tramos personalizados se persisten en cada cambio.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(borradores));
    } catch {}
  }, [borradores]);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_TRAMOS, JSON.stringify(extras));
    } catch {}
  }, [extras]);

  // Mensajes del lienzo.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      const d = e.data;
      if (d?.t === "crd-camara") setCamara(d.camara);
      // El panel de pasos del lienzo también cambia de escena: el selector
      // sigue, sin re-enviar la orden (el lienzo ya voló).
      else if (d?.t === "crd-escena-cambiada") setEscena(d.name);
      else if (d?.t === "crd-lienzo-listo") alLienzo({ t: "crd-escena", name: escena });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // `escena` solo importa en el handshake inicial; los cambios posteriores
    // los envía el propio onChange del selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alLienzo]);

  // El lienzo se escala para caber; los valores medidos siguen siendo 1:1.
  useEffect(() => {
    const medir = () => setVentana({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);
  const escala = Math.min(1, (ventana.w - RAIL - 64) / tramo.w, (ventana.h - 96) / tramo.h);

  const guardadoActual = borradores[escena]?.[tramoId];
  const codigo = bloqueDeCodigo(escena, borradores[escena]);
  const codigoTodo = bloqueCompleto(borradores);
  const escenasGuardadas = SCENES.filter((s) => Object.keys(borradores[s.name] ?? {}).length > 0).length;

  const guardar = () => {
    if (!camara) return;
    setBorradores((prev) => ({
      ...prev,
      [escena]: { ...prev[escena], [tramoId]: { ...camara, w: tramo.w, h: tramo.h } },
    }));
  };

  const borrar = () => {
    setBorradores((prev) => {
      const deEscena = { ...prev[escena] };
      delete deEscena[tramoId];
      return { ...prev, [escena]: deEscena };
    });
  };

  const copiar = async (texto: string, alcance: "escena" | "todo") => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(alcance);
      window.setTimeout(() => setCopiado(null), 1600);
    } catch {}
  };

  const agregarTramo = () => {
    const w = Math.round(Number(nuevoW));
    const h = Math.round(Number(nuevoH));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 200 || h < 200) return;
    const id = `${w}x${h}`;
    if (!tramos.some((t) => t.id === id)) {
      setExtras((prev) => [...prev, { id, w, h, grupo: "Personalizado", nombre: id }]);
    }
    setTramoId(id);
    setNuevoW("");
    setNuevoH("");
  };

  // Quitar un tramo personalizado no toca los encuadres ya guardados con él:
  // siguen en los borradores y salen en «Copiar todo».
  const quitarTramo = (id: string) => {
    setExtras((prev) => prev.filter((t) => t.id !== id));
    if (tramoId === id) setTramoId(PRESETS[0].id);
  };

  const boton =
    "h-9 rounded-full px-4 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="fixed inset-0 flex gap-6 overflow-hidden bg-black p-6 font-sans text-white">
      {/* ── Rail de controles ─────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col gap-5 overflow-y-auto" style={{ width: RAIL }}>
        <div>
          <h1 className="text-[17px] font-extrabold tracking-[-0.01em]">Cámara por escena</h1>
          <p className="mt-1 text-[12px] leading-[1.5] text-white/60">
            Mueve el mapa del lienzo con el ratón (arrastrar, rueda, Ctrl+arrastrar para girar e
            inclinar). Guarda el encuadre por tramo y pega el bloque en{" "}
            <code className="text-white/80">SCENE_CAMERAS</code>.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">Escena</span>
          <select
            value={escena}
            onChange={(e) => {
              setEscena(e.target.value);
              alLienzo({ t: "crd-escena", name: e.target.value });
            }}
            className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-[14px] font-semibold text-white outline-none focus:border-white/40"
          >
            {SCENES.map((s) => (
              <option key={s.name} value={s.name} className="bg-black">
                {s.name} · {s.chapter}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">Tramo</span>
          {[...new Set(tramos.map((t) => t.grupo))].map((grupo) => (
            <div key={grupo} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/35">{grupo}</span>
              <div className="flex flex-wrap gap-1.5">
                {tramos.filter((t) => t.grupo === grupo).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTramoId(t.id)}
                    className={`relative min-w-[30%] flex-1 rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                      t.id === tramoId
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/40"
                    }`}
                  >
                    {t.nombre !== t.id && <span className="block text-[11px] font-bold leading-[1.3]">{t.nombre}</span>}
                    <span className={`block text-[11px] leading-[1.3] ${t.id === tramoId ? "text-black/60" : "text-white/50"}`}>
                      {t.w}×{t.h}
                    </span>
                    {borradores[escena]?.[t.id] && (
                      <span
                        title="Este tramo tiene encuadre guardado para la escena"
                        className="absolute right-1.5 top-1.5 block size-2 rounded-full bg-emerald-400"
                      />
                    )}
                    {t.grupo === "Personalizado" && (
                      <span
                        role="button"
                        tabIndex={0}
                        title="Quitar este tramo (sus encuadres guardados no se borran)"
                        onClick={(e) => {
                          e.stopPropagation();
                          quitarTramo(t.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            quitarTramo(t.id);
                          }
                        }}
                        className={`absolute bottom-1 right-1.5 text-[11px] font-bold ${
                          t.id === tramoId ? "text-black/50 hover:text-black" : "text-white/40 hover:text-white"
                        }`}
                      >
                        ×
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {/* Cualquier medida que falte (un viewport real de Safari, una
              pantalla nueva) se agrega aquí y queda persistida. */}
          <div className="flex items-center gap-1.5">
            <input
              value={nuevoW}
              onChange={(e) => setNuevoW(e.target.value)}
              inputMode="numeric"
              placeholder="ancho"
              className="h-8 w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-white/40"
            />
            <span className="text-[11px] text-white/40">×</span>
            <input
              value={nuevoH}
              onChange={(e) => setNuevoH(e.target.value)}
              inputMode="numeric"
              placeholder="alto"
              onKeyDown={(e) => e.key === "Enter" && agregarTramo()}
              className="h-8 w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-white/40"
            />
            <button
              type="button"
              onClick={agregarTramo}
              disabled={!(Number(nuevoW) >= 200 && Number(nuevoH) >= 200)}
              className="h-8 rounded-full border border-white/25 px-3 text-[12px] font-bold text-white transition-colors hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Añadir tramo
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/15 bg-white/5 p-3 font-mono text-[12px] leading-[1.7]">
          <div className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">
            Cámara en vivo
          </div>
          {camara ? (
            <>
              <div>center&nbsp;&nbsp;[{n(camara.center[0], 4)}, {n(camara.center[1], 4)}]</div>
              <div>zoom&nbsp;&nbsp;&nbsp;&nbsp;{n(camara.zoom, 2)}</div>
              <div>pitch&nbsp;&nbsp;&nbsp;{n(camara.pitch, 1)}</div>
              <div>bearing&nbsp;{n(camara.bearing, 1)}</div>
            </>
          ) : (
            <div className="text-white/40">cargando el lienzo…</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={guardar} disabled={!camara} className={`${boton} bg-white text-black hover:bg-white/85`}>
            Guardar encuadre
          </button>
          <button
            type="button"
            onClick={() => alLienzo({ t: "crd-reencuadrar" })}
            className={`${boton} border border-white/25 text-white hover:border-white/60`}
          >
            Encuadre del sitio
          </button>
          <button
            type="button"
            onClick={() => guardadoActual && alLienzo({ t: "crd-aplicar", camara: guardadoActual })}
            disabled={!guardadoActual}
            className={`${boton} border border-white/25 text-white hover:border-white/60`}
          >
            Cargar guardado
          </button>
          <button type="button" onClick={borrar} disabled={!guardadoActual} className={`${boton} border border-red-400/40 text-red-300 hover:border-red-300`}>
            Borrar guardado
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">
              Bloque para {escena}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => copiar(codigo, "escena")}
                disabled={!codigo}
                className="rounded-full border border-white/25 px-3 py-1 text-[12px] font-bold text-white transition-colors hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {copiado === "escena" ? "Copiado ✓" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => copiar(codigoTodo, "todo")}
                disabled={!codigoTodo}
                title="Todas las escenas con encuadres guardados, cada bloque con su referencia de escena"
                className="rounded-full border border-white/25 px-3 py-1 text-[12px] font-bold text-white transition-colors hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {copiado === "todo" ? "Copiado ✓" : `Copiar todo (${escenasGuardadas})`}
              </button>
            </div>
          </div>
          <pre className="overflow-auto rounded-xl border border-white/15 bg-white/5 p-3 font-mono text-[11px] leading-[1.6] text-white/85">
            {codigo || "Sin encuadres guardados para esta escena.\nAjusta el mapa y pulsa «Guardar encuadre»."}
          </pre>
        </div>
      </div>

      {/* ── Lienzo ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden">
        <div className="text-[12px] text-white/50">
          {tramo.w}×{tramo.h}
          {tramo.nombre !== tramo.id && ` · ${tramo.grupo} ${tramo.nombre}`}
          {escala < 1 && ` · vista al ${Math.round(escala * 100)}%`}
        </div>
        <div
          className="shrink-0 overflow-hidden rounded-lg border border-white/20"
          style={{ width: tramo.w * escala, height: tramo.h * escala }}
        >
          <iframe
            ref={iframeRef}
            src="/dev/camara/lienzo"
            title="Lienzo del recorrido al tamaño del tramo"
            width={tramo.w}
            height={tramo.h}
            style={{ transform: `scale(${escala})`, transformOrigin: "top left", border: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
