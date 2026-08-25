"use client";

import { useEffect, useReducer, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  firebasePublicEnvironment,
  parseFirebasePublicConfig,
} from "@/lib/firebase/config";
import {
  deletionWorkflowReducer,
  initialDeletionWorkflowState,
} from "@/lib/account-deletion/workflow";
import Icon from "@/components/Icon";

const firebaseConfig = parseFirebasePublicConfig(firebasePublicEnvironment);
const configuredAuth = firebaseConfig.ok
  ? getFirebaseAuth(firebaseConfig.config)
  : null;

function authErrorMessage() {
  return "No pudimos autenticar esa cuenta. Revisa tus credenciales e inténtalo de nuevo.";
}

async function responseErrorMessage(response: Response) {
  const fallback = "No pudimos confirmar el borrado. Vuelve a entrar para comprobar si tu cuenta sigue existiendo.";
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
    ) {
      return body.message;
    }
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error !== "internal"
    ) {
      return body.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export default function AccountDeletionFlow() {
  const [workflow, dispatch] = useReducer(
    deletionWorkflowReducer,
    initialDeletionWorkflowState,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);

  useEffect(() => {
    if (!configuredAuth) return;
    const sessionAuth = configuredAuth;
    let active = true;
    let stopListening: (() => void) | undefined;

    async function prepareFreshSession() {
      try {
        await sessionAuth.authStateReady();
        if (sessionAuth.currentUser) {
          await signOut(sessionAuth);
        }
        if (!active) return;

        stopListening = onAuthStateChanged(sessionAuth, (user) => {
          if (!user) {
            dispatch({ type: "signed-out" });
            return;
          }

          dispatch({
            type: "authenticated",
            account: {
              email: user.email ?? "Cuenta de Firebase sin correo visible",
              displayName: user.displayName,
            },
          });
        });
        setSessionReady(true);
      } catch {
        if (!active) return;
        setAuthenticationError(
          "No pudimos preparar una sesión segura. Recarga la página e inténtalo de nuevo.",
        );
      }
    }

    void prepareFreshSession();

    return () => {
      active = false;
      stopListening?.();
    };
  }, []);

  if (!firebaseConfig.ok || !configuredAuth) {
    return (
      <section className="rounded-surface border border-mango/30 bg-paper p-6 shadow-e1" role="status">
        <span className="grid size-11 place-items-center rounded-chip bg-mango-soft text-mango-ink">
          <Icon name="lock" className="text-feature" />
        </span>
        <p className="mb-1 mt-5 font-label text-micro font-bold uppercase tracking-[.14em] text-mango-ink">
          Servicio temporalmente no disponible
        </p>
        <h2 className="mt-0 text-[22px]">Solicita ayuda por correo</h2>
        <p className="text-muted">
          Todavía no podemos verificar tu identidad desde esta página. Tu cuenta sigue activa y
          no se ha enviado ninguna solicitud.
        </p>
        <a
          href="mailto:contacto@conocerd.app?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta"
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 font-bold text-white! no-underline shadow-sticker"
        >
          <Icon name="mail" className="text-lg" />
          Escribir a soporte
        </a>
      </section>
    );
  }

  const auth = configuredAuth;

  async function authenticateWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthenticating(true);
    setAuthenticationError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch {
      setAuthenticationError(authErrorMessage());
    } finally {
      setAuthenticating(false);
    }
  }

  async function authenticateWithGoogle() {
    setAuthenticating(true);
    setAuthenticationError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setAuthenticationError(authErrorMessage());
    } finally {
      setAuthenticating(false);
    }
  }

  async function deleteAccount() {
    if (!workflow.acknowledged || !auth.currentUser) return;
    dispatch({ type: "deletion-started" });

    try {
      const idToken = await auth.currentUser.getIdToken(true);
      const response = await fetch("/api/account-delete", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
      });
      if (response.status === 401) {
        // La sesión pasó del límite de frescura del API: se cierra y el flujo
        // vuelve a la identificación en vez de dejar una sesión inservible.
        const message = await responseErrorMessage(response);
        await signOut(auth);
        throw new Error(message);
      }
      if (!response.ok) {
        throw new Error(await responseErrorMessage(response));
      }

      await signOut(auth);
      dispatch({ type: "deletion-succeeded" });
    } catch (error) {
      dispatch({
        type: "deletion-failed",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos confirmar el borrado. Vuelve a entrar para comprobar si tu cuenta sigue existiendo.",
      });
    }
  }

  if (workflow.screen === "success") {
    return (
      <section className="rounded-surface border border-mint/35 bg-paper p-6 shadow-e1" role="status">
        <span className="grid size-11 place-items-center rounded-chip bg-mint-soft text-mint-ink">
          <Icon name="check_circle" className="text-feature" />
        </span>
        <p className="mb-1 mt-5 font-label text-micro font-bold uppercase tracking-[.14em] text-mint-ink">
          Proceso completado
        </p>
        <h2 className="mt-0 text-[22px]">Tu cuenta fue eliminada</h2>
        <p className="mb-0">
          La sesión se cerró y tus reseñas quedaron anónimas. Ya no hay una cuenta activa
          asociada a esta sesión.
        </p>
      </section>
    );
  }

  if (workflow.screen === "confirm" || workflow.screen === "deleting") {
    return (
      <section className="rounded-surface border border-coral/25 bg-paper p-6 shadow-e1">
        <p className="mb-1 font-label text-micro font-bold uppercase tracking-[.14em] text-coral-ink">
          Paso 2 de 3
        </p>
        <h2 className="mt-0 text-[22px]">Confirma la cuenta</h2>
        <div className="mb-5 rounded-block bg-cream-2 p-4">
          {workflow.account?.displayName && (
            <p className="mb-1 font-bold">{workflow.account.displayName}</p>
          )}
          <p className="mb-0 text-sm">{workflow.account?.email}</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-coral"
            checked={workflow.acknowledged}
            disabled={workflow.screen === "deleting"}
            onChange={(event) =>
              dispatch({ type: "acknowledged", value: event.target.checked })
            }
          />
          <span>
            Entiendo que esta acción es irreversible y que no podré recuperar los datos que
            se borran.
          </span>
        </label>

        {workflow.error && (
          <p className="mt-4 border-l-4 border-coral bg-coral-soft p-3" role="alert">
            {workflow.error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-12 rounded-full bg-coral px-5 font-bold text-white shadow-sticker disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!workflow.acknowledged || workflow.screen === "deleting"}
            onClick={deleteAccount}
          >
            {workflow.screen === "deleting" ? "Eliminando cuenta..." : "Eliminar mi cuenta"}
          </button>
          <button
            type="button"
            className="min-h-12 rounded-full border-2 border-ink px-5 font-bold text-ink disabled:opacity-45"
            disabled={workflow.screen === "deleting"}
            onClick={() => void signOut(auth)}
          >
            Usar otra cuenta
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-surface border border-line bg-paper p-6 shadow-e1">
      <p className="mb-1 font-label text-micro font-bold uppercase tracking-[.14em] text-mint-ink">
        Paso 1 de 3
      </p>
      <h2 className="mt-0 text-[22px]">Inicia sesión para continuar</h2>
      <p>
        El correo solo se usa como credencial de acceso. Una dirección escrita aquí nunca se
        acepta por sí sola como solicitud de borrado.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={authenticateWithEmail}>
        <label className="grid gap-1.5 font-bold">
          Correo de tu cuenta
          <input
            type="email"
            autoComplete="email"
            required
            className="h-12 rounded-ctrl border border-muted-2 bg-paper px-3.5 font-sans text-body text-ink placeholder:text-muted outline-none focus:border-ink"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 font-bold">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            className="h-12 rounded-ctrl border border-muted-2 bg-paper px-3.5 font-sans text-body text-ink placeholder:text-muted outline-none focus:border-ink"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="min-h-12 rounded-full bg-ink px-5 font-bold text-white shadow-sticker disabled:opacity-45"
          disabled={authenticating || !sessionReady}
        >
          {sessionReady ? "Entrar con correo y contraseña" : "Preparando autenticación..."}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="font-label text-tiny uppercase">o</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        className="min-h-12 w-full rounded-full border-2 border-ink bg-transparent px-5 font-bold text-ink disabled:opacity-45"
        disabled={authenticating || !sessionReady}
        onClick={authenticateWithGoogle}
      >
        Continuar con Google
      </button>

      {authenticationError && (
        <p className="mt-4 border-l-4 border-coral bg-coral-soft p-3" role="alert">
          {authenticationError}
        </p>
      )}
    </section>
  );
}
