"use client";
// Variante 1 de Viajeros+Negocios unificados — pendiente de generar
// (placeholder: re-exporta las secciones actuales).
import ViajerosSection from "@/sections/ViajerosSection";
import NegociosSection from "@/sections/NegociosSection";
export default function VNVariant1() {
  return (
    <>
      <ViajerosSection />
      <NegociosSection />
    </>
  );
}
