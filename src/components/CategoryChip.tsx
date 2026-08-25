import Icon, { type IconName } from "@/components/Icon";

interface CategoryChipProps {
  icon: IconName;
  children: React.ReactNode;
}

// Píldora de cristal sobre foto, la misma receta que la app usa encima de una
// imagen: blanco al 70 % con blur 12 y el contenido en tinta. El relleno de
// tinta al 70 % que llevaba antes convertía el chip en un parche opaco sobre la
// foto; en cristal se apoya en ella. El piso medido sobre la foto más oscura de
// la pila es 8.25:1.
export default function CategoryChip({ icon, children }: CategoryChipProps) {
  return (
    <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full bg-white/70 px-[11px] py-[5px] font-label text-xs font-bold text-ink backdrop-blur-[12px]">
      <Icon name={icon} className="text-sm" />
      {children}
    </span>
  );
}
