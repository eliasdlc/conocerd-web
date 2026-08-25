// Logos oficiales de las tiendas. El set de `Icon` es de trazo propio y un
// teléfono genérico no dice "App Store" ni una carpa dice "Google Play";
// aquí van las marcas reales, inline para no costar peticiones.
//
// Apple se dibuja monocromo (así lo exige su marca): hereda `currentColor`.
// El triángulo de Google Play sí es multicolor por identidad; `mono` lo
// degrada a currentColor para contextos donde el color competiría.

export function AppleGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09ZM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function GooglePlayGlyph({ size = 20, mono = false }: { size?: number; mono?: boolean }) {
  if (mono) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M1.34.92a1.5 1.5 0 0 0-.11.57v21.02c0 .21.04.42.12.6L12.5 12.02 1.34.92Zm12.21 10.06 3.26-3.24L3.45.2a1.47 1.47 0 0 0-.95-.18l11.05 10.96Zm0 2.07-11 10.93c.3.04.61-.02.9-.18l13.33-7.54-3.23-3.21Zm8.47-3.75-3.89-2.2-3.54 3.52 3.51 3.49 3.92-2.22a1.49 1.49 0 0 0 0-2.59Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="crd-gp-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00A0FF" />
          <stop offset="1" stopColor="#00E2FF" />
        </linearGradient>
        <linearGradient id="crd-gp-green" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#00F076" />
          <stop offset="1" stopColor="#11D574" />
        </linearGradient>
        <linearGradient id="crd-gp-yellow" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFBC00" />
          <stop offset="1" stopColor="#FF9800" />
        </linearGradient>
        <linearGradient id="crd-gp-red" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#FF3A44" />
          <stop offset="1" stopColor="#C31162" />
        </linearGradient>
      </defs>
      {/* Lado izquierdo (azul): del borde hasta el centro del triángulo. */}
      <path fill="url(#crd-gp-blue)" d="M1.34.92a1.5 1.5 0 0 0-.11.57v21.02c0 .21.04.42.12.6L12.5 12.02 1.34.92Z" />
      {/* Cara superior (verde): recorrido hasta la mitad derecha. */}
      <path fill="url(#crd-gp-green)" d="M16.81 7.74 3.45.2a1.47 1.47 0 0 0-.95-.18l11.05 10.96 3.26-3.24Z" />
      {/* Cara inferior (rojo). */}
      <path fill="url(#crd-gp-red)" d="M13.55 13.05l-11 10.93c.3.04.61-.02.9-.18l13.33-7.54-3.23-3.21Z" />
      {/* Punta (amarillo). */}
      <path fill="url(#crd-gp-yellow)" d="M22.02 9.3l-3.89-2.2-3.54 3.52 3.51 3.49 3.92-2.22a1.49 1.49 0 0 0 0-2.59Z" />
    </svg>
  );
}

// ─── Insignia de tienda ───────────────────────────────────────────────────────
//
// Señal de credibilidad, no acción: mientras no haya app publicada la insignia
// va atenuada y SIN enlace. Enlazarla llevaría a una ficha que no existe.
//
// Vive sobre tinta, así que sus dos textos se miden contra ella: el nombre al
// 55 % da 6.00:1 y es el piso de lo atenuado en todo el pie y la card del CTA.
// La baldosa es radio 12 (chip), hairline blanco al 14 % sobre blanco al 7 %.

export function StoreBadge({
  store,
  glyph,
  /** La leyenda va dentro de la insignia; en móvil se comparte fuera. */
  legend = true,
}: {
  store: string;
  glyph: React.ReactNode;
  legend?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-chip border border-white/[0.14] bg-white/[0.07] px-2.5 py-1.5 text-white/55 desk:gap-2 desk:px-3.5 desk:py-2">
      {glyph}
      <span className="text-left leading-[1.2]">
        {legend && (
          <span className="hidden font-label text-micro font-extrabold uppercase tracking-[.08em] text-white/70 desk:block">
            Próximamente en
          </span>
        )}
        <span className="font-label text-[13px] font-bold">{store}</span>
      </span>
    </div>
  );
}
