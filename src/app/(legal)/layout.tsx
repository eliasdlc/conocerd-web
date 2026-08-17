import Image from "next/image";
import Link from "next/link";

// Shell compartido de las páginas legales: prosa legible, sin journey ni mapa.
//
// Los estilos venían inline de antes del sistema de tokens y quedaron fuera del
// restyling de Fase D — legales y 404 se veían de otra época que el resto del
// sitio (audit 5.8). Ahora usan los mismos tokens; la prosa la estila .crd-legal
// desde globals.css, que ya pasó al serif editorial.

const FOOT_LINK =
  "inline-flex min-h-[44px] items-center text-tiny text-white/60 no-underline transition-colors hover:text-white focus-visible:text-white";

const NAV_LINK =
  "inline-flex min-h-[44px] items-center px-2 text-tiny font-bold text-muted no-underline transition-colors hover:text-ink focus-visible:text-ink";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream">
      <a href="#contenido" className="crd-skip-link">Ir al contenido</a>

      <header className="border-b border-line bg-cream/92">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-[clamp(18px,5vw,56px)] py-3">
          <Link href="/" className="inline-flex min-h-[44px] min-w-[44px] items-center">
            <Image
              src="/assets/wordmark.svg"
              alt="ConoceRD"
              width={114}
              height={36}
              className="h-9 w-auto"
            />
          </Link>

          <nav aria-label="Navegación legal" className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            <Link href="/" className={NAV_LINK}>Inicio</Link>
            <Link href="/privacidad" className={NAV_LINK}>Privacidad</Link>
            <Link href="/terminos" className={NAV_LINK}>Términos</Link>
          </nav>
        </div>
      </header>

      <main id="contenido" className="flex-1 px-[clamp(18px,5vw,56px)] py-[clamp(38px,7vw,72px)]">
        <div className="crd-legal mx-auto max-w-[680px] has-[.crd-account-deletion]:max-w-[1040px]">
          {children}
        </div>
      </main>

      <footer className="bg-ink-2 text-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[clamp(18px,5vw,56px)] py-6">
          <div className="flex items-center gap-4">
            <Image
              src="/assets/wordmark.svg"
              alt="ConoceRD"
              width={101}
              height={32}
              className="h-8 w-auto [filter:brightness(0)_invert(1)]"
            />
            <span className="font-mono text-micro text-white/45">Hecho con orgullo en RD</span>
          </div>
          <nav aria-label="Enlaces legales" className="flex flex-wrap gap-x-5">
            <Link href="/privacidad" className={FOOT_LINK}>Privacidad</Link>
            <Link href="/terminos" className={FOOT_LINK}>Términos</Link>
            <Link href="/eliminar-cuenta" className={FOOT_LINK}>Eliminar cuenta</Link>
            <Link href="/lista" className={FOOT_LINK}>Lista de espera</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
