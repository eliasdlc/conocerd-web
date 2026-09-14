import s from "./estilos.module.css";

// Ventanas de descenso (0..1) en las que vive cada capítulo: entra en `a`,
// se queda, y sale en `b`. Antes del primero manda el hero; después del
// último, la etiqueta de aterrizaje de Marcadores.
const CAPITULOS: { a: number; b: number; texto: React.ReactNode }[] = [
  { a: 0.2, b: 0.42, texto: <>Playas, pueblos y negocios locales.</> },
  { a: 0.46, b: 0.7, texto: <>Recomendados por <em className="crd-accent">gente de aquí</em>.</> },
];

/**
 * El mensaje, repartido por la bajada. Cada tarjeta lee su ventana desde CSS:
 * opacidad y posición salen de `--t`, sin JS. Cristal del tema, tinta encima:
 * lee igual sobre el cielo crema y sobre el océano.
 */
export default function Capitulos() {
  return (
    <div className={s.capitulos} aria-hidden="true">
      {CAPITULOS.map((c) => (
        <p
          key={c.a}
          className={`${s.capitulo} m-0 font-display font-extrabold tracking-[-.02em] text-ink`}
          style={{ "--a": c.a, "--b": c.b, fontVariationSettings: '"opsz" 96' } as React.CSSProperties}
        >
          {c.texto}
        </p>
      ))}
    </div>
  );
}
