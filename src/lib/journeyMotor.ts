"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PROTOTIPO — selector del motor de cámara en escritorio.
//
//  Existe para comparar las tres opciones de la auditoría de rendimiento del
//  26 ago 2026 en una sola URL, sintiendo el scroll en vez de leyendo un
//  número. Se elige con `?motor=`:
//
//    (sin query)      "actual"  el motor de hoy: cada frame de scroll escribe
//                               la cámara completa con jumpTo.
//    ?motor=vuelos    "vuelos"  el scroll mueve solo los overlays; la cámara
//                               hace UN vuelo por keyframe al cruzarlo.
//    ?motor=pasos     "pasos"   escritorio adopta el motor del teléfono: sin
//                               scroll, avance discreto desde el panel.
//
//  Aparte, `?globo=off` corta la rotación en reposo del hero, que en
//  escritorio corre 10 s escribiendo la cámara por frame y es un problema
//  independiente del motor. Sirve para aislarlo de la comparación.
//
//  Nada de esto vive fuera del prototipo: el día que se elija un motor, este
//  módulo y sus tres consumidores se borran.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";

export type Motor = "actual" | "vuelos" | "pasos";

export interface JourneyMotor {
  motor: Motor;
  /** `false` con `?globo=off`: apaga la rotación en reposo del hero. */
  globo: boolean;
  /**
   * `?dpr=1` fija la resolución del buffer del mapa en vez de dejar que
   * MapLibre use `devicePixelRatio`. `undefined` = comportamiento de hoy.
   */
  dpr?: number;
  /**
   * `false` hasta que se lee la URL. Los motores se quedan quietos mientras
   * tanto, igual que hacen con el viewport: un frame conduciendo el motor
   * equivocado deja la cámara en otra escena.
   */
  resolved: boolean;
}

function parse(search: string): { motor: Motor; globo: boolean; dpr?: number } {
  const q = new URLSearchParams(search);
  const m = q.get("motor");
  const dpr = Number(q.get("dpr"));
  return {
    motor: m === "vuelos" || m === "pasos" ? m : "actual",
    globo: q.get("globo") !== "off",
    dpr: Number.isFinite(dpr) && dpr > 0 ? dpr : undefined,
  };
}

function subscribe(alCambiar: () => void) {
  window.addEventListener("popstate", alCambiar);
  return () => window.removeEventListener("popstate", alCambiar);
}

const leerCliente = () => window.location.search;
// `null` en servidor: la home es prerenderizada y ahí no hay query que leer.
// Es lo que hace `resolved` falso durante el render del servidor y la
// hidratación, sin que ningún motor conduzca todavía.
const leerServidor = () => null;

export function useJourneyMotor(): JourneyMotor {
  const search = useSyncExternalStore<string | null>(subscribe, leerCliente, leerServidor);
  if (search === null) return { motor: "actual", globo: true, resolved: false };
  return { ...parse(search), resolved: true };
}
