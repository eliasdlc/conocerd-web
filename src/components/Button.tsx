"use client";

import Icon, { type IconName } from "@/components/Icon";

interface ButtonProps {
  variant?: "primary" | "outline" | "mint";
  size?: "sm" | "lg";
  icon?: IconName;
  onClick?: () => void;
  children: React.ReactNode;
}

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-mango text-white shadow-[0_6px_20px_rgba(255,141,22,.34)]",
  outline: "border-2 border-ink bg-transparent text-ink",
  mint: "bg-mint text-ink-2 shadow-[0_6px_20px_rgba(37,204,184,.35)]",
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
      className={`crd-button inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full font-display font-bold transition-[transform,box-shadow] duration-200 ${VARIANTS[variant]} ${SIZES[size]}`}
      onClick={onClick}
    >
      {icon && <Icon name={icon} className={size === "lg" ? "text-[22px]" : "text-lg"} />}
      {children}
    </button>
  );
}
