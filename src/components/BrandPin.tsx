// El pin del logo, reducido a glifo reutilizable. Lo usan la píldora del nav
// (marca en pantalla durante todo el journey) y el 404 (el pin que se cayó del
// mapa). Va inline y no como <img>: son 300 bytes y hereda el color por prop.

export default function BrandPin({
  size = 22,
  color = "#FF8D16",
  className = "",
}: {
  size?: number;
  /** Relleno de la gota. El hueco interior siempre es crema. */
  color?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"
        fill={color}
      />
      <circle cx="12" cy="9" r="2.7" fill="#FDF8F0" />
    </svg>
  );
}
