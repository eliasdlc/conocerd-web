"use client";

import Icon, { type IconName } from "@/components/Icon";

type Size = "sm" | "md" | "lg";

interface Common {
  icon?: IconName;
  onClick?: () => void;
  /** Overrides puntuales de layout (p. ej. `max-[899px]:w-full`). */
  className?: string;
  /** Color del icono cuando debe diferir del texto. */
  iconClassName?: string;
  children: React.ReactNode;
}

// El tamaño no es libre por variante, y la razón es de contraste medido: blanco
// sobre coral da 3.81:1, que pasa AA sólo como texto grande (≥19 w700). Por
// debajo de ese cuerpo el relleno tiene que ser `selected`, que da 17.39:1 a
// cualquier tamaño. La unión discriminada hace que un botón coral de 40 no
// compile, en vez de dejar que reaparezca en la siguiente escena.
type ByVariant =
  | { variant?: "primary"; size?: "lg" }
  | { variant: "selected" | "ghost"; size?: Size };

type ButtonProps = Common & ByVariant;

const VARIANTS = {
  /** Acción primaria: el acento se enciende con su propio resplandor (e2). */
  primary: "bg-coral text-white shadow-e2",
  /** Todo lo que no llega a 19 w700, y toda selección. */
  selected: "bg-selected text-on-selected",
  /** Secundaria: el contorno de 2 en tinta murió; es un hairline de 1.5. */
  ghost: "border-[1.5px] border-line-strong bg-transparent text-ink",
} as const;

const SIZES: Record<Size, string> = {
  sm: "h-10 px-[18px] text-[14px]",
  md: "h-12 px-[22px] text-[15px]",
  lg: "h-[54px] px-[26px] text-[19px]",
};

export default function Button({
  variant = "primary",
  size,
  icon,
  onClick,
  className = "",
  iconClassName = "",
  children,
}: ButtonProps) {
  const resolved: Size = size ?? (variant === "primary" ? "lg" : "sm");

  return (
    <button
      type="button"
      // .crd-button aporta el hover/active (translate); vive en CSS porque el
      // :active necesita ganarle al hover.
      className={`crd-button inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full font-label font-bold transition-[transform,box-shadow] duration-200 ${VARIANTS[variant]} ${SIZES[resolved]} ${className}`}
      onClick={onClick}
    >
      {icon && (
        <Icon
          name={icon}
          className={`${resolved === "lg" ? "text-feature" : "text-lg"} ${iconClassName}`}
        />
      )}
      {children}
    </button>
  );
}
