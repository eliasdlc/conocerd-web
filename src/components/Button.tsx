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
    bg: "linear-gradient(135deg,#C74420,#B23410)",
    color: "#fff",
    border: "none",
    shadow: "0 6px 20px rgba(247,108,77,.40)",
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
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.03)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
    >
      {icon && <span className="ms" style={{ fontSize: iconSize }}>{icon}</span>}
      {children}
    </button>
  );
}
