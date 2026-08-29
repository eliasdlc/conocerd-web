"use client";

import { useCallback, useEffect, useState } from "react";
import { informe, type Medicion } from "@/lib/medicion";

// ─────────────────────────────────────────────────────────────────────────────
//  El panel que enseña la medición en el propio teléfono.
//
//  La consola del navegador en un móvil es un suplicio, así que los números se
//  pintan aquí y hay un botón que los copia. Se abre con `?medir=1` y con nada
//  más: sin ese parámetro este componente ni siquiera se descarga.
//
//  Se refresca solo cada segundo mientras se recorre la página, para que la
//  cuenta de teselas siga viva mientras se desliza.
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, u = " ms") => (v === null || v === undefined ? "-" : `${v}${u}`);

export default function PanelDeMedicion() {
  const [datos, setDatos] = useState<Medicion | null>(null);
  const [abierto, setAbierto] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const tic = () => setDatos(informe());
    tic();
    const id = window.setInterval(tic, 1000);
    return () => window.clearInterval(id);
  }, []);

  const copiar = useCallback(() => {
    const texto = JSON.stringify(informe(), null, 1);
    const listo = () => { setCopiado(true); window.setTimeout(() => setCopiado(false), 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(listo, listo);
    else listo();
  }, []);

  if (!datos) return null;

  const filas: Array<[string, string]> = [
    ["red", `${datos.red.tipo ?? "?"} · ${datos.red.bajadaMbps ?? "?"} Mbps · rtt ${datos.red.rttMs ?? "?"} ms`],
    ["pantalla", `${datos.dispositivo.viewport} @${datos.dispositivo.dpr}x · ${datos.dispositivo.nucleos ?? "?"} nucleos`],
    ["primer pintado", fmt(datos.pagina.primerPintado)],
    ["chunk mapa", `${fmt(datos.mapa.chunkPide)} pide, ${fmt(datos.mapa.chunkLlega)} llega, ${datos.mapa.chunkKB ?? "?"} KB`],
    ["constructor", fmt(datos.mapa.contextoWebGL)],
    ["primer dibujo", fmt(datos.mapa.primerDibujo)],
    ["mapa cargado", fmt(datos.mapa.load)],
    ["primera tesela", fmt(datos.teselas.primeraCargada)],
    ["encuadre listo", fmt(datos.mapa.idle)],
    ["teselas", `${datos.teselas.cargadas} en total · ${datos.teselas.enElArranque} en el arranque · ${datos.teselas.enElRecorrido} al recorrer`],
    ["ultima tesela", fmt(datos.teselas.ultimaCargada)],
    ["calentador", datos.calentador.corrio ? `${datos.calentador.teselas} teselas en ${fmt(datos.calentador.ms)}` : `NO CORRIO: ${datos.calentador.motivo}`],
    ["ahorro de datos", String(datos.red.ahorroDatos ?? "?")],
    ["diagnostico", `${datos.diagnostico.recursosVistos} recursos, ${datos.diagnostico.chunksJS} chunks JS`],
  ];

  return (
    <div
      className="fixed left-2 right-2 bottom-2 z-[9999] rounded-2xl border border-white/15 bg-black/90 p-3 font-mono text-[11px] leading-[1.5] text-white backdrop-blur"
      style={{ maxHeight: abierto ? "62vh" : "auto", overflow: "auto" }}
    >
      <div className="mb-2 flex items-center gap-2">
        <b className="text-[12px]">Medicion</b>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-lg border border-white/20 px-2 py-1"
        >
          {abierto ? "Ocultar" : "Ver"}
        </button>
        <button
          type="button"
          onClick={copiar}
          className="ml-auto rounded-lg bg-white px-3 py-1 font-bold text-black"
        >
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      {abierto && (
        <table className="w-full">
          <tbody>
            {filas.map(([k, v]) => (
              <tr key={k}>
                <td className="pr-2 align-top text-white/55">{k}</td>
                <td className="align-top">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {abierto && (
        <p className="mt-2 text-[10px] text-white/45">
          Recorre la pagina entera, en movil avanzando con el panel de pasos de abajo, y despues pulsa Copiar. Las teselas siguen contando mientras avanzas.
        </p>
      )}
    </div>
  );
}
