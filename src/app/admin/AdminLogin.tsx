"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(180deg,#FDF8F0 0%,#F5EFE2 100%)",
      }}
    >
      <form
        action={formAction}
        style={{
          width: "min(380px,100%)",
          background: "#fff",
          border: "1px solid #EBE6D9",
          borderRadius: 22,
          padding: "26px 24px 22px",
          boxShadow: "0 18px 44px rgba(38,70,83,.10)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#C6F3EB",
            color: "#0C6A60",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          <span className="ms" aria-hidden="true" style={{ fontSize: 14 }}>
            lock
          </span>
          Interno
        </span>

        <h1
          style={{
            margin: "14px 0 6px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-.025em",
            color: "#1D3A45",
          }}
        >
          Panel de la lista
        </h1>
        <p style={{ margin: "0 0 18px", color: "#5B6B72", fontSize: 14, lineHeight: 1.5 }}>
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
          placeholder="Contraseña"
          aria-label="Contraseña del panel"
          aria-invalid={Boolean(state.error)}
          style={{
            width: "100%",
            height: 48,
            padding: "0 14px",
            borderRadius: 14,
            border: "1px solid #EBE6D9",
            background: "#fff",
            color: "#264653",
            fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
            fontSize: 15,
            outline: "none",
          }}
        />

        <button
          type="submit"
          disabled={pending || !configured}
          style={{
            width: "100%",
            height: 48,
            marginTop: 10,
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#FF6B4A,#F76C4D)",
            color: "#fff",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 15,
            cursor: pending || !configured ? "not-allowed" : "pointer",
            opacity: pending || !configured ? 0.7 : 1,
            boxShadow: "0 8px 22px rgba(247,108,77,.35)",
          }}
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>

        <p role="alert" aria-live="assertive" style={{ margin: "10px 2px 0", color: "#B23410", fontSize: 13 }}>
          {state.error}
        </p>
      </form>
    </main>
  );
}
