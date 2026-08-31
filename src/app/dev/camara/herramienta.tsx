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

const TRAMOS = [
  { id: "375x553", w: 375, h: 553, grupo: "Teléfono", nombre: "chico" },
  { id: "393x664", w: 393, h: 664, grupo: "Teléfono", nombre: "mediano" },
  { id: "430x748", w: 430, h: 748, grupo: "Teléfono", nombre: "grande" },
  { id: "1131x686", w: 1131, h: 686, grupo: "Escritorio", nombre: "ventana real" },
  { id: "1280x600", w: 1280, h: 600, grupo: "Escritorio", nombre: "portátil bajo" },
  { id: "1440x900", w: 1440, h: 900, grupo: "Escritorio", nombre: "referencia" },
] as const;

const CLAVE = "crd-camara-borradores";
const RAIL = 340; // ancho de la columna de controles

// Redondeos del bloque generado: los mismos órdenes de magnitud que ya usan
// las entradas escritas a mano de SCENE_CAMERAS.
const n = (v: number, d: number) => Number(v.toFixed(d));

function bloqueDeCodigo(borradores: Record<string, Guardado> | undefined): string {
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
  return `tramos: {\n${modos}\n},`;
}

export default function Herramienta() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [escena, setEscena] = useState("hero");
  const [tramoId, setTramoId] = useState<string>("1131x686");
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
  const [copiado, setCopiado] = useState(false);

  const tramo = TRAMOS.find((t) => t.id === tramoId) ?? TRAMOS[3];

  const alLienzo = useCallback((msg: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(msg, location.origin);
  }, []);

  // Los borradores se persisten en cada cambio.
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(borradores));
    } catch {}
  }, [borradores]);

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
  const codigo = bloqueDeCodigo(borradores[escena]);

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

  const copiar = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {}
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

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">Tramo</span>
          {(["Teléfono", "Escritorio"] as const).map((grupo) => (
            <div key={grupo} className="flex gap-1.5">
              {TRAMOS.filter((t) => t.grupo === grupo).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTramoId(t.id)}
                  className={`relative flex-1 rounded-xl border px-1 py-2 text-left transition-colors ${
                    t.id === tramoId
                      ? "border-white bg-white text-black"
                      : "border-white/15 bg-white/5 text-white hover:border-white/40"
                  }`}
                >
                  <span className="block px-2 text-[12px] font-bold">{t.nombre}</span>
                  <span className={`block px-2 text-[11px] ${t.id === tramoId ? "text-black/60" : "text-white/50"}`}>
                    {t.w}×{t.h}
                  </span>
                  {borradores[escena]?.[t.id] && (
                    <span
                      title="Este tramo tiene encuadre guardado para la escena"
                      className="absolute right-1.5 top-1.5 block size-2 rounded-full bg-emerald-400"
                    />
                  )}
                </button>
              ))}
            </div>
          ))}
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
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/50">
              Bloque para {escena}
            </span>
            <button
              type="button"
              onClick={copiar}
              disabled={!codigo}
              className="rounded-full border border-white/25 px-3 py-1 text-[12px] font-bold text-white transition-colors hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
          <pre className="overflow-auto rounded-xl border border-white/15 bg-white/5 p-3 font-mono text-[11px] leading-[1.6] text-white/85">
            {codigo || "Sin encuadres guardados para esta escena.\nAjusta el mapa y pulsa «Guardar encuadre»."}
          </pre>
        </div>
      </div>

      {/* ── Lienzo ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden">
        <div className="text-[12px] text-white/50">
          {tramo.w}×{tramo.h} · {tramo.grupo.toLowerCase()} {tramo.nombre}
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
