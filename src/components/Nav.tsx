"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Button from "./Button";
import { scrollToSection } from "@/lib/journeyNav";

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 36) {
        nav.style.background = "rgba(253,248,240,.88)";
        nav.style.boxShadow = "0 6px 24px rgba(38,70,83,.10)";
        nav.style.backdropFilter = "blur(18px)";
        nav.style.setProperty("-webkit-backdrop-filter", "blur(18px)");
      } else {
        nav.style.background = "rgba(253,248,240,0)";
        nav.style.boxShadow = "none";
        nav.style.backdropFilter = "none";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = scrollToSection;

  return (
    <nav
      ref={navRef}
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px clamp(18px,4vw,56px)",
        transition: "background .3s, box-shadow .3s, padding .3s",
        background: "rgba(253,248,240,0)",
      }}
    >
      <a href="#crd-hero" onClick={e => { e.preventDefault(); scrollTo("crd-hero"); }} style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
        <Image src="/assets/wordmark.svg" alt="ConoceRD" width={140} height={38} style={{ height: 38, width: "auto" }} />
      </a>
      <div style={{ display: "flex", alignItems: "center", gap: "clamp(14px,2.4vw,30px)" }}>
        <a className="crd-navlink" href="#trigger-destinos-intro" onClick={e => { e.preventDefault(); scrollTo("trigger-destinos-intro"); }}>Destinos</a>
        <a className="crd-navlink" href="#trigger-mapa" onClick={e => { e.preventDefault(); scrollTo("trigger-mapa"); }}>Mapa</a>
        <a className="crd-navlink" href="#trigger-viajeros" onClick={e => { e.preventDefault(); scrollTo("trigger-viajeros"); }}>Viajeros</a>
        <a className="crd-navlink" href="#trigger-negocios" onClick={e => { e.preventDefault(); scrollTo("trigger-negocios"); }}>Negocios</a>
        <a className="crd-navlink" href="#trigger-equipo" onClick={e => { e.preventDefault(); scrollTo("trigger-equipo"); }}>Equipo</a>
        <Button variant="primary" size="sm" icon="download" onClick={() => scrollTo("trigger-cta")}>Descargar</Button>
      </div>
    </nav>
  );
}
