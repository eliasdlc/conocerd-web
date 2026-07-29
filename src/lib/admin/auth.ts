// ─────────────────────────────────────────────────────────────────────────────
//  Acceso al panel interno (/admin).
//
//  Somos dos personas mirando una lista de correos: no hace falta un proveedor
//  de identidad, hace falta que nadie de fuera entre. Una contraseña compartida
//  (`ADMIN_PASSWORD`) canjea una cookie firmada con HMAC-SHA256; la clave del
//  HMAC es la propia contraseña, así que cambiarla invalida todas las sesiones
//  abiertas — que es exactamente lo que quieres si se filtra.
//
//  Lo que esto NO es: multiusuario, con roles ni con revocación individual. Si
//  algún día entra más gente al panel, esto se cambia por auth de verdad.
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from "next/headers";

export const ADMIN_COOKIE = "crd_admin";

/** Una semana: suficiente para no re-loguear cada día, corto para un secreto compartido. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SIGNATURE_PREFIX = "crd-admin-v1";

function adminPassword(): string | undefined {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : undefined;
}

/** Sin `ADMIN_PASSWORD` el panel no se abre: no hay modo "sin contraseña". */
export function isAdminConfigured(): boolean {
  return adminPassword() !== undefined;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Comparación en tiempo constante. Con `===` el tiempo de respuesta depende de
 * cuántos caracteres coinciden, y eso deja adivinar la firma byte a byte.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifica la contraseña escrita en el formulario, también en tiempo constante. */
export function passwordMatches(candidate: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return timingSafeEqual(candidate, expected);
}

async function issueToken(): Promise<string | null> {
  const secret = adminPassword();
  if (!secret) return null;
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const signature = await sign(`${SIGNATURE_PREFIX}:${expiresAt}`, secret);
  return `${expiresAt}.${signature}`;
}

async function tokenIsValid(token: string | undefined): Promise<boolean> {
  const secret = adminPassword();
  if (!secret || !token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || !signature) return false;
  if (expiresAt < Date.now()) return false;
  const expected = await sign(`${SIGNATURE_PREFIX}:${rawExpiry}`, secret);
  return timingSafeEqual(signature, expected);
}

/** Abre la sesión. Sólo se puede llamar desde una Server Function o Route Handler. */
export async function startAdminSession(): Promise<void> {
  const token = await issueToken();
  if (!token) return;
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/** `true` si quien pide tiene una cookie firmada y vigente. */
export async function hasAdminSession(): Promise<boolean> {
  const store = await cookies();
  return tokenIsValid(store.get(ADMIN_COOKIE)?.value);
}

/** Variante para Route Handlers, donde la cookie llega en la petición. */
export async function requestHasAdminSession(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  return tokenIsValid(token ? decodeURIComponent(token) : undefined);
}
