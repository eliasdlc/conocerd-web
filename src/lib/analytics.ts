// ─────────────────────────────────────────────────────────────────────────────
//  Analítica mínima del embudo de la lista de espera (audit 5.7).
//
//  Tres eventos y nada más: ver el formulario, intentar enviarlo y conseguirlo.
//  Con eso se calculan las dos tasas que importan —vista→envío (¿convence el
//  copy?) y envío→éxito (¿estorba el formulario?)— y se puede comparar el antes
//  y el después del rediseño. Sin esta línea base, la Fase D se evalúa a ojo.
//
//  El `source` distingue el CTA de la home de la página del QR, que compiten
//  por el mismo registro con contextos muy distintos.
// ─────────────────────────────────────────────────────────────────────────────

import { track } from "@vercel/analytics";

export type WaitlistAudience = "viajero" | "negocio";

/** De dónde salió el registro: el prop `source` de SubscribeForm. */
type Source = string | undefined;

interface Common {
  source: Source;
  audience: WaitlistAudience;
}

const props = ({ source, audience }: Common) => ({
  source: source ?? "desconocido",
  audience,
});

/** El formulario entró en pantalla. Una vez por montaje, no por scroll. */
export function trackWaitlistView(common: Common) {
  track("waitlist_view", props(common));
}

/** El usuario pulsó enviar y la petición salió. */
export function trackWaitlistSubmit(common: Common) {
  track("waitlist_submit", props(common));
}

/** El registro quedó guardado. `already` separa altas nuevas de repetidas. */
export function trackWaitlistSuccess(common: Common & { already: boolean }) {
  track("waitlist_success", { ...props(common), already: common.already });
}

/**
 * El envío no llegó a registro. `reason` distingue el fallo de validación del
 * de red: son dos problemas distintos y sólo uno se arregla con diseño.
 */
export function trackWaitlistError(common: Common & { reason: "validacion" | "red" }) {
  track("waitlist_error", { ...props(common), reason: common.reason });
}
