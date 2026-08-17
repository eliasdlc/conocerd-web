import type { Metadata } from "next";
import Icon from "@/components/Icon";
import Kicker from "@/components/Kicker";
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
    <article className="crd-account-deletion">
      <header className="max-w-[760px]">
        <Kicker icon="lock" tone="mint" className="mb-4">Privacidad y control</Kicker>
        <h1>Elimina tu cuenta y tus datos</h1>
        <p className="max-w-[660px] text-lead leading-[1.65] text-muted">
          Puedes hacerlo desde aquí sin instalar la app. Primero conoce qué ocurrirá y luego
          confirma que la cuenta realmente es tuya.
        </p>
      </header>

      <div className="mt-[clamp(30px,5vw,52px)] grid items-start gap-8 desk:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)] desk:gap-12">
        <div>
          <section aria-labelledby="datos-heading">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-tile bg-mango-soft text-mango-ink">
                <Icon name="verified" className="text-feature" />
              </span>
              <div>
                <Kicker icon="check" tone="mango">Antes de continuar</Kicker>
                <h2 id="datos-heading" className="mt-1">Qué pasa con tus datos</h2>
              </div>
            </div>

            <div className="grid gap-3 min-[620px]:grid-cols-2">
              <div className="rounded-card border border-coral/25 bg-coral-soft/65 p-5">
                <h3 className="mb-3 text-body font-bold text-coral-ink">Se borra</h3>
                <ul className="mb-0 space-y-2 pl-0! [list-style:none]!">
                  {DELETED_DATA.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Icon name="check" className="mt-1 shrink-0 text-sm text-coral-ink" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-card border border-mint/30 bg-mint-soft/65 p-5">
                <h3 className="mb-3 text-body font-bold text-mint-ink">Se conserva</h3>
                <p className="mb-0">
                  El texto y el rating de tus reseñas permanecen para no romper la conversación
                  pública. Quedan anónimos, sin nombre, foto ni vínculo con tu cuenta.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-9 border-t border-line pt-7" aria-labelledby="pasos-heading">
            <Kicker icon="arrow_forward" tone="coral">Un proceso seguro</Kicker>
            <h2 id="pasos-heading" className="mt-1">Tres pasos, sin intermediarios</h2>
            <ol className="mt-5 grid gap-4 pl-0 [list-style:none] min-[620px]:grid-cols-3">
              {[
                ["01", "Inicia sesión", "Usa la misma cuenta que quieres eliminar."],
                ["02", "Revisa", "Confirma el efecto sobre tus datos y reseñas."],
                ["03", "Elimina", "Acepta el borrado irreversible y recibe confirmación."],
              ].map(([number, title, copy]) => (
                <li key={number} className="border-t-2 border-ink/15 pt-3">
                  <span className="font-mono text-micro font-bold text-coral-ink">{number}</span>
                  <strong className="mt-1 block text-copy text-ink-2">{title}</strong>
                  <span className="mt-1 block text-copy leading-[1.55] text-muted">{copy}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside aria-label="Solicitud de eliminación">
          <AccountDeletionFlow />
          <p className="mt-4 text-center text-tiny leading-[1.55] text-muted-2">
            Nunca aceptamos un correo escrito como prueba de identidad.
          </p>
        </aside>
      </div>
    </article>
  );
}
