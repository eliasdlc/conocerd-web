"use client";

import { useEffect, useState } from "react";
import { marcar } from "@/lib/medicion/marcas";
import type { Informe } from "@/lib/medicion/sonda";

// ─────────────────────────────────────────────────────────────────────────────
//  El interruptor de la medición.
//
//  Sin `?medir` en la URL este componente devuelve null en el primer render y
//  no descarga nada: la sonda entera vive detrás de un `import()` que nunca
//  ocurre. Con `?medir` aparece el panel; con `?medir=mudo` la sonda corre sin
//  panel, que es como lo pide el script para que no salga en las capturas.
//
//  `window.__crdMedicion()` devuelve el informe completo en cualquier momento.
// ─────────────────────────────────────────────────────────────────────────────

type Leer = () => Informe;

function modoDeMedicion(): "no" | "panel" | "mudo" {
  if (typeof window === "undefined") return "no";
  const v = new URLSearchParams(window.location.search).get("medir");
  if (v === null) return "no";
  return v === "mudo" ? "mudo" : "panel";
}

export default function Medicion() {
  const [informe, setInforme] = useState<Informe | null>(null);

  useEffect(() => {
    const modo = modoDeMedicion();
    if (modo === "no") return;

    // El buffer de `resource` del navegador son 250 entradas y se llena a la
    // mitad del recorrido: sin esto el informe decía 14 teselas de relieve
    // donde el navegador había pedido 268. Se agranda antes de importar la
    // sonda, que es lo primero que hace falta para que las cuentas cierren.
    performance.setResourceTimingBufferSize(5000);

    let leer: Leer | null = null;
    let reloj = 0;
    let vivo = true;

    import("@/lib/medicion/sonda").then(({ arrancarSonda }) => {
      if (!vivo) return;
      leer = arrancarSonda();
      // La hidratación se anota DESPUÉS de conectar la sonda: es su primer hito
      // y sin ella el informe no sabría cuándo empezó a existir React.
      marcar("hidratado");
      if (modo === "panel") reloj = window.setInterval(() => setInforme(leer!()), 1000);
    });

    return () => {
      vivo = false;
      window.clearInterval(reloj);
    };
  }, []);

  if (!informe) return null;
  return <Panel informe={informe} />;
}

const ms = (n: number | null) => (n === null ? "·" : `${n}`);

/**
 * Denso y sin cromo, como todo documento de trabajo: negro, blanco y cifras.
 * Vive arriba a la izquierda, que es la única esquina que el recorrido no usa
 * (la píldora del nav va centrada, el riel a la derecha, el panel de pasos
 * abajo).
 */
function Panel({ informe }: { informe: Informe }) {
  const ultima = informe.escenas[informe.escenas.length - 1];
  const relieve = informe.red.find((g) => g.grupo === "relieve");
  return (
    <div
      className="pointer-events-none fixed left-2 top-2 z-[200] max-w-[280px] rounded-lg bg-black/92 p-2.5 font-mono text-[10px] leading-[1.5] text-white"
      // La medición no se lee con lector de pantalla ni sale en una captura de
      // accesibilidad: es un instrumento, no contenido.
      aria-hidden="true"
    >
      <div className="mb-1 font-bold tracking-[.12em] text-white/60">MEDICIÓN</div>
      <div>
        lcp {ms(informe.arranque.lcpMs)} · hidrata {ms(informe.arranque.hidratadoMs)}
      </div>
      <div>
        mapa {ms(informe.arranque.mapaLoadMs)} · quieto {ms(informe.arranque.mapaQuietoMs)}
      </div>
      <div className="mt-1 text-white/60">
        {informe.totales.peticiones} peticiones · {informe.totales.kb} KB
        {relieve ? ` · relieve ${relieve.peticiones}/${relieve.kb} KB` : ""}
      </div>
      {ultima && (
        <div className="mt-1 border-t border-white/15 pt-1">
          <div className="text-white/60">paso {ultima.escena}</div>
          <div>
            vuelo {ms(ultima.vueloMs)} · +quieto {ms(ultima.hastaQuietoMs)}
          </div>
          <div>
            {ultima.fps ?? "·"} fps · {ultima.framesLargos} frames &gt;50ms · peor{" "}
            {ms(ultima.peorFrameMs)}
          </div>
          <div className="text-white/60">
            tras llegar: {ultima.teselasTarde} teselas + {ultima.relieveTarde} relieve ={" "}
            {ultima.kbTarde} KB
          </div>
        </div>
      )}
    </div>
  );
}
