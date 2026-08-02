"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Sistema de variantes de diseño (exploración jul 2026).
//
//  Cada área en rework (mapa / viajeros+negocios / equipo) tiene 5 variantes
//  completas en src/variants/<area>/v1..v5.tsx. La URL decide cuál se monta:
//
//      /?var-mapa=3&var-vn=1&var-equipo=5
//
//  Sin query param se renderiza la sección actual (children del slot), y como
//  las variantes entran por dynamic import, ninguna pesa en el bundle si no se
//  pide. Cuando el dueño elija dirección, la ganadora se promueve a sección
//  real y este sistema se retira.
// ─────────────────────────────────────────────────────────────────────────────

import { createElement, useSyncExternalStore, type ComponentType } from "react";
import dynamic from "next/dynamic";

export const VARIANT_AREAS = ["mapa", "vn", "equipo"] as const;
export type VariantArea = (typeof VARIANT_AREAS)[number];

const load = (imp: () => Promise<{ default: ComponentType }>) =>
  dynamic(imp, { ssr: false });

const REGISTRY: Record<VariantArea, Record<string, ComponentType>> = {
  mapa: {
    "1": load(() => import("@/variants/mapa/v1")),
    "2": load(() => import("@/variants/mapa/v2")),
    "3": load(() => import("@/variants/mapa/v3")),
    "4": load(() => import("@/variants/mapa/v4")),
    "5": load(() => import("@/variants/mapa/v5")),
    // v6 = la síntesis final elegida por el dueño (ago 2026).
    "6": load(() => import("@/variants/mapa/v6")),
  },
  vn: {
    "1": load(() => import("@/variants/vn/v1")),
    "2": load(() => import("@/variants/vn/v2")),
    "3": load(() => import("@/variants/vn/v3")),
    "4": load(() => import("@/variants/vn/v4")),
    "5": load(() => import("@/variants/vn/v5")),
    "6": load(() => import("@/variants/vn/v6")),
  },
  equipo: {
    "1": load(() => import("@/variants/equipo/v1")),
    "2": load(() => import("@/variants/equipo/v2")),
    "3": load(() => import("@/variants/equipo/v3")),
    "4": load(() => import("@/variants/equipo/v4")),
    "5": load(() => import("@/variants/equipo/v5")),
    "6": load(() => import("@/variants/equipo/v6")),
  },
};

/** Lee ?var-<area>=N del URL en cliente (la home es estática: sin useSearchParams
 *  para no arrastrar un límite de Suspense, mismo criterio que SubscribeForm).
 *  useSyncExternalStore: el param no cambia en la sesión — el servidor sirve
 *  null y el cliente lee location una vez, sin setState en efecto. */
const noopSubscribe = () => () => {};

function useVariantParam(area: VariantArea): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        const params = new URLSearchParams(window.location.search);
        // `?final=1` = atajo del dueño: monta la síntesis v6 en las TRES
        // áreas a la vez para ver el journey completo con el diseño final.
        // Un `var-<area>` explícito le gana (permite comparar una área
        // contra el resto en final).
        return params.get(`var-${area}`) ?? (params.get("final") ? "6" : null);
      } catch {
        return null;
      }
    },
    () => null
  );
}

export function VariantSlot({
  area,
  children,
}: {
  area: VariantArea;
  children: React.ReactNode;
}) {
  const v = useVariantParam(area);
  // createElement y no JSX: los valores del registro son constantes de módulo
  // creadas por dynamic() — no se crean durante el render, pero el lint de
  // static-components no puede saberlo con la forma <Variant />.
  const variant = (v && REGISTRY[area][v]) || null;
  return variant ? createElement(variant) : <>{children}</>;
}
