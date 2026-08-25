"use client";

// Puerta del panel interno. Era la única superficie del repo fuera del sistema:
// estilos en línea, Plus Jakarta escrita en literal y un botón de degradado
// coral con halo. Ahora es la card del panel y nada más: un panel interno no
// inventa su propio idioma.

import { useActionState, useState } from "react";

import Kicker from "@/components/Kicker";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(login, INITIAL);
  // Controlado a propósito: React 19 vacía los campos no controlados de un
  // `<form action>` cuando la acción termina, también si terminó en error. Sin
  // esto, tras fallar una vez el campo queda vacío y el segundo intento lo
  // bloquea el navegador con "Please fill out this field" mientras sigue
  // visible el "Contraseña incorrecta" del intento anterior.
  const [password, setPassword] = useState("");

  return (
    <main className="grid min-h-dvh place-items-center bg-[linear-gradient(180deg,var(--color-cream)_0%,var(--color-cream-2)_100%)] p-6">
      <form
        action={formAction}
        className="w-[min(380px,100%)] rounded-surface border border-line bg-paper px-6 pb-[22px] pt-[26px] shadow-e1"
      >
        <Kicker icon="lock" variant="pill" tone="mint">
          Interno
        </Kicker>

        <h1 className="mb-1.5 mt-3.5 font-display text-2xl font-bold tracking-[-.025em] text-ink">
          Panel de la lista
        </h1>
        <p className="mb-[18px] text-copy leading-[1.5] text-muted">
          {configured
            ? "Registros de viajeros y negocios de /lista."
            : "Falta configurar ADMIN_PASSWORD en las variables de entorno."}
        </p>

        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={!configured}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          aria-label="Contraseña del panel"
          aria-invalid={Boolean(state.error)}
          // Borde `muted-2` y no `line`: con `line` el campo daba 1.25:1 contra
          // el papel y desaparecía.
          className="h-12 w-full rounded-ctrl border border-muted-2 bg-paper px-3.5 font-sans text-body text-ink placeholder:text-muted disabled:opacity-60"
        />

        {/* A 15 el coral no pasa (3.81:1 sólo vale desde 19 w700): el relleno
            del sistema por debajo de ese cuerpo es `selected`, 17.39:1. El
            degradado con halo del sistema viejo muere aquí. */}
        <button
          type="submit"
          disabled={pending || !configured}
          className="mt-2.5 h-12 w-full cursor-pointer rounded-full border-none bg-selected font-label text-body font-bold text-on-selected disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>

        <p role="alert" aria-live="assertive" className="mx-0.5 mb-0 mt-2.5 text-copy text-danger">
          {state.error}
        </p>
      </form>
    </main>
  );
}
