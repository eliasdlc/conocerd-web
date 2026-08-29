"use client";

import { useCallback, useEffect, useState } from "react";
import { informe, type Informe } from "@/lib/medicion";

// ─────────────────────────────────────────────────────────────────────────────
//  El panel que enseña la medición en el propio dispositivo.
//
//  La consola de un teléfono es un suplicio, así que los números se pintan aquí
//  y hay un botón que los copia. En móvil aparece además Compartir, que abre la
//  hoja del sistema: es la vía corta para mandar una corrida desde el teléfono.
//
//  Va ARRIBA y no abajo, y en pantallas táctiles empieza plegado: abajo vive el
//  panel de pasos, que es justo lo que hay que tocar para recorrer el journey en
//  móvil. Un panel de medición que tapa el control que hay que usar para medir
//  no mide nada.
//
//  Se refresca cada segundo, para que la tabla de escenas siga viva mientras se
//  recorre la página.
// ─────────────────────────────────────────────────────────────────────────────

const ms = (v: number | null | undefined) => (v === null || v === undefined ? "-" : `${v} ms`);

export default function PanelDeMedicion() {
  const [datos, setDatos] = useState<Informe | null>(null);
  const [pestana, setPestana] = useState<"resumen" | "escenas">("resumen");
  // Plegado de entrada en táctil: ahí la pantalla es pequeña y lo que importa
  // es poder recorrer, no leer cifras a mitad de camino.
  const [abierto, setAbierto] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.maxTouchPoints === 0
  );
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const tic = () => setDatos(informe());
    tic();
    const t = window.setInterval(tic, 1000);
    return () => window.clearInterval(t);
  }, []);

  const texto = useCallback(() => JSON.stringify(informe(), null, 1), []);

  const copiar = useCallback(() => {
    const fin = () => { setAviso("Copiado"); window.setTimeout(() => setAviso(""), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(texto()).then(fin, fin);
    else fin();
  }, [texto]);

  const compartir = useCallback(() => {
    navigator.share?.({ title: "Medicion ConoceRD", text: texto() }).catch(() => {});
  }, [texto]);

  if (!datos) return null;

  const resumen: Array<[string, string]> = [
    ["dispositivo", datos.contexto.dispositivo],
    ["navegador", `${datos.contexto.navegador} · ${datos.contexto.plataforma}`],
    ["gpu", datos.contexto.gpu],
    ["pantalla", `${datos.contexto.viewport} @${datos.contexto.dpr}x · ${datos.contexto.nucleos ?? "?"} nucleos · ${datos.contexto.memoriaGB ?? "?"} GB`],
    ["red", `${datos.red.tipo ?? "?"} · ${datos.red.bajadaMbps ?? "?"} Mbps · rtt ${datos.red.rttMs ?? "?"} ms`],
    ["ahorro de datos", String(datos.red.ahorroDatos ?? "?")],
    ["primer pintado / lcp", `${ms(datos.pagina.primerPintado)} / ${ms(datos.pagina.lcp)}`],
    ["chunk mapa", `${ms(datos.mapa.chunkPide)} pide, ${ms(datos.mapa.chunkLlega)} llega`],
    ["construccion / dibujo", `${ms(datos.mapa.construccion)} / ${ms(datos.mapa.primerDibujo)}`],
    ["primer encuadre", ms(datos.mapa.primerEncuadre)],
    ["teselas", `${datos.teselas.cargadas} · ${datos.teselas.enElArranque} arranque · ${datos.teselas.enElRecorrido} recorrido`],
    ["calentador", datos.calentador.corrio
      ? `${datos.calentador.teselas} teselas en ${ms(datos.calentador.ms)}`
      : `NO CORRIO: ${datos.calentador.motivo}`],
    ["respuesta al toque", `INP ${ms(datos.interacciones.inpMs)} · ${datos.interacciones.total} interacciones`],
    ["hilo bloqueado", `${datos.bloqueo.tareasLargas} tareas largas · ${datos.bloqueo.msTotal} ms · peor ${datos.bloqueo.peorMs} ms`],
    ["saltos de layout", String(datos.pagina.clsPorMil ?? "-") + " /1000"],
  ];

  return (
    <div
      className="fixed left-2 right-2 top-2 z-[9999] rounded-2xl border border-white/15 bg-black/92 p-3 font-mono text-[11px] leading-[1.45] text-white backdrop-blur"
      style={{ maxHeight: abierto ? "72vh" : "auto", overflow: "auto" }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <b className="text-[12px]">{datos.id}</b>
        <button type="button" onClick={() => setPestana("resumen")}
          className={`rounded-lg border px-2 py-1 ${pestana === "resumen" ? "border-white bg-white text-black" : "border-white/20"}`}>
          Resumen
        </button>
        <button type="button" onClick={() => setPestana("escenas")}
          className={`rounded-lg border px-2 py-1 ${pestana === "escenas" ? "border-white bg-white text-black" : "border-white/20"}`}>
          Escenas ({datos.escenas.length})
        </button>
        <button type="button" onClick={() => setAbierto((v) => !v)} className="rounded-lg border border-white/20 px-2 py-1">
          {abierto ? "Ocultar" : "Ver"}
        </button>
        <button type="button" onClick={copiar} className="ml-auto rounded-lg bg-white px-3 py-1 font-bold text-black">
          {aviso || "Copiar"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" onClick={compartir} className="rounded-lg border border-white/40 px-3 py-1 font-bold">
            Compartir
          </button>
        )}
      </div>

      {abierto && pestana === "resumen" && (
        <table className="w-full"><tbody>
          {resumen.map(([k, v]) => (
            <tr key={k}><td className="pr-2 align-top text-white/55">{k}</td><td className="align-top break-all">{v}</td></tr>
          ))}
        </tbody></table>
      )}

      {abierto && pestana === "escenas" && (
        <table className="w-full"><thead>
          <tr className="text-white/55"><th className="text-left">escena</th><th className="text-right">lista</th><th className="text-right">tes</th><th className="text-right">fps</th><th className="text-right">peor</th><th className="text-right">bloq</th></tr>
        </thead><tbody>
          {datos.escenas.map((e, i) => (
            <tr key={`${e.escena}-${i}`}>
              <td className="pr-1">{e.escena}</td>
              <td className="text-right">{e.ms === null ? "..." : `${e.ms}`}</td>
              <td className="text-right">{e.teselas}</td>
              <td className="text-right">{e.fps ?? "-"}</td>
              <td className="text-right">{e.peorFotogramaMs ?? "-"}</td>
              <td className="text-right">{e.msBloqueado}</td>
            </tr>
          ))}
        </tbody></table>
      )}

      {abierto && (
        <p className="mt-2 text-[10px] text-white/45">
          Deja la pagina quieta 10 s, despues recorrela entera. En movil se avanza con el panel de pasos de abajo,
          que este panel ya no tapa. Al final pulsa Copiar o Compartir.
        </p>
      )}
    </div>
  );
}
