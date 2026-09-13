// ─────────────────────────────────────────────────────────────────────────────
//  Validación de la lista de espera. Corre SÓLO en el servidor: el Route
//  Handler es el único que hace `safeParse`, así que zod nunca llega al
//  navegador. El vocabulario que el formulario sí necesita vive sin zod en
//  `constants.ts` (audiencias, honeypot) y en `business-types.ts` (el catálogo
//  de tipos), y se importa desde allí en los dos lados.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { AUDIENCES, HONEYPOT_FIELD } from "@/lib/waitlist/constants";
import { BUSINESS_TYPES, BUSINESS_TYPE_OTHER_MAX, OTHER_BUSINESS_TYPE } from "@/lib/waitlist/business-types";

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

/**
 * La gente escribe su Instagram de cinco formas distintas: `@casona`,
 * `casona`, `instagram.com/casona`, la URL completa y la URL con `?igsh=…`
 * que copia la propia app al compartir. Guardamos siempre el handle canónico
 * (sin `@`, en minúsculas) para poder deduplicar y construir la URL nosotros.
 */
export function normalizeInstagram(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase();
}

/** Reglas de Instagram: 1–30 caracteres, letras, números, punto y guion bajo. */
const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

export const instagramField = z
  .string()
  .max(120)
  .transform(normalizeInstagram)
  .transform((v) => (v.length ? v : undefined))
  .optional()
  .refine((v) => v === undefined || INSTAGRAM_HANDLE.test(v), {
    message: "Usuario de Instagram inválido (ej. @conocerd)",
  });

export const subscribeSchema = z
  .object({
    audience: z.enum(AUDIENCES),
    email,
    /** Nombre de la persona (viajero) o de quien registra el negocio. */
    name: optionalText(120),
    /** Solo negocio: obligatorio. */
    businessName: optionalText(160),
    /** Solo negocio: obligatorio. Vocabulario cerrado (`business-types.ts`). */
    businessType: z.enum(BUSINESS_TYPES).optional(),
    /**
     * Lo que la persona escribió cuando su tipo no está en el catálogo. Solo
     * tiene sentido junto a `otro`; con cualquier otro tipo se descarta abajo.
     * Es la única forma de enterarnos de qué tipos nos faltan.
     */
    businessTypeOther: optionalText(BUSINESS_TYPE_OTHER_MAX),
    /** Solo negocio: opcional, para contactar rápido tras el evento. */
    whatsapp: optionalText(40),
    /**
     * Solo negocio: opcional. Hoy es la única vitrina que muchos negocios de RD
     * tienen en línea, así que es la fuente más rápida de fotos y horarios para
     * armar su perfil antes del lanzamiento.
     */
    instagram: instagramField,
    /** De dónde vino la persona: `?ref=expo-ozrd` en la landing del QR. */
    ref: optionalText(60),
    /** Consentimiento explícito; se guarda con timestamp (ver 2.5 del plan). */
    consent: z.literal(true, "Necesitamos tu consentimiento para escribirte"),
    [HONEYPOT_FIELD]: z.string().max(200).optional(),
  })
  .refine((v) => v.audience !== "negocio" || Boolean(v.businessName), {
    message: "Dinos el nombre de tu negocio",
    path: ["businessName"],
  })
  // El tipo es obligatorio para un negocio. Antes el `<select>` venía
  // preseleccionado y respondía "restaurante" por quien no lo miraba, así que
  // el campo nunca llegaba vacío y su métrica mezclaba las dos cosas.
  .refine((v) => v.audience !== "negocio" || Boolean(v.businessType), {
    message: "Dinos qué tipo de negocio o lugar es",
    path: ["businessType"],
  })
  .transform((v) => ({
    ...v,
    businessTypeOther:
      v.businessType === OTHER_BUSINESS_TYPE ? v.businessTypeOther : undefined,
  }));

export type SubscribeInput = z.infer<typeof subscribeSchema>;
