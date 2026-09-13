// ─────────────────────────────────────────────────────────────────────────────
//  Constantes de la lista de espera: el vocabulario compartido entre el
//  formulario y el servidor. Vive aparte de `schema.ts` porque este archivo NO
//  puede importar zod: el formulario sólo necesita estas listas para pintar sus
//  campos, y arrastrar el validador entero al navegador costaba 278 KB.
//
//  El catálogo de tipos de negocio salió a `business-types.ts` cuando pasó de 6
//  entradas a 27 con sinónimos: es una tabla, no una constante.
//
//  La validación con zod corre únicamente en el Route Handler y sigue en
//  `schema.ts`, que sí importa de aquí.
// ─────────────────────────────────────────────────────────────────────────────

export const AUDIENCES = ["viajero", "negocio"] as const;
export type Audience = (typeof AUDIENCES)[number];

/**
 * Campo trampa para bots. Se renderiza oculto y con `autocomplete="off"`:
 * una persona nunca lo llena, un bot que rellena todo sí. Si viene con
 * contenido respondemos 200 sin guardar (no le decimos al bot que lo pillamos).
 */
export const HONEYPOT_FIELD = "empresa_web";

/** Respuesta del endpoint. El cliente sólo necesita distinguir estos casos. */
export type SubscribeResult =
  | { ok: true; status: "created" | "already_subscribed" }
  | { ok: false; error: string; fields?: Record<string, string> };
