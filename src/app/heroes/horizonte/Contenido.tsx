import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { CATEGORY_META, DESTINATIONS } from "@/data/destinations";
import CueDescenso from "./CueDescenso";
import s from "./estilos.module.css";

// Destinos posados sobre la órbita, de oeste a este igual que en el mapa: el
// hilo de etiquetas se lee como la línea de costa vista desde arriba.
const EN_EL_LIMBO: { id: string; ang: number }[] = [
  { id: "aguilas", ang: -76 },
  { id: "constanza", ang: -40 },
  { id: "zona-colonial", ang: 40 },
  { id: "haitises", ang: 76 },
];

function Destino({ id, ang }: { id: string; ang: number }) {
  const destino = DESTINATIONS.find((d) => d.id === id);
  if (!destino) return null;
  const meta = CATEGORY_META[destino.category];

  return (
    <span className={s.marca} style={{ "--ang": `${ang}deg` } as React.CSSProperties}>
      <span className={s.chip}>
        <span aria-hidden="true" className={s.punto} style={{ background: meta.color }} />
        {destino.name}
        <span className={`font-mono text-micro font-normal uppercase tracking-[.12em] text-muted`}>
          {destino.province}
        </span>
      </span>
    </span>
  );
}

/**
 * Composición del hero. Es un componente de servidor: el titular, el copy y los
 * CTA están en el HTML inicial, no cuelgan del mapa (que se carga sin SSR).
 */
export default function Contenido() {
  return (
    <>
      {/* ── Cabecera: marca a la izquierda, coordenadas del keyframe a la
          derecha. Es el único bloque asimétrico, y es lo que evita que la
          pantalla se lea como un póster centrado. ── */}
      <div className={`${s.cabecera} absolute inset-x-0 top-0 flex items-start justify-between px-[22px] pt-6 desk:px-[clamp(28px,4vw,64px)] desk:pt-8`}>
        {/* El wordmark es la marca: SVG plano, sin pasar por el optimizador. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/wordmark.svg"
          alt="ConoceRD"
          width={668}
          height={211}
          className={`${s.entra} block h-auto w-[122px] desk:w-[152px]`}
        />
        <p
          className={`${s.entra} m-0 hidden text-right font-mono text-micro font-bold uppercase leading-[1.7] tracking-[.14em] text-muted desk:block`}
          style={{ animationDelay: "120ms" }}
        >
          18.7357° N · 70.1627° O
          <br />
          <span className="text-mango-ink">República Dominicana</span>
        </p>
      </div>

      {/* ── Cielo: kicker, titular, promesa y acciones. Todo termina justo por
          encima de la cima del arco, así que los botones quedan apoyados sobre
          la curvatura del planeta. ── */}
      <div className={`${s.columna} absolute inset-x-0 top-0 flex flex-col items-center px-[22px] pt-[124px] text-center desk:pt-[clamp(78px,9vh,108px)]`}>
        <span
          className={`${s.entra} inline-flex items-center gap-[7px] font-mono text-micro font-bold uppercase tracking-[.14em] text-mango-ink`}
          style={{ animationDelay: "80ms" }}
        >
          <Icon name="explore" className="text-sm" />
          En órbita sobre el Caribe
        </span>

        <h1
          className={`${s.entra} ${s.titular} m-0 mt-3 max-w-[15ch] font-display text-[clamp(34px,8.8vw,62px)] font-bold leading-[1.04] tracking-[-.02em] text-ink-2 [text-wrap:balance] desk:mt-4`}
          style={{ animationDelay: "160ms" }}
        >
          Lo nuestro se ve mejor <em className="crd-accent">de cerca</em>
        </h1>

        <p
          className={`${s.entra} m-0 mt-3.5 max-w-[46ch] text-[clamp(15px,1.5vw,18px)] font-medium leading-[1.5] text-ink desk:mt-4`}
          style={{ animationDelay: "260ms" }}
        >
          Te bajamos del mapa al barrio: playas, montañas y negocios con nombre y dueño,
          contados por gente de aquí.
        </p>

        <div
          className={`${s.entra} mt-6 flex flex-col items-center gap-3 desk:mt-7 desk:flex-row desk:gap-3.5`}
          style={{ animationDelay: "360ms" }}
        >
          <Button variant="primary" size="lg" icon="download">
            Descargar la app
          </Button>
          <Button variant="outline" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      {/* ── El limbo: órbita punteada con los destinos posados encima. Sube con
          el planeta y se apaga en cuanto empieza la caída. ── */}
      <div className={s.limbo}>
        <div className={s.anillo} aria-hidden="true" />
        {EN_EL_LIMBO.map((d) => (
          <Destino key={d.id} {...d} />
        ))}
      </div>

      <CueDescenso />
    </>
  );
}
