"use client";
import { useEffect, useRef } from "react";
import Button from "./Button";
import BrandPin from "./BrandPin";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";

const LINKS = [
  { label: "Destinos", target: "trigger-polaroid-0" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

// #15 — píldora flotante sin wordmark: solo nav + botón Descargar.
// Visible en todo el recorrido, CTA y footer incluidos (decisión del dueño,
// jul 2026): las escenas con contenido cerca del tope reservan la franja
// --crd-nav-clear (globals.css) así que no se solapan.
export default function Nav() {
  const pillRef = useRef<HTMLDivElement>(null);

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

  return (
    <nav className="fixed left-1/2 top-4 z-[100] max-w-[calc(100vw-24px)] -translate-x-1/2">
      <div
        ref={pillRef}
        className="crd-nav-pill group flex items-center gap-[var(--nav-gap)] overflow-x-auto rounded-full border border-line/90 py-2 pl-[clamp(12px,1.8vw,22px)] pr-2 backdrop-blur-[18px] transition-[background-color,box-shadow] duration-300 [--nav-gap:clamp(8px,1.4vw,18px)] [scrollbar-width:none]
          bg-cream/60 shadow-card
          data-[solid=true]:bg-cream/92 data-[solid=true]:shadow-panel"
      >
        {/* Aparece con el estado sólido: en el hero el logo ya está en pantalla
            a tamaño completo y repetirlo sobraría. */}
        <a
          href="#trigger-hero"
          aria-label="ConoceRD — volver al inicio"
          onClick={(e) => {
            e.preventDefault();
            // Por el saltador del journey: en desktop teletransporta con vuelo
            // directo de cámara (un smooth scroll desde el footer sería un tour
            // de 10 s con el tope de ritmo); en móvil re-encuadra al hero.
            scrollToSection("trigger-hero");
          }}
          // El margen negativo cancela el gap del flex mientras el logo mide
          // 0px: sin él, la píldora arrastraba un hueco fantasma a la izquierda
          // del primer elemento visible (notorio en móvil, donde solo queda el
          // botón: 20px a un lado y 8px al otro).
          // El ancho tiene que seguir al `size` del pin: 28 es el umbral desde
          // el que lleva la flor, y por debajo la píldora enseñaría el anillo
          // pelado, que es el pin de una lista y no la marca en pantalla.
          className="-mr-[var(--nav-gap)] grid w-0 shrink-0 place-items-center overflow-hidden opacity-0 transition-[width,opacity,margin] duration-300 group-data-[solid=true]:mr-0 group-data-[solid=true]:w-[28px] group-data-[solid=true]:opacity-100"
        >
          <BrandPin size={28} />
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
