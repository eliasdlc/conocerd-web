"use client";
import { useEffect, useRef, useState } from "react";
import Button from "./Button";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";

const LINKS = [
  { label: "Destinos", target: "trigger-destinos-intro" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

/**
 * Pin del logo, reducido a glifo (audit §3, movimiento 12). Desde que empieza
 * Destinos hasta el footer no había una sola marca en pantalla; esto la
 * devuelve sin meter el wordmark entero en una píldora que ya va apretada.
 * Va inline y no como <img> porque son 300 bytes y no merece una petición.
 */
function BrandGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" aria-hidden="true">
      <path
        d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"
        fill="#FF8D16"
      />
      <circle cx="12" cy="9" r="2.7" fill="#FDF8F0" />
    </svg>
  );
}

// #15 — píldora flotante sin wordmark: solo nav + botón Descargar.
export default function Nav() {
  const pillRef = useRef<HTMLDivElement>(null);
  // La píldora se retira cuando el CTA final o el footer están en pantalla:
  // su botón "Unirme a la lista" se solapaba con el propio formulario justo en
  // el momento de conversión (audit 1.2, confirmado en 3 viewports).
  const [hidden, setHidden] = useState(false);

  // Mantiene la lógica de fondo al hacer scroll: la píldora se vuelve más
  // sólida (y con más sombra) una vez te alejas del tope. Sólo conmuta un
  // data-attribute; el aspecto de los dos estados vive en las clases de abajo.
  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const onScroll = () => {
      pill.dataset.solid = String(window.scrollY > 36);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = [
      document.getElementById("trigger-cta"),
      document.querySelector("footer"),
    ].filter((t): t is HTMLElement => t !== null);
    if (targets.length === 0) return;

    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setHidden(visible.size > 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      className={`fixed left-1/2 top-4 z-[100] max-w-[calc(100vw-24px)] -translate-x-1/2 transition-opacity duration-300 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      inert={hidden}
    >
      <div
        ref={pillRef}
        className="group flex items-center gap-[clamp(8px,1.4vw,18px)] overflow-x-auto rounded-full border border-line/90 py-2 pl-[clamp(12px,1.8vw,22px)] pr-2 backdrop-blur-[18px] transition-[background-color,box-shadow] duration-300 [scrollbar-width:none]
          bg-cream/60 shadow-card
          data-[solid=true]:bg-cream/92 data-[solid=true]:shadow-panel"
      >
        {/* Aparece con el estado sólido: en el hero el logo ya está en pantalla
            a tamaño completo y repetirlo sobraría. */}
        <a
          href="#top"
          aria-label="ConoceRD — volver al inicio"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="grid w-0 shrink-0 place-items-center overflow-hidden opacity-0 transition-[width,opacity] duration-300 group-data-[solid=true]:w-[22px] group-data-[solid=true]:opacity-100"
        >
          <BrandGlyph />
        </a>

        {LINKS.map((l) => (
          <a
            key={l.target}
            // .crd-navlink: subrayado animado con ::after y oculto en móvil.
            className="crd-navlink whitespace-nowrap"
            href={`#${l.target}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(l.target);
            }}
          >
            {l.label}
          </a>
        ))}
        {/* La app aún no está publicada: el CTA más visible del sitio lleva a la
            lista de espera, no a una descarga que no existe. */}
        <Button
          variant="primary"
          size="sm"
          icon="notifications_active"
          onClick={() => requestSubscribe("viajero")}
        >
          Unirme a la lista
        </Button>
      </div>
    </nav>
  );
}
