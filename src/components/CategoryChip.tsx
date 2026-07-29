interface CategoryChipProps {
  icon: string;
  children: React.ReactNode;
}

export default function CategoryChip({ icon, children }: CategoryChipProps) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      background: "rgba(38,70,83,.70)",
      color: "#fff",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700,
      fontSize: 12,
      padding: "5px 11px",
      borderRadius: 999,
      backdropFilter: "blur(8px)",
    }}>
      <span className="ms" aria-hidden="true" style={{ fontSize: 14 }}>{icon}</span>
      {children}
    </span>
  );
}
