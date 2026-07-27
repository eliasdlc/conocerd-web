// ─────────────────────────────────────────────────────────────────────────────
//  Contrato de la lista de espera: un solo esquema compartido entre el
//  formulario (cliente) y el Route Handler (servidor). Si cambia un campo,
//  cambia aquí y ambos lados fallan a la vez — que es lo que queremos.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

export const AUDIENCES = ["viajero", "negocio"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Tipos de negocio que ofrecemos en el selector. `otro` es la salida de emergencia. */
export const BUSINESS_TYPES = [
  "restaurante",
  "hospedaje",
  "tour",
  "transporte",
  "tienda",
  "otro",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurante: "Restaurante o bar",
  hospedaje: "Hospedaje",
  tour: "Tours y experiencias",
  transporte: "Transporte",
  tienda: "Tienda o artesanía",
  otro: "Otro",
};

/**
 * Campo trampa para bots. Se renderiza oculto y con `autocomplete="off"`:
 * una persona nunca lo llena, un bot que rellena todo sí. Si viene con
 * contenido respondemos 200 sin guardar (no le decimos al bot que lo pillamos).
 */
export const HONEYPOT_FIELD = "empresa_web";

// Normaliza *antes* de validar: los teclados móviles capitalizan la primera
// letra y pegan espacios al final, y " Elias@Ejemplo.COM " es un correo válido
// que no podemos rechazar delante de alguien que acaba de escanear el QR.
const email = z
  .string()
  .max(254)
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.email("Correo inválido"));

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim())
    .transform((v) => (v.length ? v : undefined))
    .optional();

export const subscribeSchema = z
  .object({
    audience: z.enum(AUDIENCES),
    email,
    /** Nombre de la persona (viajero) o de quien registra el negocio. */
    name: optionalText(120),
    /** Solo negocio: obligatorio. */
    businessName: optionalText(160),
    businessType: z.enum(BUSINESS_TYPES).optional(),
    /** Solo negocio: opcional, para contactar rápido tras el evento. */
    whatsapp: optionalText(40),
    /** De dónde vino la persona: `?ref=expo-ozrd` en la landing del QR. */
    ref: optionalText(60),
    /** Consentimiento explícito; se guarda con timestamp (ver 2.5 del plan). */
    consent: z.literal(true, "Necesitamos tu consentimiento para escribirte"),
    [HONEYPOT_FIELD]: z.string().max(200).optional(),
  })
  .refine((v) => v.audience !== "negocio" || Boolean(v.businessName), {
    message: "Dinos el nombre de tu negocio",
    path: ["businessName"],
  });

export type SubscribeInput = z.infer<typeof subscribeSchema>;

/** Respuesta del endpoint. El cliente sólo necesita distinguir estos casos. */
export type SubscribeResult =
  | { ok: true; status: "created" | "already_subscribed" }
  | { ok: false; error: string; fields?: Record<string, string> };
