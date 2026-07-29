interface CategoryChipProps {
  icon: string;
  children: React.ReactNode;
}

export default function CategoryChip({ icon, children }: CategoryChipProps) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full bg-ink/70 px-[11px] py-[5px] font-display text-xs font-bold text-white backdrop-blur-[8px]">
      <span className="ms text-sm" aria-hidden="true">{icon}</span>
      {children}
    </span>
  );
}
