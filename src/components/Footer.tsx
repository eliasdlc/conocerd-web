"use client";
import Image from "next/image";

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function Footer() {
  return (
    <footer style={{ background: "#1D3A45", padding: "44px 20px 36px", textAlign: "center" }}>
      <Image src="/assets/wordmark.svg" alt="ConoceRD" width={140} height={42} style={{ height: 42, width: "auto", filter: "brightness(0) invert(1)", opacity: .92, marginBottom: 6 }} />
      <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: "#25CCB8", marginBottom: 18 }}>
        Descubre lo nuestro
      </div>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 20 }}>
        {[
          { icon: "photo_camera", label: "Instagram" },
          { icon: "music_note",   label: "TikTok" },
          { icon: "chat",         label: "WhatsApp" },
        ].map(s => (
          <a
            key={s.label}
            href="#"
            onClick={e => { e.preventDefault(); scrollToTop(); }}
            aria-label={s.label}
            className="crd-social"
            style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,.1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
          >
            <span className="ms" style={{ fontSize: 22 }}>{s.icon}</span>
          </a>
        ))}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(255,255,255,.55)" }}>
        hola@conocerd.app · Santiago, RD 🇩🇴
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 8 }}>
        © 2026 ConoceRD · Hecho con orgullo en República Dominicana
      </div>
    </footer>
  );
}
