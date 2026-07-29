"use client";
import Image from "next/image";
import Link from "next/link";
import SubscribeForm from "@/components/SubscribeForm";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";

// #14 — footer rediseñado: columnas con info útil (marca, nav, producto,
// contacto) + social (placeholder hasta tener handles reales) + legal.

const NAV_LINKS = [
  { label: "Destinos", target: "trigger-destinos-intro" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

// Las apps aún no están publicadas: aquí sólo se anuncian (§2.4). La acción
// real del footer es el formulario de la lista.
const COMING_SOON = [
  { label: "iOS · próximamente", icon: "phone_iphone" },
  { label: "Android · próximamente", icon: "android" },
];

// Los dos estilos que se repetían como objetos y se extendían con spread; como
// clases se componen igual, añadiendo utilidades después.
const LINK =
  "flex w-fit cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-left font-display text-[13.5px] leading-[2] text-white/72 no-underline";
const HEADING =
  "mb-2.5 font-display text-xs font-extrabold uppercase tracking-[.12em] text-white/50";

export default function Footer() {
  return (
    <footer className="bg-ink-2 text-white">
      {/* La primera columna lleva el formulario de la lista: necesita ancho
          suficiente para que el campo y el botón quepan en una sola línea. */}
      <div className="crd-footer-grid mx-auto grid max-w-[1100px] grid-cols-[1.6fr_1fr_1fr_1.1fr] gap-x-[clamp(20px,4vw,48px)] gap-y-8 px-[clamp(20px,5vw,56px)] pb-7 pt-14">
        {/* Marca */}
        <div>
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={127}
            height={40}
            className="h-10 w-auto opacity-95 [filter:brightness(0)_invert(1)]"
          />
          <div className="mb-3 mt-1.5 font-hand text-[22px] text-mint">Descubre lo nuestro</div>
          <p className="mb-3.5 max-w-[260px] text-[13px] leading-[1.6] text-white/62">
            La app que te lleva a la República Dominicana auténtica: lugares locales y experiencias reales, en una sola ruta.
          </p>
          <div className="max-w-[320px]">
            <div className={`${HEADING} mb-2`}>Lista de espera</div>
            <SubscribeForm tone="dark" layout="compact" source="footer" />
          </div>
        </div>

        {/* Explora */}
        <nav>
          <div className={HEADING}>Explora</div>
          {NAV_LINKS.map((l) => (
            <button key={l.target} className={LINK} onClick={() => scrollToSection(l.target)}>
              {l.label}
            </button>
          ))}
        </nav>

        {/* Producto */}
        <div>
          <div className={HEADING}>Producto</div>
          {COMING_SOON.map((p) => (
            <div key={p.label} className={`${LINK} cursor-default text-white/45`}>
              <span className="ms text-base" aria-hidden="true">{p.icon}</span>
              {p.label}
            </div>
          ))}
          <button className={LINK} onClick={() => requestSubscribe("negocio")}>
            <span className="ms text-base" aria-hidden="true">storefront</span>
            Registrar mi negocio
          </button>
        </div>

        {/* Contacto */}
        <div>
          <div className={HEADING}>Contacto</div>
          <a href="mailto:hola@conocerd.app" className={`${LINK} leading-[1.8]`}>
            <span className="ms text-base" aria-hidden="true">mail</span>
            hola@conocerd.app
          </a>
          <div className={`${LINK} cursor-default leading-[1.8]`}>
            <span className="ms text-base" aria-hidden="true">location_on</span>
            Santiago, RD 🇩🇴
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-[clamp(20px,5vw,56px)] py-4">
        <div className="font-mono text-xs text-white/45">
          © 2026 ConoceRD · Hecho con orgullo en RD
        </div>
        <div className="flex gap-[18px]">
          <Link href="/privacidad" className="text-xs text-white/55 no-underline">Privacidad</Link>
          <Link href="/terminos" className="text-xs text-white/55 no-underline">Términos</Link>
        </div>
      </div>
    </footer>
  );
}
