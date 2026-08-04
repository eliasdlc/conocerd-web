"use client";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import { AppleGlyph, GooglePlayGlyph } from "@/components/StoreGlyphs";
import { requestSubscribe } from "@/hooks/useSubscribeIntent";
import { scrollToSection } from "@/lib/journeyNav";
import { DESTINATIONS } from "@/data/destinations";

// Atribución obligatoria de las fotos CC BY / BY-SA (Wikimedia Commons). Se
// deriva de los datos para que añadir o cambiar una foto no desincronice el
// crédito.
const PHOTO_CREDITS = [
  ...new Set(DESTINATIONS.map((d) => d.imageCredit).filter(Boolean)),
].join(" · ");

// #14 — footer rediseñado: columnas con info útil (marca, nav, producto,
// contacto) + social (placeholder hasta tener handles reales) + legal.

const NAV_LINKS = [
  { label: "Destinos", target: "trigger-polaroid-0" },
  { label: "Mapa", target: "trigger-mapa" },
  { label: "Viajeros", target: "trigger-viajeros" },
  { label: "Negocios", target: "trigger-negocios" },
  { label: "Equipo", target: "trigger-equipo" },
];

// Las apps aún no están publicadas: aquí sólo se anuncian (§2.4). La única
// acción del footer es "Registrar mi negocio", que abre la lista de espera.
// Logos oficiales de tienda; Apple monocromo (regla de su marca) y Play mono
// para no meter color de otra marca en el footer oscuro.
const COMING_SOON: { label: string; glyph: React.ReactNode }[] = [
  { label: "App Store · próximamente", glyph: <AppleGlyph size={15} /> },
  { label: "Google Play · próximamente", glyph: <GooglePlayGlyph size={14} mono /> },
];

// Los dos estilos que se repetían como objetos y se extendían con spread; como
// clases se componen igual, añadiendo utilidades después.
const LINK =
  "flex w-fit cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-left text-copy leading-[2] text-white/72 no-underline";
const HEADING =
  "mb-2.5 text-xs font-bold uppercase tracking-[.12em] text-white/50";

export default function Footer() {
  return (
    <footer className="bg-ink-2 text-white">
      {/* La columna de marca sólo lleva el wordmark: el formulario de la lista
          vive en CTASection, justo encima, y aquí se duplicaba entero (mismo
          kicker "Descubre lo nuestro" incluido). Contacto pide algo más de
          ancho porque el correo es la línea más larga del bloque. */}
      <div className="crd-footer-grid mx-auto grid max-w-[1100px] grid-cols-[0.8fr_1fr_1fr_1.2fr] gap-x-[clamp(20px,4vw,48px)] gap-y-8 px-[clamp(20px,5vw,56px)] pb-7 pt-14">
        {/* Marca */}
        <div>
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={127}
            height={40}
            className="h-10 w-auto opacity-95 [filter:brightness(0)_invert(1)]"
          />
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
              {p.glyph}
              {p.label}
            </div>
          ))}
          <button className={LINK} onClick={() => requestSubscribe("negocio")}>
            <Icon name="storefront" className="text-base" />
            Registrar mi negocio
          </button>
        </div>

        {/* Contacto */}
        <div>
          <div className={HEADING}>Contacto</div>
          <a href="mailto:contacto@conocerd.app" className={`${LINK} leading-[1.8]`}>
            <Icon name="mail" className="text-base" />
            contacto@conocerd.app
          </a>
          <div className={`${LINK} cursor-default leading-[1.8]`}>
            <Icon name="location_on" className="text-base" />
            Santiago, RD 🇩🇴
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-[clamp(20px,5vw,56px)] py-4">
        <p className="m-0 w-full font-mono text-[10px] leading-[1.7] text-white/35">
          Fotos de destinos vía Wikimedia Commons: {PHOTO_CREDITS}.
        </p>
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
