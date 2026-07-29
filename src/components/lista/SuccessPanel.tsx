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
import { CONTENT, INSTAGRAM } from "./content";
import type { Audience } from "@/lib/waitlist/schema";

/** Sello de fundador: el anillo se dibuja, el check entra detrás y el conjunto
 *  hace un rebote corto. Tres tiempos encadenados leen como "conseguido". */
function AchievementSeal({ icon }: { icon: string }) {
  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      {/* Halo que se expande una vez y desaparece */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,204,184,.55), rgba(37,204,184,0) 70%)",
          animation: "crdHalo .9s ease-out .15s both",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          animation: "crdBadgePop .7s cubic-bezier(.2,.9,.3,1.2) .1s both",
        }}
      >
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
            style={{ animation: "crdRingDraw .8s cubic-bezier(.3,.8,.3,1) .15s both" }}
          />
        </svg>
        <span
          className="ms"
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            color: "#0C6A60",
          }}
        >
          {icon}
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
    <div role="status" aria-live="polite" style={{ position: "relative", textAlign: "center" }}>
      {/* Se monta sólo en un alta nueva: repetir la fiesta a quien ya estaba
          dentro convierte la celebración en ruido. */}
      {!alreadyIn && <Confetti />}

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <AchievementSeal icon={seal} />
      </div>

      <h2
        style={{
          margin: "0 0 6px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: 24,
          letterSpacing: "-.02em",
          color: "#1D3A45",
          animation: "crdListaIn .5s cubic-bezier(.16,1,.3,1) .35s both",
        }}
      >
        {alreadyIn ? "Ya estabas en la lista" : copy.title}
      </h2>
      <p
        style={{
          margin: "0 auto 18px",
          maxWidth: 340,
          color: "#5B6B72",
          fontSize: 14,
          lineHeight: 1.55,
          animation: "crdListaIn .5s cubic-bezier(.16,1,.3,1) .42s both",
        }}
      >
        {alreadyIn
          ? "Tu correo ya estaba registrado — no hace falta nada más de tu parte."
          : copy.body}
      </p>

      {/* Siguiente paso */}
      <div
        style={{
          borderTop: "1px dashed #EBE6D9",
          paddingTop: 16,
          animation: "crdListaIn .5s cubic-bezier(.16,1,.3,1) .5s both",
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#66747B",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Mientras llega el lanzamiento, síguenos: ahí publicamos los destinos que vamos
          sumando y avisamos de cada avance.
        </p>
        <a
          href={INSTAGRAM.url}
          target="_blank"
          rel="noopener noreferrer"
          className="crd-ig-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "13px 22px",
            borderRadius: 16,
            background: "linear-gradient(135deg,#F58529 0%,#DD2A7B 55%,#8134AF 100%)",
            color: "#fff",
            textDecoration: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 15,
            boxShadow: "0 10px 26px rgba(221,42,123,.34)",
          }}
        >
          <InstagramGlyph />
          Síguenos en {INSTAGRAM.handle}
        </a>

        {/* La otra mitad del público. Quien se apunta como viajero muchas veces
            también tiene un colmado, una cabaña o un tour: aquí es donde se le
            puede preguntar sin robarle protagonismo al registro que acaba de
            hacer. */}
        <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "#66747B" }}>
          {audience === "viajero" ? "¿También tienes un negocio? " : "¿Y como viajero? "}
          <button
            type="button"
            onClick={onSwitchAudience}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#B23410",
              fontWeight: 700,
              fontSize: 12.5,
              fontFamily: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {audience === "viajero" ? "Regístralo también" : "Apúntate también"}
          </button>
        </p>
      </div>
    </div>
  );
}
