import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SubscribeForm from "@/components/SubscribeForm";

// ─────────────────────────────────────────────────────────────────────────────
//  /lista — destino del QR (§2.3).
//
//  La home es un scroll journey con mapa y GSAP: pesado en el 4G de un salón
//  lleno y con el formulario al final. Esta página es lo contrario — estática,
//  sin mapa, sin journey, sin JS de animación, y el campo de correo por encima
//  del fold. El `?ref=` de la URL lo captura el propio formulario.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Lista de espera — ConoceRD",
  description:
    "Entra a la lista de fundadores de ConoceRD: badge de fundador, acceso anticipado y avisos antes del lanzamiento.",
};

const PITCH = [
  {
    icon: "explore",
    title: "Destinos que no salen en las guías",
    desc: "Playas, saltos y pueblos reales, con lo que de verdad se puede hacer allí.",
  },
  {
    icon: "route",
    title: "Arma tu recorrido",
    desc: "Encadena varios lugares en una ruta y llévala contigo el día del viaje.",
  },
  {
    icon: "storefront",
    title: "Negocios locales, no cadenas",
    desc: "Come, duerme y compra donde compra la gente de la zona.",
  },
];

export default function ListaPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(180deg,#FDF8F0 0%,#F5EFE2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px clamp(18px,5vw,32px) 40px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <Link href="/" style={{ display: "inline-block", marginBottom: 22 }}>
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={150}
            height={34}
            priority
            style={{ height: 34, width: "auto" }}
          />
        </Link>

        <div
          style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700,
            fontSize: "clamp(26px,7vw,34px)",
            color: "#0C6A60",
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          Descubre lo nuestro
        </div>

        <h1
          style={{
            margin: "0 0 10px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            letterSpacing: "-.025em",
            fontSize: "clamp(27px,6.6vw,38px)",
            lineHeight: 1.08,
            color: "#1D3A45",
          }}
        >
          Sé de los primeros en usar ConoceRD
        </h1>

        <p style={{ margin: "0 0 20px", color: "#5B6B72", fontSize: 15, lineHeight: 1.55 }}>
          Déjanos tu correo y entras a la lista de fundadores. Te avisamos antes que a nadie
          cuando la app esté lista.
        </p>

        {/* Formulario por encima del fold: es la única acción de la página */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #EBE6D9",
            borderRadius: 20,
            padding: "18px 18px 16px",
            boxShadow: "0 18px 44px rgba(38,70,83,.10)",
          }}
        >
          <SubscribeForm tone="light" layout="full" source="lista" />
        </div>

        {/* Qué es ConoceRD, en tres frases */}
        <div style={{ display: "grid", gap: 14, margin: "26px 0 22px" }}>
          {PITCH.map((p) => (
            <div key={p.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span
                className="ms"
                aria-hidden="true"
                style={{ fontSize: 22, color: "#0C6A60", flexShrink: 0, marginTop: 1 }}
              >
                {p.icon}
              </span>
              <div>
                <div
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 14.5,
                    color: "#264653",
                  }}
                >
                  {p.title}
                </div>
                <div style={{ color: "#5B6B72", fontSize: 13, lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            color: "#66747B",
            fontSize: 12.5,
            marginBottom: 22,
          }}
        >
          <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>phone_iphone</span>
          <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>android</span>
          Próximamente en App Store y Google Play
        </div>

        <div
          style={{
            borderTop: "1px solid #EBE6D9",
            paddingTop: 14,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: "#66747B",
          }}
        >
          <Link href="/" style={{ color: "#66747B", textDecoration: "none" }}>
            Ver el sitio completo
          </Link>
          <Link href="/privacidad" style={{ color: "#66747B", textDecoration: "none" }}>
            Privacidad
          </Link>
          <Link href="/terminos" style={{ color: "#66747B", textDecoration: "none" }}>
            Términos
          </Link>
        </div>
      </div>
    </main>
  );
}
