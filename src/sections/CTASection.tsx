"use client";

import SubscribeForm from "@/components/SubscribeForm";
import { useScene } from "@/context/SceneContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { requestSubscribe, useSubscribeIntent } from "@/hooks/useSubscribeIntent";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CTAOverlay() {
  const { activeScene } = useScene();
  const isMobile = useIsMobile();
  const isVisible = activeScene === "cta";
  // La app aún no existe: el cierre del journey ya no promete una descarga,
  // captura el correo. El toggle abre en la audiencia que pidió el último CTA.
  const audience = useSubscribeIntent("viajero");

  return (
    <div
      aria-hidden={!isVisible}
      inert={!isVisible}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: isVisible ? "auto" : "none",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.7s ease",
        zIndex: 10,
        display: "flex",
        // El journey cierra volviendo al globo: en móvil la card baja para que
        // el planeta se vea completo encima, igual que en el hero.
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile
          ? "72px 18px calc(14px + var(--crd-stepper-h, 74px))"
          : "72px 24px 36px",
      }}
    >
      <div
        className="crd-cta-card"
        style={{
          background: "rgba(29,58,69,0.82)",
          backdropFilter: isMobile ? undefined : "blur(12px)",
          WebkitBackdropFilter: isMobile ? undefined : "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 28,
          padding: isMobile ? "26px 20px" : "44px clamp(28px, 5vw, 60px)",
          maxWidth: 640,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 32px 80px rgba(0,0,0,0.40)",
          animation: isVisible ? "slideUpIn 0.4s cubic-bezier(0.16,1,0.3,1) both" : "none",
        }}
      >
        {/* Handwritten kicker */}
        <div
          style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 40px)",
            color: "#25CCB8",
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          Descubre lo nuestro
        </div>

        {/* Main heading */}
        <h2
          style={{
            margin: "0 0 14px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            letterSpacing: "-.025em",
            fontSize: "clamp(28px, 5vw, 50px)",
            lineHeight: 1.04,
            color: "#fff",
          }}
        >
          Tu próxima aventura<br />empieza aquí
        </h2>

        {/* Subtext */}
        <p
          style={{
            margin: "0 auto 20px",
            maxWidth: 460,
            color: "rgba(255,255,255,0.76)",
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          ConoceRD está en camino. Déjanos tu correo y entra a la lista de fundadores: serás
          de los primeros en explorar la República Dominicana que no aparece en las guías.
        </p>

        {/* Lista de espera — la acción real de la página */}
        <div style={{ maxWidth: 460, margin: "0 auto 18px" }}>
          <SubscribeForm tone="dark" defaultAudience={audience} source="cta" />
        </div>

        {/* Tiendas — señal de credibilidad, no acción (§2.4). Las apps aún no
            están publicadas, así que se muestran atenuadas y sin enlace. */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          {[
            { icon: "phone_iphone", store: "App Store"   },
            { icon: "android",      store: "Google Play" },
          ].map((btn) => (
            <div
              key={btn.store}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "rgba(255,255,255,0.62)",
                borderRadius: 12,
                padding: "8px 14px",
              }}
            >
              <span className="ms" aria-hidden="true" style={{ fontSize: 20 }}>
                {btn.icon}
              </span>
              <span style={{ textAlign: "left", lineHeight: 1.2 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Próximamente en
                </span>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 13.5,
                  }}
                >
                  {btn.store}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Atajo a la audiencia B2B sin salir de la card */}
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
          ¿Tienes un negocio?{" "}
          <button
            type="button"
            onClick={() => requestSubscribe("negocio")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "#FF8D16",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            Regístralo aquí →
          </button>
        </div>
      </div>
    </div>
  );
}
