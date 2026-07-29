"use client";

interface ButtonProps {
  variant?: "primary" | "outline" | "mint";
  size?: "sm" | "lg";
  icon?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

const variantStyles = {
  primary: {
    bg: "var(--color-mango)",
    color: "#fff",
    border: "none",
    shadow: "0 6px 20px rgba(255,141,22,.34)",
  },
  outline: {
    bg: "transparent",
    color: "#264653",
    border: "2px solid #264653",
    shadow: "none",
  },
  mint: {
    bg: "#25CCB8",
    color: "#1D3A45",
    border: "none",
    shadow: "0 6px 20px rgba(37,204,184,.35)",
  },
};

export default function Button({ variant = "primary", size = "sm", icon, onClick, children }: ButtonProps) {
  const v = variantStyles[variant];
  const height = size === "lg" ? 56 : 40;
  const fontSize = size === "lg" ? 16 : 14;
  const px = size === "lg" ? 26 : 18;
  const iconSize = size === "lg" ? 22 : 18;

  return (
    <button
      type="button"
      className={`crd-button crd-button-${variant}`}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height,
        padding: `0 ${px}px`,
        borderRadius: 999,
        background: v.bg,
        color: v.color,
        border: v.border,
        boxShadow: v.shadow,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        fontSize,
        cursor: "pointer",
        transition: "transform .2s, box-shadow .2s",
        whiteSpace: "nowrap",
      }}
    >
      {icon && <span className="ms" aria-hidden="true" style={{ fontSize: iconSize }}>{icon}</span>}
      {children}
    </button>
  );
}
