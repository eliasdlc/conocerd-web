// Baldosa de Instagram: la única presencia de una marca ajena con su degradado
// oficial en todo el sitio, y por eso vive sólo en /lista. Mientras la app no
// esté en las tiendas, Instagram es la vía real para no perder a quien llegó
// por el QR: aparece como acompañamiento junto al formulario y como la única
// acción posible después del registro.
//
// La baldosa mide 38 a radio 12 (chip) dentro de una fila a radio 18 (bloque):
// la regla de anidado, el radio interior nunca mayor que el exterior.

import Icon from "@/components/Icon";
import InstagramGlyph from "./InstagramGlyph";
import { INSTAGRAM } from "./content";

export default function InstagramTile({
  caption = "Los destinos que vamos sumando, antes de que salga la app.",
  className = "",
  style,
}: {
  caption?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={INSTAGRAM.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`crd-lista-ig-card flex items-center gap-3 rounded-block border border-line bg-paper px-[15px] py-[13px] text-left no-underline ${className}`}
      style={style}
    >
      <span
        aria-hidden="true"
        className="flex size-[38px] shrink-0 items-center justify-center rounded-chip bg-[radial-gradient(circle_at_28%_110%,#FDF497_0%,#FD5949_45%,#D6249F_60%,#285AEB_90%)] text-white"
      >
        <InstagramGlyph size={20} />
      </span>
      <span className="min-w-0">
        <span className="block font-label text-body font-bold text-ink">{INSTAGRAM.handle}</span>
        <span className="block text-tiny leading-[1.4] text-muted">{caption}</span>
      </span>
      <Icon name="arrow_outward" className="ml-auto shrink-0 text-xl text-muted" />
    </a>
  );
}
