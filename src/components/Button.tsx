"use client";

import Icon, { type IconName } from "@/components/Icon";

interface ButtonProps {
  variant?: "primary" | "outline" | "mint";
  size?: "sm" | "lg";
  icon?: IconName;
  onClick?: () => void;
  children: React.ReactNode;
}

// `crd-sticker` trae la sombra y sus estados (globals.css): offset duro y
// neutro en vez del halo del mismo color que tenían antes (audit §3).
// Mango lleva texto e iconos blancos por decisión del dueño (jul 2026):
// comparado visualmente, el blanco sobre mango gana al ink oscuro.
const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "crd-sticker bg-mango text-white",
  outline: "border-2 border-ink bg-transparent text-ink",
  mint: "crd-sticker bg-mint text-ink-2",
};

const SIZES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-10 px-[18px] text-sm",
  lg: "h-14 px-[26px] text-base",
};

export default function Button({ variant = "primary", size = "sm", icon, onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      // .crd-button aporta el hover/active (translate + scale); vive en CSS
      // porque el :active necesita ganarle al hover.
      className={`crd-button inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full font-bold transition-[transform,box-shadow] duration-200 ${VARIANTS[variant]} ${SIZES[size]}`}
      onClick={onClick}
    >
      {icon && <Icon name={icon} className={size === "lg" ? "text-feature" : "text-lg"} />}
      {children}
    </button>
  );
}
