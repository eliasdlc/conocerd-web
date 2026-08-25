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

// El cierre del sitio, sobre tinta: cuatro columnas (marca, explora, producto,
// contacto) sobre un degradado de tinta a 135°, la misma superficie del panel
// de tinta de la app. No es tema oscuro: es una superficie. Por eso la acción
// se invierte —píldora de papel con texto en tinta— en vez de teñirse de coral.
//
// El piso de lo atenuado es el 55 %: blanco al 55 % sobre ink da 6.00:1 y pasa
// AA. Nada baja de ahí. La atribución de fotos iba al 35 % y reprobaba.

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
  { label: "Google Play · próximamente", glyph: <GooglePlayGlyph size={15} mono /> },
];

// Los dos estilos que se repetían como objetos y se extendían con spread; como
// clases se componen igual, añadiendo utilidades después.
const LINK =
  "flex w-fit cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-left text-[14px] leading-[2] text-white/70 no-underline";
const HEADING =
  "mb-2.5 font-label text-micro font-extrabold uppercase tracking-[.12em] text-white/70";

export default function Footer() {
  return (
    <footer className="bg-[linear-gradient(135deg,var(--color-ink),var(--color-ink-2))] text-white">
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
            <div key={p.label} className={`${LINK} cursor-default text-white/55`}>
              {p.glyph}
              {p.label}
            </div>
          ))}
          {/* La única acción del pie. Sobre tinta la primaria se invierte:
              píldora de papel con texto en tinta, nunca coral. */}
          <button
            className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border-none bg-paper px-4 font-label text-[14px] font-bold text-ink"
            onClick={() => requestSubscribe("negocio")}
          >
            <Icon name="storefront" className="text-[15px]" />
            Registrar mi negocio
          </button>
        </div>

        {/* Contacto */}
        <div>
          <div className={HEADING}>Contacto</div>
          <a href="mailto:contacto@conocerd.app" className={`${LINK} leading-[1.8]`}>
            <Icon name="mail" className="text-[15px]" />
            contacto@conocerd.app
          </a>
          <div className={`${LINK} cursor-default leading-[1.8]`}>
            <Icon name="location_on" className="text-[15px]" />
            Santiago, RD 🇩🇴
          </div>
        </div>
      </div>

      {/* Legal */}
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-[clamp(20px,5vw,56px)] py-4">
        <p className="m-0 w-full text-xs leading-[1.7] text-white/55">
          Fotos de destinos vía Wikimedia Commons: {PHOTO_CREDITS}.
        </p>
        <div className="text-xs text-white/55">
          © 2026 ConoceRD · Hecho con orgullo en RD
        </div>
        {/* Área táctil de 44: son los dos enlaces obligatorios del sitio y
            caen justo en el borde inferior, donde el pulgar falla más. */}
        <div className="flex gap-[18px]">
          <Link href="/privacidad" className="inline-flex h-11 items-center text-xs text-white/70 no-underline">Privacidad</Link>
          <Link href="/terminos" className="inline-flex h-11 items-center text-xs text-white/70 no-underline">Términos</Link>
        </div>
      </div>
    </footer>
  );
}
