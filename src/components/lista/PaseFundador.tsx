import Icon from "@/components/Icon";

// ─────────────────────────────────────────────────────────────────────────────
//  El pase de fundador: lo que /lista prometía como "badge de fundador" en una
//  card de texto, ahora como objeto. Sin número es un pase en blanco con el
//  talón que dice cómo se completa; con el registro hecho, el número de la
//  fila (el `id` de la lista de espera) se escribe en el mismo pase, en su
//  sitio. Sólo CSS y un glifo del set: ni imagen, ni fuente, ni fetch, que es
//  la condición de la página del QR.
// ─────────────────────────────────────────────────────────────────────────────

export default function PaseFundador({ numero }: { numero?: number }) {
  const listo = typeof numero === "number";
  return (
    <div
      aria-live="polite"
      className="crd-lista-in mb-4 grid grid-cols-[1fr_auto] overflow-hidden rounded-surface border border-line bg-paper shadow-e1 [animation-delay:.08s]"
    >
      <div className="px-5 pb-4 pt-[15px]">
        <p className="m-0 font-label text-micro font-extrabold uppercase tracking-[.16em] text-muted">
          Pase de fundador
        </p>
        <p className="m-0 mt-1 font-display text-[34px] font-extrabold leading-none tracking-[-.03em] text-ink">
          Nº{" "}
          <span className={listo ? "text-mango-ink" : "text-mango opacity-40"}>
            {listo ? String(numero).padStart(3, "0") : "000"}
          </span>
        </p>
        <p className="m-0 mt-2 text-tiny leading-[1.4] text-ink-3">
          {listo
            ? "Ya es tuyo. Queda en tu perfil para siempre."
            : "Tu número se asigna al unirte y queda en tu perfil para siempre."}
        </p>
      </div>
      {/* El talón: troquel punteado y, hasta que hay número, la instrucción. */}
      <div className="flex w-[104px] flex-col items-center justify-center gap-1.5 border-l border-dashed border-line-strong px-3 text-center font-label text-[11px] font-bold uppercase leading-[1.3] tracking-[.06em] text-muted">
        {listo ? (
          <>
            <Icon name="workspace_premium" className="text-[26px] text-mango-ink" />
            Fundador
          </>
        ) : (
          "Se completa al unirte"
        )}
      </div>
    </div>
  );
}
