import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { GRUPOS, variantesDe, type HeroVariant } from "./_lib/variants";

// Índice de propuestas. Es una herramienta de revisión, no una página del
// sitio: se renderiza en cada visita (`force-dynamic`) para que las miniaturas
// aparezcan en cuanto el script de capturas las escribe, sin reconstruir nada.
export const dynamic = "force-dynamic";

function rutaExiste(slug: string) {
  return existsSync(path.join(process.cwd(), "src/app/heroes", slug, "page.tsx"));
}

function miniatura(slug: string, modo: "desk" | "mobile") {
  const rel = `/heroes-preview/${slug}-${modo}.png`;
  return existsSync(path.join(process.cwd(), "public", rel)) ? rel : null;
}

function Ficha({ v, n }: { v: HeroVariant; n: number }) {
  const lista = rutaExiste(v.slug);
  const desk = miniatura(v.slug, "desk");
  const mobile = miniatura(v.slug, "mobile");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-panel border border-line bg-white shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-panel">
      <Link
        href={lista ? `/heroes/${v.slug}` : "/heroes"}
        aria-disabled={!lista}
        className={`relative block aspect-[16/10] overflow-hidden border-b border-line bg-cream-2 ${
          lista ? "" : "pointer-events-none"
        }`}
        style={{ backgroundColor: `${v.acento}14` }}
      >
        {desk ? (
          // <img> a propósito: son capturas locales que se reescriben sobre la
          // marcha; el optimizador de next/image las cachearía.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={desk}
            alt={`Captura de escritorio — ${v.nombre}`}
            className="size-full object-cover object-top"
          />
        ) : (
          <span className="grid size-full place-items-center font-mono text-mini font-bold uppercase tracking-[.14em] text-muted-2">
            {lista ? "sin captura todavía" : "en construcción"}
          </span>
        )}

        {mobile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mobile}
            alt={`Captura móvil — ${v.nombre}`}
            className="absolute bottom-3 right-3 w-[13%] min-w-[54px] rounded-[6px] border-2 border-white object-cover shadow-panel"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-[clamp(16px,2vw,22px)]">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full font-mono text-micro font-bold text-white"
            style={{ backgroundColor: v.acento }}
          >
            {n}
          </span>
          <h3 className="m-0 font-display text-feature font-bold leading-tight text-ink">
            {v.nombre}
          </h3>
        </div>
        <p className="m-0 flex-1 text-body leading-[1.5] text-muted">{v.concepto}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <Link
            href={lista ? `/heroes/${v.slug}` : "/heroes"}
            aria-disabled={!lista}
            className={`crd-button crd-sticker inline-flex h-10 cursor-pointer items-center rounded-full bg-mango px-[18px] text-sm font-bold text-white no-underline ${
              lista ? "" : "pointer-events-none opacity-40"
            }`}
          >
            Ver propuesta
          </Link>
          <code className="font-mono text-mini text-muted-2">/heroes/{v.slug}</code>
        </div>
      </div>
    </article>
  );
}

export default function HeroesIndex() {
  return (
    <main className="min-h-dvh bg-cream px-[clamp(18px,5vw,64px)] py-[clamp(36px,7vh,80px)]">
      <header className="mx-auto max-w-[1180px]">
        <p className="m-0 font-mono text-micro font-bold uppercase tracking-[.18em] text-muted">
          ConoceRD · taller de diseño
        </p>
        <h1 className="m-0 mt-2 max-w-[20ch] font-display text-[clamp(30px,5vw,52px)] font-bold leading-[1.05] text-ink">
          Propuestas de primera <em className="crd-accent">pantalla</em>
        </h1>
        <p className="m-0 mt-3.5 max-w-[64ch] text-lead leading-[1.55] text-muted">
          Cada propuesta es una home completa y autónoma. Entra, míralas en el teléfono y en el
          monitor, y salta entre las de una misma tanda con las flechas ← → del teclado (Esc vuelve
          aquí).
        </p>
      </header>

      {GRUPOS.map((g) => (
        <section key={g.id} className="mx-auto mt-[clamp(32px,6vh,64px)] max-w-[1180px]">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line pb-3">
            <h2 className="m-0 font-display text-feature font-bold text-ink">{g.titulo}</h2>
            <p className="m-0 max-w-[58ch] text-copy leading-[1.5] text-muted">{g.nota}</p>
          </div>

          <ul className="mt-[clamp(18px,3vh,28px)] grid list-none grid-cols-1 gap-[clamp(16px,2.4vw,26px)] p-0 md:grid-cols-2">
            {variantesDe(g.id).map((v, i) => (
              <li key={v.slug} className="contents">
                <Ficha v={v} n={i + 1} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="mx-auto mt-[clamp(30px,6vh,60px)] max-w-[1180px] border-t border-line pt-5">
        <Link href="/" className="text-copy font-semibold text-muted no-underline hover:text-ink">
          ← Volver a la home actual
        </Link>
      </footer>
    </main>
  );
}
