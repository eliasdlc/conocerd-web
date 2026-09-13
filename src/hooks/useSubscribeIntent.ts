"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Puente entre los CTAs repartidos por la página y el único formulario.
//
//  "Registrar mi negocio" (ViajerosNegociosSection) y "Unirme a la lista"
//  (Nav) tienen
//  que hacer scroll al CTA *y* dejar el toggle en la audiencia correcta. Ambos
//  viven en overlays distintos sin ancestro común útil, así que el mensaje va
//  por un evento del window en vez de por un contexto que envolvería todo el
//  journey sólo para esto.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { scrollToSection } from "@/lib/journeyNav";
import type { Audience } from "@/lib/waitlist/constants";

const EVENT = "crd:subscribe-intent";

/** Lleva a la persona al formulario con la audiencia ya elegida. */
export function requestSubscribe(audience: Audience) {
  window.dispatchEvent(new CustomEvent<Audience>(EVENT, { detail: audience }));
  scrollToSection("trigger-cta");
}

/** Audiencia pedida por el último CTA, o `initial` si nadie ha pedido nada. */
export function useSubscribeIntent(initial: Audience = "viajero"): Audience {
  const [audience, setAudience] = useState<Audience>(initial);
  useEffect(() => {
    const onIntent = (e: Event) => setAudience((e as CustomEvent<Audience>).detail);
    window.addEventListener(EVENT, onIntent);
    return () => window.removeEventListener(EVENT, onIntent);
  }, []);
  return audience;
}
