"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Lo que ocupa el lugar del formulario cuando el registro entra.
//
//  Un registro por correo no devuelve nada tangible, así que el logro hay que
//  fabricarlo: un sello que se dibuja y estampa, confeti que se apaga solo, y
//  acto seguido la única acción que sí puede hacer ahora mismo — seguirnos en
//  Instagram. El botón de Instagram es el foco visual del panel a propósito:
//  sin él, el éxito es un callejón sin salida.
// ─────────────────────────────────────────────────────────────────────────────

import Confetti from "./Confetti";
import InstagramGlyph from "./InstagramGlyph";
import Icon, { type IconName } from "@/components/Icon";
import { CONTENT, INSTAGRAM } from "./content";
import type { Audience } from "@/lib/waitlist/schema";

// La clase es una constante literal, no una plantilla: Tailwind escanea el
// código fuente en busca de nombres de clase, así que una clase construida por
// interpolación nunca se generaría. El retardo, que sí varía, va por style.
const IN = "animate-[crdListaIn_.5s_cubic-bezier(.16,1,.3,1)_both]";

/** Sello de fundador: el anillo se dibuja, el check entra detrás y el conjunto
 *  hace un rebote corto. Tres tiempos encadenados leen como "conseguido". */
function AchievementSeal({ icon }: { icon: IconName }) {
  return (
    <div className="relative size-24 shrink-0">
      {/* Halo que se expande una vez y desaparece */}
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-[crdHalo_.9s_ease-out_.15s_both] rounded-full bg-[radial-gradient(circle,rgba(37,204,184,.55),rgba(37,204,184,0)_70%)]"
      />
      <div className="absolute inset-0 animate-[crdBadgePop_.7s_cubic-bezier(.2,.9,.3,1.2)_.1s_both]">
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="40" fill="#C6F3EB" />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#25CCB8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="264"
            transform="rotate(-90 48 48)"
            className="animate-[crdRingDraw_.8s_cubic-bezier(.3,.8,.3,1)_.15s_both]"
          />
        </svg>
        {/* El centrado vive en el contenedor: si va sobre el <Icon>, `inset-0`
            estira el SVG a toda la caja en vez de centrarlo dentro. */}
        <span className="absolute inset-0 flex items-center justify-center">
          <Icon name={icon} className="text-[42px] text-mint-ink" />
        </span>
      </div>
    </div>
  );
}

export interface SuccessPanelProps {
  audience: Audience;
  alreadyIn: boolean;
  /** Reabre el formulario en la otra audiencia (viajero con negocio propio). */
  onSwitchAudience: () => void;
}

export default function SuccessPanel({ audience, alreadyIn, onSwitchAudience }: SuccessPanelProps) {
  const copy = CONTENT[audience].success;
  const seal = audience === "negocio" ? "storefront" : "workspace_premium";

  return (
    <div role="status" aria-live="polite" className="relative text-center">
      {/* Se monta sólo en un alta nueva: repetir la fiesta a quien ya estaba
          dentro convierte la celebración en ruido. */}
      {!alreadyIn && <Confetti />}

      <div className="mb-3.5 flex justify-center">
        <AchievementSeal icon={seal} />
      </div>

      <h2 className={`mb-1.5 font-display text-2xl font-extrabold tracking-[-.02em] text-ink-2 ${IN}`} style={{ animationDelay: ".35s" }}>
        {alreadyIn ? "Ya estabas en la lista" : copy.title}
      </h2>
      <p className={`mx-auto mb-[18px] max-w-[340px] text-sm leading-[1.55] text-muted ${IN}`} style={{ animationDelay: ".42s" }}>
        {alreadyIn
          ? "Tu correo ya estaba registrado — no hace falta nada más de tu parte."
          : copy.body}
      </p>

      {/* Siguiente paso */}
      <div className={`border-t border-dashed border-line pt-4 ${IN}`} style={{ animationDelay: ".5s" }}>
        <p className="mb-3 text-copy leading-[1.5] text-muted-2">
          Mientras llega el lanzamiento, síguenos: ahí publicamos los destinos que vamos
          sumando y avisamos de cada avance.
        </p>
        <a
          href={INSTAGRAM.url}
          target="_blank"
          rel="noopener noreferrer"
          // .crd-ig-cta aporta el hover (translate + sombra).
          className="crd-ig-cta inline-flex items-center gap-2.5 rounded-2xl bg-[linear-gradient(135deg,#F58529_0%,#DD2A7B_55%,#8134AF_100%)] px-[22px] py-[13px] font-display text-body font-extrabold text-white no-underline shadow-[0_10px_26px_rgba(221,42,123,.34)]"
        >
          <InstagramGlyph />
          Síguenos en {INSTAGRAM.handle}
        </a>

        {/* La otra mitad del público. Quien se apunta como viajero muchas veces
            también tiene un colmado, una cabaña o un tour: aquí es donde se le
            puede preguntar sin robarle protagonismo al registro que acaba de
            hacer. */}
        <p className="mt-3.5 text-tiny text-muted-2">
          {audience === "viajero" ? "¿También tienes un negocio? " : "¿Y como viajero? "}
          <button
            type="button"
            onClick={onSwitchAudience}
            className="cursor-pointer border-none bg-transparent p-0 font-[inherit] text-tiny font-bold text-coral-ink underline"
          >
            {audience === "viajero" ? "Regístralo también" : "Apúntate también"}
          </button>
        </p>
      </div>
    </div>
  );
}
