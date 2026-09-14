"use client";

import { DESTINATIONS } from "@/data/destinations";
import { useClima } from "@/context/ClimaContext";
import { grados } from "@/lib/clima/etiquetas";
import { extremosDeClima } from "@/lib/clima/extremos";

// La línea que abre Tu ruta: la hora en el país y sus dos extremos de ahora
// mismo, con nombre. Sin dato, o sin contraste entre destinos, no se renderiza
// y la intro queda como estaba.
export default function ClimaAhora({ className = "" }: { className?: string }) {
  const clima = useClima();
  if (!clima) return null;
  const ext = extremosDeClima(clima.destinos);
  if (!ext) return null;
  const nombre = (id: string) => DESTINATIONS.find((d) => d.id === id)?.name ?? id;
  return (
    <div className={className}>
      <p className="m-0 font-display text-[15px] font-bold leading-tight tracking-[-.01em] text-ink">
        Ahora mismo en RD, {clima.hora}
      </p>
      <p className="m-0 mt-0.5 text-tiny leading-[1.5] text-ink-3">
        {grados(ext.caliente.temp)} en {nombre(ext.caliente.id)} y {grados(ext.frio.temp)} en{" "}
        {nombre(ext.frio.id)}. A la misma hora, a unas horas de carro.
      </p>
    </div>
  );
}
