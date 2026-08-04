// El set de `Icon` no lleva glifos de marca, y una cámara genérica no se lee
// como Instagram. La marca va inline para que herede `currentColor` y no cueste
// una petición extra en la página que tiene que abrir rápido.

export default function InstagramGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </svg>
  );
}
