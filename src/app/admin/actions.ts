"use server";

// ─────────────────────────────────────────────────────────────────────────────
//  Entrada y salida del panel interno.
//
//  Server Functions y no un Route Handler: el formulario de login funciona sin
//  JavaScript (progressive enhancement de `<form action>`) y la cookie se
//  escribe en la misma vuelta que el re-render.
// ─────────────────────────────────────────────────────────────────────────────

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { endAdminSession, isAdminConfigured, passwordMatches, startAdminSession } from "@/lib/admin/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";

// Más estricto que /api/subscribe: aquí un bucle de intentos es exactamente el
// ataque que importa, y nosotros dos nunca vamos a fallar 8 veces en 5 minutos.
const LOGIN_RATE_LIMIT = { limit: 8, windowMs: 5 * 60_000 };

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: "El panel no está configurado: falta ADMIN_PASSWORD." };
  }

  const ip = clientIp(await headers());
  const limit = rateLimit(`admin-login:${ip}`, LOGIN_RATE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Demasiados intentos. Espera ${limit.retryAfterSeconds} segundos.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    return { error: "Contraseña incorrecta." };
  }

  await startAdminSession();
  revalidatePath("/admin");
  return { error: null };
}

export async function logout(): Promise<void> {
  await endAdminSession();
  revalidatePath("/admin");
}
