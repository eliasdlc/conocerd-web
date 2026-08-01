// Eyebrow de sección: píldora en tono suave con icono y versalita espaciada.
// Estaba copiada carácter por carácter en Viajeros, Equipo y /lista (audit 4.5),
// con `gap` distinto en cada copia.

import Icon, { type IconName } from "@/components/Icon";

// Pares fondo/texto ya validados para AA (las variantes -ink existen justo para
// esto). Van como literales completos porque Tailwind no puede resolver clases
// compuestas en tiempo de compilación.
const TONES = {
  mint: "bg-mint-soft text-mint-ink",
  coral: "bg-coral-soft text-coral-ink",
  mango: "bg-mango-soft text-mango-ink",
} as const;

export default function Kicker({
  icon,
  tone = "mint",
  className = "",
  children,
}: {
  icon: IconName;
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] rounded-full px-3 py-[5px] font-display text-mini font-extrabold uppercase tracking-[.12em] ${TONES[tone]} ${className}`}
    >
      <Icon name={icon} className="text-sm" />
      {children}
    </span>
  );
}
