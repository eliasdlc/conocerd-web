import Image from "next/image";
import Button from "@/components/Button";
import CueDescenso from "./CueDescenso";
import s from "./estilos.module.css";

/**
 * Composición del hero. Componente de servidor: logo, titular, copy y CTA
 * están en el HTML inicial, no cuelgan del mapa (que se carga sin SSR).
 *
 * Todo el texto va en blanco sobre la tinta, con el acento en mango, igual que
 * la card de descarga del sitio: es la única superficie oscura de la home y
 * habla el mismo idioma que ella.
 */
export default function Contenido() {
  return (
    <>
      <div className={`${s.cabecera} absolute inset-x-0 top-0 flex items-start justify-between px-[22px] pt-6 desk:px-[clamp(28px,4vw,64px)] desk:pt-8`}>
        {/* El logo principal con la tinta en crema: sobre la noche el wordmark
            desaparecía. Vector plano, sin optimizador. */}
        <Image
          src="/assets/logo-noche.svg"
          alt="ConoceRD, descubre lo nuestro"
          width={1296}
          height={595}
          priority
          unoptimized
          className={`${s.entra} block h-auto w-[132px] desk:w-[164px]`}
        />
      </div>

      <div className={`${s.columna} absolute inset-x-0 top-0 flex flex-col items-center px-[22px] pt-[max(118px,15dvh)] text-center desk:pt-[clamp(84px,10vh,116px)]`}>
        <h1
          className={`${s.entra} ${s.titular} m-0 max-w-[16ch] font-display text-[clamp(34px,8.8vw,62px)] font-extrabold leading-[1.04] tracking-[-.03em] text-white [text-wrap:balance]`}
          style={{ animationDelay: "160ms", fontVariationSettings: '"opsz" 96' }}
        >
          Desde arriba, un punto. <em className="crd-accent-on-ink">De cerca, todo.</em>
        </h1>

        <p
          className={`${s.entra} m-0 mt-3.5 max-w-[44ch] text-[clamp(15px,1.5vw,18px)] font-medium leading-[1.5] text-white/78 desk:mt-4`}
          style={{ animationDelay: "260ms" }}
        >
          Playas, montañas y negocios con nombre propio, contados por gente de aquí.
        </p>

        <div
          className={`${s.entra} ${s.acciones} mt-6 flex flex-col items-center gap-3 desk:mt-7 desk:flex-row desk:gap-3.5`}
          style={{ animationDelay: "360ms" }}
        >
          <Button variant="primary" size="lg" icon="download">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      <CueDescenso />

      <p className={`${s.credito} m-0 font-label text-micro font-semibold`}>
        Imágenes de la Tierra: NASA GIBS
      </p>
    </>
  );
}
