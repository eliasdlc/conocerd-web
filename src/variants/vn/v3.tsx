"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Variante 3 de Viajeros+Negocios — "La card punteada como sistema".
//
//  La card de pasos con línea punteada (la de Negocios que gusta al dueño)
//  crece hasta ser EL componente de ambas secciones: cada una es UNA gran card
//  de viaje con 3 paradas numeradas (pin → pin → bandera de meta, la misma
//  iconografía de los pines del mapa). Cada parada es interactiva: hover/tap
//  cambia la pantalla del teléfono a esa vista de la app, y en Viajeros además
//  dibuja la ruta real (carreteras de pairs.json) sobre el mapa. En Negocios,
//  llegadas en vivo: cada pocos segundos "llega" un cliente — se enciende un
//  arco en el mapa, aparece en el feed del panel y sube el contador. Todo el
//  movimiento nace de hover/tap/scroll o de la llegada de un dato.
//
//  Demo por URL: `&v3paso=2|3` fija la parada inicial (para capturas).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useScene } from "@/context/SceneContext";
import Icon, { type IconName } from "@/components/Icon";
import Kicker from "@/components/Kicker";
import Button from "@/components/Button";
import PhoneMockup from "@/sections/PhoneMockup";
import { MapMarker, MarkerContent, MarkerLabel, MapRoute, MapArc } from "@/components/map/Map";
import { CategoryPin, GoalFlag, SelfPin, PIN_CHROME } from "@/components/map/pins";
import { PANEL_SOLID } from "@/lib/surfaces";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { DESTINATIONS, type Destination } from "@/data/destinations";
import type { LngLat } from "@/lib/geo";
import pairs from "@/data/routes/pairs.json";

// ─── Ruta demo (datos reales por carretera) ──────────────────────────────────

const dest = (id: string): Destination => DESTINATIONS.find((d) => d.id === id) as Destination;

// Jarabacoa → Constanza → Pico Duarte: compacta, centrada en la isla (no choca
// ni con la card ni con el teléfono en la cámara de "viajeros").
const PARADAS_RUTA = [dest("jarabacoa"), dest("constanza"), dest("duarte")];

const idxDe = (id: string) => pairs.ids.indexOf(id);

/** Tramo por carretera A→B (las claves de `legs` usan el orden de `ids`). */
function tramo(a: string, b: string): [number, number][] {
  const ia = idxDe(a);
  const ib = idxDe(b);
  const key = ia < ib ? `${a}|${b}` : `${b}|${a}`;
  const leg = (pairs.legs as Record<string, number[][]>)[key] ?? [];
  const pts = leg.map((c) => [c[0], c[1]] as [number, number]);
  return ia < ib ? pts : [...pts].reverse();
}

const LINEA_RUTA: [number, number][] = [
  ...tramo("jarabacoa", "constanza"),
  ...tramo("constanza", "duarte"),
];

const kmEntre = (a: string, b: string) => Math.round(pairs.km[idxDe(a)][idxDe(b)]);
const minEntre = (a: string, b: string) => pairs.min[idxDe(a)][idxDe(b)];
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`);

const KM_TOTAL = kmEntre("jarabacoa", "constanza") + kmEntre("constanza", "duarte");

// ─── Pasos ───────────────────────────────────────────────────────────────────

type Paso = {
  titulo: string;
  desc: string;
  /** Ícono del pin (los dos primeros pasos). El paso final lleva bandera. */
  icon?: IconName;
  color?: string;
  meta?: boolean; // true = bandera de meta
};

const PASOS_VIAJERO: Paso[] = [
  { icon: "explore", color: "#F76C4D", titulo: "Descubre lugares reales", desc: "Destinos poco conocidos, recomendados por gente que ya fue. No el mismo top 10 de siempre." },
  { icon: "route", color: "#FF8D16", titulo: "Arma tu ruta", desc: "Paradas, distancias y tiempos por carreteras reales. El plan completo, en tu bolsillo." },
  { meta: true, titulo: "Vive y guarda el recuerdo", desc: "Fotos, sellos por destino y tu diario de viaje para presumir después." },
];

const PASOS_NEGOCIO: Paso[] = [
  { icon: "add_business", color: "#25CCB8", titulo: "Regístrate gratis", desc: "Perfil con fotos, horario y contacto directo por WhatsApp. Listo en minutos." },
  { icon: "location_on", color: "#FF8D16", titulo: "Te encuentran en la ruta", desc: "Apareces en el mapa justo cuando el viajero planifica su parada cerca de ti." },
  { meta: true, titulo: "Ves llegar clientes", desc: "Panel en vivo: cuántos vienen, de dónde salen y qué andan buscando." },
];

const PANTALLAS_VIAJERO = ["Explorar", "Tu ruta", "Tu diario"];
const PANTALLAS_NEGOCIO = ["Tu perfil", "En el mapa", "Panel en vivo"];

// Línea punteada de la ruta — la firma de la card, ahora compartida por ambas
// secciones (inline: globals.css no se toca).
const PUNTEADA = {
  backgroundImage: "repeating-linear-gradient(to bottom, #25CCB8 0 4px, transparent 4px 9px)",
};

/** `&v3paso=1..3` en la URL fija la parada activa inicial (demo/capturas). */
function pasoInicial(): number {
  if (typeof window === "undefined") return 0;
  try {
    const v = Number(new URLSearchParams(window.location.search).get("v3paso"));
    return v >= 1 && v <= 3 ? v - 1 : 0;
  } catch {
    return 0;
  }
}

// ─── Piezas compartidas de la card ───────────────────────────────────────────

function PinDeParada({ paso, num, activo }: { paso: Paso; num: number; activo: boolean }) {
  return (
    <span className="relative block size-9 shrink-0">
      {paso.meta ? (
        <span
          className={`absolute -left-0.5 -top-1 transition-transform duration-200 ${activo ? "scale-110" : ""}`}
        >
          <GoalFlag size={44} />
        </span>
      ) : (
        <span
          className={`flex size-9 items-center justify-center rounded-full ${PIN_CHROME} transition-transform duration-200 ${activo ? "scale-110" : ""}`}
          style={{ background: paso.color }}
        >
          <Icon name={paso.icon as IconName} className="text-lg text-white" />
        </span>
      )}
      {/* número de parada — pin numerado, como en el mapa */}
      <span className="absolute -right-1 -top-1 z-[1] flex size-4 items-center justify-center rounded-full bg-ink-2 font-mono text-[9px] font-bold leading-none text-white">
        {num}
      </span>
    </span>
  );
}

function RailDePasos({
  pasos,
  activo,
  onActivo,
  visible,
  label,
  extraPaso3,
}: {
  pasos: Paso[];
  activo: number;
  onActivo: (i: number) => void;
  visible: boolean;
  label: string;
  extraPaso3?: React.ReactNode;
}) {
  return (
    <ol aria-label={label} className="relative m-0 flex list-none flex-col gap-1 p-0">
      {/* la línea punteada que une las paradas — el alma de la card */}
      <span
        aria-hidden="true"
        className="absolute bottom-[30px] left-[25.5px] top-[30px] w-px opacity-70"
        style={PUNTEADA}
      />
      {pasos.map((p, i) => (
        <li
          key={p.titulo}
          className={visible ? "animate-slide-up" : ""}
          style={visible ? { animationDelay: `${i * 0.07 + 0.12}s` } : undefined}
        >
          <button
            type="button"
            onClick={() => onActivo(i)}
            onMouseEnter={() => onActivo(i)}
            onFocus={() => onActivo(i)}
            aria-current={activo === i ? "step" : undefined}
            className={`relative flex w-full min-h-[44px] cursor-pointer items-start gap-3 rounded-card border p-2 pr-2.5 text-left transition-colors duration-200 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink-2 ${
              activo === i
                ? "border-line bg-cream"
                : "border-transparent bg-transparent hover:bg-cream/60"
            }`}
          >
            <PinDeParada paso={p} num={i + 1} activo={activo === i} />
            <span className="min-w-0 flex-1">
              <span className={`block text-copy font-bold leading-[1.25] ${activo === i ? "text-ink-2" : "text-ink"}`}>
                {p.titulo}
              </span>
              <span className="mt-0.5 block text-xs leading-[1.4] text-muted">{p.desc}</span>
              {i === 2 && extraPaso3}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Pila de pantallas con crossfade — solo la activa es visible. */
function PilaDePantallas({ pantallas, activo }: { pantallas: React.ReactNode[]; activo: number }) {
  return (
    <div className="relative size-full overflow-hidden">
      {pantallas.map((p, i) => (
        <div
          key={i}
          aria-hidden={i !== activo}
          className={`absolute inset-0 transition-opacity duration-300 ease-out ${
            i === activo ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {p}
        </div>
      ))}
    </div>
  );
}

/** Vista previa compacta de la app dentro del bottom-sheet (solo móvil):
 *  la pantalla real renderizada a 236px y escalada a la mitad. */
function MiniTelefono({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="shrink-0 desk:hidden">
      <div className="overflow-hidden rounded-[20px] border-[3px] border-ink-2 bg-white shadow-card">
        <div className="h-[236px] w-[118px] overflow-hidden">
          <div className="relative h-[472px] w-[236px] origin-top-left scale-50">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Teléfono de la derecha (desktop) con el chip de la pantalla activa. */
function TelefonoConChip({
  pantallas,
  activo,
  nombres,
  visible,
}: {
  pantallas: React.ReactNode[];
  activo: number;
  nombres: string[];
  visible: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`crd-phone-wrap absolute right-[clamp(20px,6%,96px)] top-1/2 -translate-y-1/2 transition-opacity duration-500 ease-in-out [transition-delay:0.1s] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative">
        <div className="absolute -top-9 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/92 px-3 py-[5px] font-mono text-micro font-bold uppercase tracking-[.12em] text-white shadow-card">
          Parada {activo + 1} · {nombres[activo]}
        </div>
        <PhoneMockup screen={<PilaDePantallas pantallas={pantallas} activo={activo} />} />
      </div>
    </div>
  );
}

// ─── Pantallas de la app — Viajeros ──────────────────────────────────────────

function ChipCategoria({ label, activo }: { label: string; activo?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-micro font-bold ${
        activo ? "bg-ink-2 text-white" : "border border-line bg-white text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function PantallaExplorar() {
  const lugares = [
    { d: dest("charcos"), chip: "Sin multitudes", chipCls: "bg-mint-soft text-mint-ink" },
    { d: dest("limon"), chip: "Guía local", chipCls: "bg-coral-soft text-coral-ink" },
    { d: dest("haitises"), chip: "En bote", chipCls: "bg-mango-soft text-mango-ink" },
  ];
  return (
    <div className="absolute inset-0 flex flex-col bg-[#F6F1E7]">
      <div className="px-3 pt-10">
        <div className="flex h-9 items-center gap-2 rounded-full bg-white px-3 shadow-card">
          <Icon name="search" className="text-base text-muted" />
          <span className="text-tiny text-muted">¿A dónde vamos?</span>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-hidden px-3 pt-2.5">
        <ChipCategoria label="Cerca de ti" activo />
        <ChipCategoria label="Playas" />
        <ChipCategoria label="Aventura" />
      </div>
      <div className="px-3 pb-1.5 pt-3 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
        Poco visitados
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3">
        {lugares.map(({ d, chip, chipCls }) => (
          <div key={d.id} className="flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-card">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-cream-2">
              <Image src={d.image} alt="" fill sizes="48px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-tiny font-bold text-ink">{d.name}</div>
              <div className="font-mono text-micro text-muted">
                {d.province} · ★ {d.rating}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-micro font-bold ${chipCls}`}>{chip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PuntoDeRuta({ n, meta }: { n: number; meta?: boolean }) {
  if (meta) return <GoalFlag size={26} />;
  return (
    <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-white bg-mango font-mono text-[9px] font-bold text-white shadow-[0_1px_3px_rgba(0,0,0,.3)]">
      {n}
    </span>
  );
}

function PantallaRuta() {
  const [a, b, c] = PARADAS_RUTA;
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      {/* cartografía falsa + trazo de la ruta */}
      <svg viewBox="0 0 236 490" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M-10,150 C70,120 150,220 250,180" fill="none" stroke="#fff" strokeWidth="13" opacity="0.7" />
        <path d="M60,-10 C90,120 30,300 130,500" fill="none" stroke="#fff" strokeWidth="11" opacity="0.6" />
        <path d="M55,235 C95,215 120,170 105,120 C97,92 130,75 160,70" fill="none" stroke="#FF8D16" strokeWidth="3.5" strokeDasharray="1.5 6" strokeLinecap="round" />
      </svg>
      <div className="absolute left-1/2 top-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-tiny font-bold text-ink shadow-card">
        Tu ruta · 3 paradas
      </div>
      <div className="absolute left-[47px] top-[226px]"><PuntoDeRuta n={1} /></div>
      <div className="absolute left-[96px] top-[110px]"><PuntoDeRuta n={2} /></div>
      <div className="absolute left-[150px] top-[42px]"><PuntoDeRuta n={3} meta /></div>

      <div className="absolute inset-x-2 bottom-2 rounded-panel bg-white p-2.5 shadow-card">
        {[
          { d: a, dato: "salida" },
          { d: b, dato: `${kmEntre(a.id, b.id)} km · ${fmtMin(minEntre(a.id, b.id))}` },
          { d: c, dato: `${kmEntre(b.id, c.id)} km · ${fmtMin(minEntre(b.id, c.id))}`, meta: true },
        ].map((fila, i) => (
          <div key={fila.d.id} className="flex items-center gap-2 py-[3px]">
            <span className="flex w-5 justify-center">
              {fila.meta ? (
                <GoalFlag size={18} />
              ) : (
                <span className="flex size-4 items-center justify-center rounded-full bg-mango font-mono text-[8px] font-bold text-white">
                  {i + 1}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-tiny font-bold text-ink">{fila.d.name}</span>
            <span className="shrink-0 font-mono text-micro text-muted">{fila.dato}</span>
          </div>
        ))}
        <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-line pt-1.5">
          <span className="font-mono text-micro font-bold text-ink">{KM_TOTAL} km · 2 días</span>
          <span className="rounded-full bg-mango px-3 py-1 text-micro font-bold text-white">Empezar</span>
        </div>
      </div>
    </div>
  );
}

function PantallaDiario() {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="flex items-center justify-between px-3 pt-10">
        <span className="text-sm font-bold text-ink">Mi diario</span>
        <Icon name="auto_stories" className="text-lg text-mango-ink" />
      </div>
      {/* polaroid con sello de visitado */}
      <div className="mx-4 mt-2 -rotate-2 rounded-md bg-white p-1.5 pb-1 shadow-card">
        <div className="relative h-[104px] overflow-hidden rounded-sm bg-cream-2">
          <Image src={dest("duarte").image} alt="" fill sizes="200px" className="object-cover" />
          <span className="absolute right-1.5 top-1.5 -rotate-6 rounded border-2 border-[#43A047] bg-white/80 px-1 py-px font-mono text-[8px] font-bold tracking-[.1em] text-[#2E7D32]">
            VISITADO
          </span>
        </div>
        <div className="flex items-baseline justify-between px-0.5 pt-1">
          <span className="font-hand text-sm text-ink">¡3,087 metros!</span>
          <span className="font-mono text-[8px] text-muted-2">Pico Duarte</span>
        </div>
      </div>
      {/* sellos ganados */}
      <div className="px-3 pt-2.5 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
        Tus sellos
      </div>
      <div className="flex items-center gap-1.5 px-3 pt-1">
        {(["hiking", "forest", "beach_access"] as IconName[]).map((n, i) => (
          <span
            key={n}
            className="flex size-7 items-center justify-center rounded-full border border-line bg-white"
            style={{ color: ["#985409", "#2E7D32", "#0C6A60"][i] }}
          >
            <Icon name={n} className="text-sm" />
          </span>
        ))}
        <span className="font-mono text-micro text-muted">+9</span>
      </div>
      {/* el gancho: insignia de fundador estampada */}
      <div className="mx-3 mb-3 mt-auto flex items-center gap-2.5 rounded-card bg-coral-soft p-2.5">
        <span className="flex -rotate-3 items-center justify-center rounded-[9px] border-2 border-coral-ink bg-white/70 p-1.5 text-coral-ink">
          <Icon name="workspace_premium" className="text-lg" />
        </span>
        <div className="min-w-0">
          <div className="text-tiny font-bold leading-tight text-coral-ink">Insignia de fundador</div>
          <div className="text-micro leading-[1.35] text-ink">Sello permanente para los primeros 500.</div>
        </div>
      </div>
    </div>
  );
}

// ─── Pantallas de la app — Negocios ──────────────────────────────────────────

function PantallaRegistro() {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="px-3 pt-10">
        <div className="text-sm font-bold text-ink">Crea tu perfil</div>
        <div className="font-mono text-micro text-muted-2">Gratis · listo en minutos</div>
      </div>
      <div className="flex flex-col gap-1.5 px-3 pt-2.5">
        <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
          <div className="text-micro text-muted-2">Nombre del negocio</div>
          <div className="text-tiny font-bold text-ink">Rancho La Cumbre</div>
        </div>
        <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
          <div className="text-micro text-muted-2">Categoría</div>
          <div className="mt-1 flex gap-1">
            <span className="rounded-full bg-coral-soft px-2 py-0.5 text-micro font-bold text-coral-ink">Comida criolla</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-micro text-muted">Hospedaje</span>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
          <div className="text-micro text-muted-2">Fotos</div>
          <div className="mt-1 flex gap-1.5">
            {["/assets/ph-sunset.png", "/assets/ph-pueblo.png"].map((src) => (
              <div key={src} className="relative size-11 overflow-hidden rounded-md bg-cream-2">
                <Image src={src} alt="" fill sizes="44px" className="object-cover" />
              </div>
            ))}
            <span className="flex size-11 items-center justify-center rounded-md border border-dashed border-muted-2 text-muted">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <div className="mx-3 mb-3 mt-auto flex h-10 items-center justify-center rounded-full bg-mango text-tiny font-bold text-white shadow-card">
        Publicar mi perfil
      </div>
    </div>
  );
}

function PantallaEnElMapa() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#EAF6F4,#DCEFEA)]">
      <svg viewBox="0 0 236 490" className="absolute inset-0 size-full" aria-hidden="true">
        <path d="M-10,160 C80,130 150,240 250,190" fill="none" stroke="#fff" strokeWidth="13" opacity="0.7" />
        <path d="M50,-10 C80,140 30,320 130,500" fill="none" stroke="#fff" strokeWidth="11" opacity="0.6" />
        {/* ruta del viajero pasando junto al negocio */}
        <path d="M120,420 C105,330 150,250 128,170 C118,132 140,100 165,80" fill="none" stroke="#FF8D16" strokeWidth="3.5" strokeDasharray="1.5 6" strokeLinecap="round" />
      </svg>
      {/* el viajero, en ruta */}
      <div className="absolute left-[100px] top-[382px]">
        <SelfPin heading={12} size={38} />
      </div>
      {/* tu negocio, visible en su camino */}
      <div className="absolute left-[128px] top-[150px] flex -translate-x-1/2 flex-col items-center gap-1">
        <div className="whitespace-nowrap rounded-full bg-ink/92 px-2 py-[3px] text-micro font-bold text-white shadow-card">
          Rancho La Cumbre
        </div>
        <div className={`flex size-8 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
          <Icon name="storefront" className="text-base text-white" />
        </div>
      </div>
      <div className="absolute inset-x-2 bottom-2 rounded-panel bg-white p-2.5 shadow-card">
        <div className="flex items-center gap-2">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-cream-2">
            <Image src="/assets/ph-sunset.png" alt="" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-tiny font-bold text-ink">Rancho La Cumbre</div>
            <div className="font-mono text-micro text-muted">★ 4.8 · desvío de 8 min</div>
          </div>
          <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-micro font-bold text-ink-2">
            Añadir parada
          </span>
        </div>
      </div>
    </div>
  );
}

type Llegada = { key: number; nombre: string; origen: string; color: string; coords: LngLat };

const ETIQUETA_TIEMPO = ["ahora mismo", "hace 2 min", "hace 5 min"];

function PantallaPanel({ llegadas, total }: { llegadas: Llegada[]; total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-cream">
      <div className="flex items-center justify-between px-3 pt-10">
        <span className="text-sm font-bold text-ink">Tu panel</span>
        <span className="flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5">
          <span className="block size-[6px] animate-live-dot rounded-full bg-mint" />
          <span className="text-micro font-bold text-mint-ink">EN VIVO</span>
        </span>
      </div>
      <div className="mx-3 mt-2 rounded-card bg-mango px-3 py-2.5 text-ink-2">
        <div className="text-micro font-semibold opacity-90">Clientes en camino</div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[30px] font-bold leading-none">{total}</span>
          <span className="text-micro opacity-90">ahora mismo</span>
        </div>
      </div>
      <div className="px-3 pb-1 pt-2.5 font-mono text-micro font-bold uppercase tracking-[.12em] text-muted-2">
        Llegadas
      </div>
      <div className="flex flex-col gap-1 px-3">
        {llegadas.slice(0, 3).map((ll, i) => (
          <div
            key={ll.key}
            className={`flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 shadow-card ${i === 0 ? "animate-slide-up" : ""}`}
          >
            <span className="size-[7px] shrink-0 rounded-full" style={{ background: ll.color }} />
            <span className="min-w-0 flex-1 truncate text-micro text-ink">
              <b>{ll.nombre}</b> · desde {ll.origen}
            </span>
            <span className="shrink-0 font-mono text-[8px] text-muted-2">{ETIQUETA_TIEMPO[i]}</span>
          </div>
        ))}
      </div>
      <div className="mx-3 mb-3 mt-auto grid grid-cols-2 gap-1.5">
        {[
          { label: "Hoy", val: "34" },
          { label: "Semana", val: "212" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white px-2 py-1.5 shadow-card">
            <div className="text-micro text-muted-2">{s.label}</div>
            <div className="font-mono text-sm font-bold text-ink">{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sección Viajeros ────────────────────────────────────────────────────────

function ViajerosV3() {
  const { activeScene } = useScene();
  const visible = activeScene === "viajeros";
  const [paso, setPaso] = useState(pasoInicial);

  const pantallas = [<PantallaExplorar key="e" />, <PantallaRuta key="r" />, <PantallaDiario key="d" />];

  const selloFundador = (
    <span className="mt-1.5 inline-flex -rotate-2 items-center gap-1 rounded-[7px] border-2 border-coral-ink px-1.5 py-0.5 font-mono text-micro font-bold uppercase tracking-[.1em] text-coral-ink">
      <Icon name="workspace_premium" className="text-xs" />
      Insignia de fundador
    </span>
  );

  return (
    <>
      {/* La misma ruta de la card, dibujada de verdad sobre la isla: pin →
          pin → bandera. Al pasar a "Arma tu ruta" aparece la carretera real. */}
      {visible && paso >= 1 && (
        <MapRoute id="vn3-ruta" coordinates={LINEA_RUTA} color="#FF8D16" width={3} opacity={0.9} dashArray={[0.2, 1.8]} />
      )}
      {visible &&
        PARADAS_RUTA.map((d, i) => (
          <MapMarker key={d.id} longitude={d.coords[0]} latitude={d.coords[1]} anchor={i === 2 ? "bottom" : "center"}>
            <MarkerContent>
              {i === 2 ? (
                <GoalFlag size={44} />
              ) : (
                <CategoryPin category={d.category} state={paso === 2 ? "done" : "default"} size={30} />
              )}
              <MarkerLabel position={i === 2 ? "right" : "top"}>{d.name}</MarkerLabel>
            </MarkerContent>
          </MapMarker>
        ))}

      <div
        aria-hidden={!visible}
        inert={!visible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* La gran card de viaje */}
        <div
          className={`crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 box-border w-[clamp(280px,30vw,400px)] -translate-y-1/2 rounded-panel ${PANEL_SOLID} p-[18px] shadow-modal ${
            visible ? "animate-slide-up" : ""
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <Kicker icon="hiking" index="03">Viajeros</Kicker>
            <span className="font-mono text-micro font-bold text-muted-2">
              PARADA {paso + 1}/3
            </span>
          </div>
          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Tu próximo viaje, <em className="crd-accent">en tres paradas</em>
          </h2>
          <p className="mb-3 mt-1.5 text-xs leading-[1.45] text-muted">
            Así funciona ConoceRD de principio a fin. Cada parada enseña la app de verdad.
          </p>

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <RailDePasos
                pasos={PASOS_VIAJERO}
                activo={paso}
                onActivo={setPaso}
                visible={visible}
                label="Cómo funciona ConoceRD para viajeros, en 3 pasos"
                extraPaso3={selloFundador}
              />
            </div>
            <MiniTelefono>
              <PilaDePantallas pantallas={pantallas} activo={paso} />
            </MiniTelefono>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-line pt-3">
            <Button variant="primary" icon="notifications_active" onClick={() => requestSubscribe("viajero")}>
              Unirme a la lista
            </Button>
            <span className="min-w-0 flex-1 text-micro leading-[1.4] text-muted">
              Los primeros 500 estrenan la insignia de fundador.
            </span>
          </div>
        </div>

        <TelefonoConChip pantallas={pantallas} activo={paso} nombres={PANTALLAS_VIAJERO} visible={visible} />
      </div>
    </>
  );
}

// ─── Sección Negocios ────────────────────────────────────────────────────────

const NEGOCIO: LngLat = [-70.6901, 19.4517];

const ORIGENES: { nombre: string; coords: LngLat; color: string }[] = [
  { nombre: "Santo Domingo", coords: [-69.93, 18.47], color: "#F76C4D" },
  { nombre: "Puerto Plata", coords: [-70.69, 19.79], color: "#FF8D16" },
  { nombre: "La Romana", coords: [-68.97, 18.43], color: "#25CCB8" },
  { nombre: "Samaná", coords: [-69.34, 19.2], color: "#FF8D16" },
  { nombre: "Barahona", coords: [-71.1, 18.21], color: "#F76C4D" },
  { nombre: "Punta Cana", coords: [-68.4, 18.58], color: "#25CCB8" },
];

const NOMBRES = ["María", "Luis", "Carmen", "Joel", "Ana", "Wander"];

const haceLlegada = (key: number): Llegada => {
  const o = ORIGENES[key % ORIGENES.length];
  return { key, nombre: NOMBRES[key % NOMBRES.length], origen: o.nombre, color: o.color, coords: o.coords };
};

// Dos llegadas ya en pantalla al entrar: el panel nunca se ve vacío.
const LLEGADAS_INICIALES: Llegada[] = [haceLlegada(1), haceLlegada(0)];

function NegociosV3() {
  const { activeScene } = useScene();
  const visible = activeScene === "negocios";
  const [paso, setPaso] = useState(pasoInicial);

  // Llegadas en vivo: cada pocos segundos "llega" un cliente nuevo mientras la
  // escena está activa (movimiento nacido de un dato, no de reposo).
  const [llegadas, setLlegadas] = useState<Llegada[]>(LLEGADAS_INICIALES);
  const proxKey = useRef(LLEGADAS_INICIALES.length);

  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => {
      setLlegadas((prev) => [haceLlegada(proxKey.current++), ...prev].slice(0, 4));
    }, 4200);
    return () => clearInterval(t);
  }, [visible]);

  const ultima = llegadas[0];
  const enCamino = 4 + (ultima?.key ?? 0);

  const pantallas = [
    <PantallaRegistro key="reg" />,
    <PantallaEnElMapa key="mapa" />,
    <PantallaPanel key="panel" llegadas={llegadas} total={enCamino} />,
  ];

  return (
    <>
      {/* Arcos de procedencia, siempre presentes; el de la última llegada se
          enciende (marching ants) al llegar el dato. */}
      {visible &&
        ORIGENES.map((o, i) => (
          <MapArc key={o.nombre} id={`vn3-arc-${i}`} from={o.coords} to={NEGOCIO} color={o.color} width={2} bend={0.22} animated={false} />
        ))}
      {visible && ultima && (
        <MapArc key={`live-${ultima.key}`} id="vn3-arc-live" from={ultima.coords} to={NEGOCIO} color={ultima.color} width={3.2} bend={0.22} animated />
      )}

      {/* Tu negocio en Santiago + toast de la última llegada */}
      {visible && (
        <MapMarker longitude={NEGOCIO[0]} latitude={NEGOCIO[1]} anchor="bottom">
          <MarkerContent>
            <div className="flex flex-col items-center gap-1">
              <div className="whitespace-nowrap rounded-full bg-ink/92 px-[9px] py-[3px] text-micro font-bold text-white shadow-card">
                Tu negocio
              </div>
              <div className={`flex size-10 items-center justify-center rounded-full bg-mango ${PIN_CHROME}`}>
                <Icon name="storefront" className="text-feature text-ink-2" />
              </div>
            </div>
            {ultima && (
              <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2">
                <div
                  key={ultima.key}
                  className="animate-slide-up whitespace-nowrap rounded-full border border-line bg-white/95 px-2.5 py-1 text-micro font-bold text-ink shadow-card"
                >
                  <span className="mr-1.5 inline-block size-[6px] rounded-full align-middle" style={{ background: ultima.color }} />
                  {ultima.nombre} salió de {ultima.origen}
                </div>
              </div>
            )}
          </MarkerContent>
        </MapMarker>
      )}

      <div
        aria-hidden={!visible}
        inert={!visible}
        className={`absolute inset-0 z-10 transition-opacity duration-500 ease-in-out ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* La gran card de ruta del negocio — misma anatomía que la de viajeros */}
        <div
          className={`crd-ol-panel absolute left-[clamp(16px,3%,40px)] top-1/2 box-border w-[clamp(280px,30vw,400px)] -translate-y-1/2 rounded-panel ${PANEL_SOLID} p-[18px] shadow-modal ${
            visible ? "animate-slide-up" : ""
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <Kicker icon="storefront" index="04">Negocios</Kicker>
            <span className="font-mono text-micro font-bold text-muted-2">
              PARADA {paso + 1}/3
            </span>
          </div>
          <h2 className="m-0 font-display text-[clamp(20px,2.2vw,27px)] font-bold leading-[1.06] tracking-[-.012em] text-ink-2">
            Tres pasos para <em className="crd-accent">estar en la ruta</em>
          </h2>
          <p className="mb-3 mt-1.5 text-xs leading-[1.45] text-muted">
            Del registro a ver clientes llegando. Cada parada enseña tu panel real.
          </p>

          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <RailDePasos
                pasos={PASOS_NEGOCIO}
                activo={paso}
                onActivo={setPaso}
                visible={visible}
                label="Cómo funciona ConoceRD para tu negocio, en 3 pasos"
              />
            </div>
            <MiniTelefono>
              <PilaDePantallas pantallas={pantallas} activo={paso} />
            </MiniTelefono>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-dashed border-line pt-3">
            <Button variant="mint" icon="add_business" onClick={() => requestSubscribe("negocio")}>
              Registrar mi negocio
            </Button>
            <span className="min-w-0 flex-1 text-micro leading-[1.4] text-muted">
              Gratis para negocios locales durante el lanzamiento.
            </span>
          </div>
        </div>

        <TelefonoConChip pantallas={pantallas} activo={paso} nombres={PANTALLAS_NEGOCIO} visible={visible} />
      </div>
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default function VNVariant3() {
  return (
    <>
      <ViajerosV3 />
      <NegociosV3 />
    </>
  );
}
