import type { Metadata } from "next";
import AccountDeletionFlow from "./AccountDeletionFlow";

export const metadata: Metadata = {
  title: "Eliminar mi cuenta",
  description:
    "Autentícate para solicitar de forma segura la eliminación de tu cuenta de ConoceRD.",
};

const DELETED_DATA = [
  "Perfil y correo",
  "Entradas del diario",
  "Fotos",
  "Rutas privadas",
  "Progreso",
  "Solicitudes",
];

export default function EliminarCuentaPage() {
  return (
    <article>
      <h1>Eliminar mi cuenta</h1>
      <p>
        Primero revisa qué ocurrirá. Después tendrás que autenticarte con la cuenta exacta que
        quieres eliminar.
      </p>

      <div className="mt-7 grid gap-6 desk:grid-cols-2">
        <section>
          <h2 className="mt-0">Se borra</h2>
          <ul>
            {DELETED_DATA.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mt-0">Se conserva</h2>
          <p>
            El texto y el rating de tus reseñas se conservan para no romper la conversación
            pública, pero quedan anónimos y dejan de estar vinculados a tu cuenta.
          </p>
        </section>
      </div>

      <AccountDeletionFlow />
    </article>
  );
}
