"use client";
import Button from "./Button";
import BrandPin from "./BrandPin";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";
import { chapterOfScene } from "@/lib/journey";
import { useScene } from "@/context/SceneContext";
import { usePieALaVista } from "@/hooks/usePieALaVista";

const LINKS = [
  { label: "Destinos", target: "trigger-polaroid-0" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

// Píldora flotante sin wordmark en reposo: en el hero el logo ya está en
// pantalla a tamaño completo y repetirlo sobraría. Visible en todo el
// recorrido y en el CTA: las escenas con contenido cerca del tope reservan la
// franja --crd-nav-clear (globals.css) así que no se solapan.
//
// Sobre el pie se retira (decisión del dueño, ago 2026, que revisa la de jul
// 2026 de tenerla visible también allí). El pie no reserva esa franja y la
// píldora caía encima de los botones de tienda; y en el escritorio, sobre la
// carta del CTA que el sticky suelta al terminar la pista. El pie lleva los
// mismos cinco enlaces, así que no se pierde navegación.
//
// El botón va relleno de `selected` y no de coral: mide 40 de alto y a ese
// tamaño el blanco sobre coral da 3.81:1, que sólo pasa como texto grande.
export default function Nav() {
  // El enlace activo se marca con peso y tinta, nunca con el acento: el coral
  // de la web es para acciones. Se compara por capítulo, no por escena: los
  // seis polaroids son un solo "Destinos" y el enlace tiene que quedarse
  // encendido en los seis.
  const { activeScene } = useScene();
  const capituloActivo = chapterOfScene(activeScene);
  const enElPie = usePieALaVista();

  // Estado sólido de la píldora (más fondo, más sombra, y el pin de volver al
  // inicio visible). El disparador es la escena activa, no window.scrollY: el
  // motor de pasos bloquea el scroll y scrollY vale 0 durante todo el
  // recorrido, así que un umbral de píxeles no encendía nunca. Sólo conmuta un
  // data-attribute; el aspecto de los dos estados vive en las clases de abajo.
  const solido = activeScene !== "hero";

  return (
    <nav
      className={`fixed left-1/2 top-4 z-[100] max-w-[calc(100vw-24px)] -translate-x-1/2 transition-opacity duration-300 ${
        enElPie ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        data-solid={String(solido)}
        className="crd-nav-pill group flex h-14 items-center gap-[var(--nav-gap)] overflow-x-auto rounded-full border border-[var(--crd-glass-line)] pl-[clamp(10px,1.6vw,18px)] pr-[6px] transition-[background-color,box-shadow] duration-300 [--nav-gap:clamp(4px,1vw,10px)] [scrollbar-width:none]"
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
            // .crd-navlink: píldora invisible de 40, activo por peso y tinta,
            // y oculto bajo 900px.
            className="crd-navlink whitespace-nowrap"
            // "location" y no "page": los cinco enlaces no llevan a otras
            // páginas, mueven la cámara dentro de ésta. "page" le diría al
            // lector de pantalla que cambió de documento.
            aria-current={
              chapterOfScene(l.target.replace("trigger-", "")) === capituloActivo
                ? "location"
                : undefined
            }
            href={`#${l.target}`}
            data-label={l.label}
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(l.target);
            }}
          >
            <span>{l.label}</span>
          </a>
        ))}
        {/* La app aún no está publicada: el CTA más visible del sitio lleva a la
            lista de espera, no a una descarga que no existe. */}
        <Button
          variant="selected"
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
