"use client";

// La herramienta es puramente de cliente (localStorage, tamaño de ventana,
// postMessage con el lienzo): prerenderizarla solo producía un HTML que no
// coincidía con el primer render real. Sin SSR no hay hidratación que casar.
import dynamic from "next/dynamic";

const Herramienta = dynamic(() => import("./herramienta"), { ssr: false });

export default function CamaraPage() {
  return <Herramienta />;
}
