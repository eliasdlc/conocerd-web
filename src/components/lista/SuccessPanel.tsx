"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Lo que ocupa el lugar del formulario cuando el registro entra.
//
//  Un registro por correo no devuelve nada tangible, así que el logro hay que
//  fabricarlo: el sello de llegada de la app a escala de web, confeti que se
//  apaga solo, y acto seguido la única acción que sí puede hacer ahora mismo:
//  seguirnos en Instagram. Sin esa acción, el éxito es un callejón sin salida.
// ─────────────────────────────────────────────────────────────────────────────

import Confetti from "./Confetti";
import InstagramTile from "./InstagramTile";
import Icon, { type IconName } from "@/components/Icon";
import { CONTENT } from "./content";
import type { Audience } from "@/lib/waitlist/schema";

// La clase es una constante literal, no una plantilla: Tailwind escanea el
// código fuente en busca de nombres de clase, así que una clase construida por
// interpolación nunca se generaría. El retardo, que sí varía, va por style.
const IN = "animate-[crdListaIn_.5s_cubic-bezier(.16,1,.3,1)_both]";

/** Sello de fundador: disco de 88 en `mint-soft`, anillo de 3 en `mint-ink` que
 *  se dibuja (264 → 0 de dashoffset), el check detrás y un pop con overshoot.
 *  Tres tiempos encadenados leen como "conseguido", y ocurren UNA vez al
 *  montar: repetirlos convierte la celebración en ruido.
 *
 *  El resplandor es `e2-mint`, el único uso de ese resplandor fuera de la app,
 *  y por la misma razón: la pieza tiene que leer encendida, no levantada. El
 *  halo que se expandía murió con él, era una segunda animación diciendo lo
 *  mismo. El radio del anillo es 42 y no otro porque 2π·42 = 264, que es el
 *  dashoffset exacto del que parte el trazo. */
function AchievementSeal({ icon }: { icon: IconName }) {
  return (
    <div className="relative size-[88px] shrink-0 rounded-full shadow-e2-mint">
      <div className="absolute inset-0 animate-[crdBadgePop_.7s_cubic-bezier(.2,.9,.3,1.2)_.1s_both]">
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r="42" fill="var(--color-mint-soft)" />
          <circle
            cx="44"
            cy="44"
            r="42"
            fill="none"
            stroke="var(--color-mint-ink)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="264"
            transform="rotate(-90 44 44)"
            className="animate-[crdRingDraw_.8s_cubic-bezier(.3,.8,.3,1)_.15s_both]"
          />
        </svg>
        {/* El centrado vive en el contenedor: si va sobre el <Icon>, `inset-0`
            estira el SVG a toda la caja en vez de centrarlo dentro. */}
        <span className="absolute inset-0 flex items-center justify-center">
          <Icon name={icon} className="text-[38px] text-mint-ink" />
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

      <h2 className={`mb-1.5 font-display text-2xl font-bold tracking-[-.02em] text-ink ${IN}`} style={{ animationDelay: ".35s" }}>
        {alreadyIn ? "Ya estabas en la lista" : copy.title}
      </h2>
      <p className={`mx-auto mb-[18px] max-w-[340px] text-body leading-[1.55] text-muted ${IN}`} style={{ animationDelay: ".42s" }}>
        {alreadyIn
          ? "Tu correo ya estaba registrado — no hace falta nada más de tu parte."
          : copy.body}
      </p>

      {/* Siguiente paso */}
      <div className={`border-t border-dashed border-line pt-4 ${IN}`} style={{ animationDelay: ".5s" }}>
        <p className="mb-3 text-copy leading-[1.5] text-muted">
          Mientras llega el lanzamiento, síguenos: ahí publicamos los destinos que vamos
          sumando y avisamos de cada avance.
        </p>
        {/* La misma baldosa de la página: el éxito no puede cerrar sin una
            acción, y hoy la única que existe de verdad es Instagram. */}
        <InstagramTile caption="Los destinos que vamos sumando." className="text-left" />

        {/* La otra mitad del público. Quien se apunta como viajero muchas veces
            también tiene un colmado, una cabaña o un tour: aquí es donde se le
            puede preguntar sin robarle protagonismo al registro que acaba de
            hacer. */}
        <p className="mt-3.5 text-tiny text-muted">
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
