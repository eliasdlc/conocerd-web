// Sello de expedición de cada escena (audit §3, movimiento 8).
//
// Antes era una píldora pastel con icono —el chip de cualquier dashboard— y
// una de ellas decía "HIDDEN GEMS" en inglés, que en un sitio sobre lo
// dominicano es fuga de identidad. Ahora es una marca de bitácora: número de
// capítulo, nombre en español y la latitud del país, todo en mono. La misma
// coordenada se repite en todas las escenas a propósito: es el sello del país,
// no la posición de la cámara.
//
// Estaba copiado carácter por carácter en Viajeros, Equipo y /lista (audit
// 4.5), con `gap` distinto en cada copia.

import Icon, { type IconName } from "@/components/Icon";

/** Latitud del centro geográfico de la República Dominicana. */
const RD_LAT = "18.73°N";

// Tonos ya validados para AA sobre superficie clara; `on-ink` es para la card
// oscura del CTA.
const TONES = {
  mint: "text-mint-ink",
  coral: "text-coral-ink",
  mango: "text-mango-ink",
  "on-ink": "text-white/70",
} as const;

export default function Kicker({
  icon,
  index,
  coord = RD_LAT,
  tone = "mint",
  className = "",
  children,
}: {
  icon: IconName;
  /** Número de capítulo del journey ("01"…"06"). Fuera del journey se omite. */
  index?: string;
  /** Sustituye la latitud del país cuando la escena tiene una propia. */
  coord?: string;
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] font-mono text-micro font-bold uppercase tracking-[.14em] ${TONES[tone]} ${className}`}
    >
      <Icon name={icon} className="text-sm" />
      {index && (
        <>
          <span>{index}</span>
          <span aria-hidden="true" className="opacity-45">·</span>
        </>
      )}
      <span>{children}</span>
      <span aria-hidden="true" className="opacity-45">·</span>
      <span>{coord}</span>
    </span>
  );
}
