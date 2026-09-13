import Image from "next/image";
import Button from "@/components/Button";
import CueDescenso from "./CueDescenso";
import s from "./estilos.module.css";

/**
 * Composición del hero. Componente de servidor: logo, titular, copy y CTA
 * están en el HTML inicial y no cuelgan del mapa (que se carga sin SSR).
 *
 * Es una sola columna, a la izquierda en escritorio y centrada en el
 * teléfono. El logo va dentro de la columna y no en una cabecera aparte: con
 * el texto alineado a la izquierda, la marca es la primera línea del bloque.
 */
export default function Contenido() {
  return (
    <>
      <div className={s.columna}>
        <Image
          src="/assets/logo.svg"
          alt="ConoceRD, descubre lo nuestro"
          width={1296}
          height={595}
          priority
          unoptimized
          className={`${s.entra} ${s.logo}`}
        />

        <h1
          className={`${s.entra} ${s.titular} font-display font-extrabold tracking-[-.03em] text-ink [text-wrap:balance]`}
          style={{ animationDelay: "140ms", fontVariationSettings: '"opsz" 96' }}
        >
          Sale el sol y ya hay <em className="crd-accent">a dónde ir</em>.
        </h1>

        <p className={`${s.entra} ${s.copy} font-medium text-ink`} style={{ animationDelay: "240ms" }}>
          Destinos, rutas y negocios locales para salir hoy, no algún día.
        </p>

        <div className={`${s.entra} ${s.acciones}`} style={{ animationDelay: "340ms" }}>
          <Button variant="primary" size="lg" icon="download">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      <CueDescenso />
    </>
  );
}
