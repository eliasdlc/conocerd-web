import Icon, { type IconName } from "@/components/Icon";

interface CategoryChipProps {
  icon: IconName;
  children: React.ReactNode;
}

export default function CategoryChip({ icon, children }: CategoryChipProps) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full bg-ink/70 px-[11px] py-[5px] text-xs font-bold text-white backdrop-blur-[8px]">
      <Icon name={icon} className="text-sm" />
      {children}
    </span>
  );
}
