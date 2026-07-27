import Image from "next/image";
import Link from "next/link";

// Shell compartido de las páginas legales: prosa legible, sin journey ni mapa.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#FDF8F0",
        padding: "28px clamp(18px,5vw,32px) 56px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-block", marginBottom: 26 }}>
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={140}
            height={32}
            style={{ height: 32, width: "auto" }}
          />
        </Link>
        <div className="crd-legal">{children}</div>
        <div style={{ marginTop: 36, borderTop: "1px solid #EBE6D9", paddingTop: 14, display: "flex", gap: 16, fontSize: 12.5 }}>
          <Link href="/privacidad" style={{ color: "#66747B", textDecoration: "none" }}>Privacidad</Link>
          <Link href="/terminos" style={{ color: "#66747B", textDecoration: "none" }}>Términos</Link>
          <Link href="/lista" style={{ color: "#66747B", textDecoration: "none" }}>Lista de espera</Link>
        </div>
      </div>
    </main>
  );
}
