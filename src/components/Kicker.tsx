// Sello de expedición de cada escena (audit §3, movimiento 8).
//
// Marca de bitácora: número de capítulo y nombre en español, en mono. La
// coordenada que acompañaba al sello se retiró: repetida en cada escena no
// aportaba información y leía como adorno.
//
// `variant="pill"` recupera la píldora pastel con icono para los eyebrows que
// funcionan como etiqueta de audiencia (/lista: "Para viajeros" / "Para
// negocios"), donde el sello mono se sentía frío.

import Icon, { type IconName } from "@/components/Icon";

// Tonos ya validados para AA sobre superficie clara; `on-ink` es para la card
// oscura del CTA. `pillBg` es el pastel de la variante píldora.
const TONES = {
  mint: { text: "text-mint-ink", pillBg: "bg-mint-soft" },
  coral: { text: "text-coral-ink", pillBg: "bg-coral-soft" },
  mango: { text: "text-mango-ink", pillBg: "bg-mango-soft" },
  "on-ink": { text: "text-white/70", pillBg: "bg-white/10" },
} as const;

export default function Kicker({
  icon,
  index,
  tone = "mint",
  variant = "stamp",
  className = "",
  children,
}: {
  icon: IconName;
  /** Número de capítulo del journey ("01"…"06"). Fuera del journey se omite. */
  index?: string;
  tone?: keyof typeof TONES;
  /** `stamp` = sello mono del journey. `pill` = píldora pastel con icono. */
  variant?: "stamp" | "pill";
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];

  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-micro font-bold uppercase tracking-[.14em] ${t.pillBg} ${t.text} ${className}`}
      >
        <Icon name={icon} className="text-sm" />
        <span>{children}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-[7px] font-mono text-micro font-bold uppercase tracking-[.14em] ${t.text} ${className}`}
    >
      <Icon name={icon} className="text-sm" />
      {index && (
        <>
          <span>{index}</span>
          <span aria-hidden="true" className="opacity-45">·</span>
        </>
      )}
      <span>{children}</span>
    </span>
  );
}
