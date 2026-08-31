"use client";

// La herramienta es puramente de cliente (localStorage, tamaño de ventana,
// postMessage con el lienzo): prerenderizarla solo producía un HTML que no
// coincidía con el primer render real. Sin SSR no hay hidratación que casar.
//
// Es andamiaje de desarrollo, no una pieza del sitio: fuera de producción, con
// la misma guarda que /dev/email-assets.
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

const Herramienta = dynamic(() => import("./herramienta"), { ssr: false });

export default function CamaraPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <Herramienta />;
}
