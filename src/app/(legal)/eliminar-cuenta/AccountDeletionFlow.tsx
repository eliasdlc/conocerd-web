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

const firebaseConfig = parseFirebasePublicConfig(firebasePublicEnvironment);
const configuredAuth = firebaseConfig.ok
  ? getFirebaseAuth(firebaseConfig.config)
  : null;

function authErrorMessage() {
  return "No pudimos autenticar esa cuenta. Revisa tus credenciales e inténtalo de nuevo.";
}

async function responseErrorMessage(response: Response) {
  const fallback = "No pudimos eliminar tu cuenta. Tu cuenta sigue activa.";
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
      <section className="mt-8 border-l-4 border-mango bg-mango-soft p-5" role="status">
        <h2 className="mt-0">Configuración pendiente</h2>
        <p>
          Este formulario todavía no puede autenticar tu cuenta. Puedes escribir a{" "}
          <a href="mailto:contacto@conocerd.app">contacto@conocerd.app</a> mientras se
          completa la configuración.
        </p>
        <p className="mb-0 font-mono text-tiny">
          Faltan: {firebaseConfig.ok ? "configuración de Firebase" : firebaseConfig.missing.join(", ")}
        </p>
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
            : "No pudimos eliminar tu cuenta. Tu cuenta sigue activa.",
      });
    }
  }

  if (workflow.screen === "success") {
    return (
      <section className="mt-8 border-l-4 border-mint bg-mint-soft p-5" role="status">
        <h2 className="mt-0">Tu cuenta fue eliminada</h2>
        <p className="mb-0">
          La sesión se cerró y tus reseñas quedaron anónimas. Ya no hay una cuenta activa
          asociada a esta sesión.
        </p>
      </section>
    );
  }

  if (workflow.screen === "confirm" || workflow.screen === "deleting") {
    return (
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="mt-0">Confirma la cuenta</h2>
        <div className="mb-5 bg-cream-2 p-4">
          {workflow.account?.displayName && (
            <p className="mb-1 font-bold">{workflow.account.displayName}</p>
          )}
          <p className="mb-0 font-mono text-sm">{workflow.account?.email}</p>
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
            className="min-h-11 rounded-full bg-coral px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!workflow.acknowledged || workflow.screen === "deleting"}
            onClick={deleteAccount}
          >
            {workflow.screen === "deleting" ? "Eliminando cuenta..." : "Eliminar mi cuenta"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border-2 border-ink px-5 font-bold text-ink disabled:opacity-45"
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
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="mt-0">Autentícate para continuar</h2>
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
            className="min-h-12 border border-line bg-white px-3 font-normal"
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
            className="min-h-12 border border-line bg-white px-3 font-normal"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="min-h-12 rounded-full bg-ink px-5 font-bold text-white disabled:opacity-45"
          disabled={authenticating || !sessionReady}
        >
          {sessionReady ? "Entrar con correo y contraseña" : "Preparando autenticación..."}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-muted-2" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-tiny uppercase">o</span>
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
