import Image from "next/image";
import Button from "@/components/Button";
import CueDescenso from "./CueDescenso";
import Titular from "./Titular";
import s from "./estilos.module.css";

/**
 * Composición del hero. Componente de servidor: logo, titular, copy y CTA
 * están en el HTML inicial y no cuelgan del mapa (que se carga sin SSR).
 *
 * El cielo lleva sólo el logo, una línea y las acciones, centrados: el
 * titular no está aquí, está posado en el limbo (Titular.tsx).
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

        <p className={`${s.entra} ${s.copy} font-medium text-ink [text-wrap:balance]`} style={{ animationDelay: "160ms" }}>
          Baja y mira el país como lo ve la gente que lo vive.
        </p>

        <div className={`${s.entra} ${s.acciones}`} style={{ animationDelay: "260ms" }}>
          <Button variant="primary" size="lg" icon="download">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      <Titular />
      <CueDescenso />
    </>
  );
}
