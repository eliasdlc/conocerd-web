import s from "./estilos.module.css";

// Cuño rectangular de aduana. Decorativo por defecto (aria-hidden): lo que dice
// ya está en el copy visible, y un lector de pantalla que lea "PURO LOCAL /
// NADA DE TRAMPA" fuera de contexto solo añade ruido.
export default function SelloTinta({
  titulo,
  sub,
  color = "var(--color-mint-ink)",
  giro = -7,
  retardo = 0,
  className = "",
}: {
  titulo: string;
  sub?: string;
  /** Tinta del cuño. Usar siempre las variantes accesibles (-ink). */
  color?: string;
  /** Ángulo de tampón manual, en grados. */
  giro?: number;
  /** Retardo de la caída, en segundos. */
  retardo?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`${s.cae} ${s.selloTinta} ${className}`}
      style={
        {
          color,
          "--giro": `${giro}deg`,
          "--d": `${retardo}s`,
        } as React.CSSProperties
      }
    >
      <span className={s.selloTintaTitulo}>{titulo}</span>
      {sub && <span className={s.selloTintaSub}>{sub}</span>}
    </span>
  );
}
