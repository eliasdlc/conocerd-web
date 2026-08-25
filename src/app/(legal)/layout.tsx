import Image from "next/image";
import Link from "next/link";

// Shell compartido de las páginas legales: prosa legible, sin journey ni mapa.
//
// Los estilos venían inline de antes del sistema de tokens y quedaron fuera del
// primer restyling: legales y 404 se veían de otra época que el resto del
// sitio. Ahora usan los mismos tokens; la prosa la estila .crd-legal desde
// globals.css.

const FOOT_LINK =
  "inline-flex min-h-[44px] items-center px-2 text-tiny text-muted no-underline";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-cream px-[clamp(18px,5vw,32px)] pb-14 pt-7">
      {/* La página de borrado va a dos columnas y pide más ancho que la prosa. */}
      <div className="mx-auto max-w-[680px] has-[.crd-account-deletion]:max-w-[1040px]">
        <Link
          href="/"
          className="mb-[26px] inline-flex min-h-[44px] min-w-[44px] items-center"
        >
          <Image
            src="/assets/wordmark.svg"
            alt="ConoceRD"
            width={101}
            height={32}
            className="h-8 w-auto"
          />
        </Link>

        <div className="crd-legal">{children}</div>

        <div className="mt-9 flex gap-2 border-t border-line pt-3.5">
          <Link href="/privacidad" className={FOOT_LINK}>Privacidad</Link>
          <Link href="/terminos" className={FOOT_LINK}>Términos</Link>
          <Link href="/eliminar-cuenta" className={FOOT_LINK}>Eliminar cuenta</Link>
          <Link href="/lista" className={FOOT_LINK}>Lista de espera</Link>
        </div>
      </div>
    </main>
  );
}
