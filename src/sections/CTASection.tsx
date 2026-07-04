"use client";

import { useScene } from "@/context/SceneContext";

// ─── Component ────────────────────────────────────────────────────────────────

export default function CTAOverlay() {
  const { activeScene } = useScene();
  const isVisible = activeScene === "cta";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: isVisible ? "auto" : "none",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.7s ease",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 24px 36px",
      }}
    >
      {/* Rutas SVG dashed que fluyen detrás de la card (ask del CTA). */}
      <svg
        aria-hidden
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", opacity: 0.6 }}
      >
        {[
          { d: "M -40 250 C 360 180 520 360 760 300 S 1180 200 1500 320", color: "#F76C4D" },
          { d: "M -40 620 C 380 560 560 700 820 620 S 1200 520 1500 640", color: "#25CCB8" },
          { d: "M 200 -40 C 300 260 640 300 720 520 S 900 860 1040 960", color: "#FF8D16" },
        ].map((r, i) => (
          <path
            key={i}
            className="crd-cta-route"
            d={r.d}
            fill="none"
            stroke={r.color}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.6}s` }}
          />
        ))}
      </svg>

      {/* Dark glassmorphism card — appears 0.6s after scene activates (map is mid-flyout) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(29,58,69,0.82)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 28,
          padding: "44px clamp(28px, 5vw, 60px)",
          maxWidth: 640,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 32px 80px rgba(0,0,0,0.40)",
          animation: isVisible ? "slideUpIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.6s both" : "none",
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
            margin: "0 0 16px",
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
            margin: "0 auto 28px",
            maxWidth: 440,
            color: "rgba(255,255,255,0.76)",
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          Descarga ConoceRD y empieza a explorar la República Dominicana que no aparece en las guías.
        </p>

        {/* Store buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          {[
            { icon: "phone_iphone", label: "Descárgalo en", store: "App Store"    },
            { icon: "android",      label: "Disponible en", store: "Google Play"  },
          ].map((btn) => (
            <a
              key={btn.store}
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                background: "#fff",
                color: "#264653",
                borderRadius: 14,
                padding: "11px 20px",
                boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
                transition: "transform 0.2s cubic-bezier(.2,.8,.3,1.2), box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px) scale(1.02)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "";
              }}
            >
              <span className="ms" style={{ fontSize: 28, color: "#264653" }}>
                {btn.icon}
              </span>
              <span style={{ textAlign: "left", lineHeight: 1.15 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 10.5,
                    color: "#5B6B72",
                    fontWeight: 600,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {btn.label}
                </span>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 15,
                    color: "#264653",
                  }}
                >
                  {btn.store}
                </span>
              </span>
            </a>
          ))}
        </div>

        {/* Secondary link — Step 14 will wire scroll target */}
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
          ¿Tienes un negocio?{" "}
          <a
            href="#trigger-negocios"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("trigger-negocios")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              color: "#FF8D16",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Súmate como aliado →
          </a>
        </div>
      </div>
    </div>
  );
}
