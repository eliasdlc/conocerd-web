import Image from "next/image";
import Button from "@/components/Button";
import CueDescenso from "../_espacio/CueDescenso";
import e from "../_espacio/espacio.module.css";
import s from "./estilos.module.css";

/**
 * Composición del hero. Componente de servidor: logo, línea y CTA están en
 * el HTML inicial. El h1 es la marca (el logo es una imagen): lo que se ve es
 * el logo, lo que se lee es el nombre y el lema.
 */
export default function Contenido() {
  return (
    <>
      <div className={s.columna}>
        <h1 className="m-0">
          <span className="sr-only">ConoceRD, descubre lo nuestro</span>
          <Image
            src="/assets/logo-noche.svg"
            alt=""
            width={1296}
            height={595}
            priority
            unoptimized
            className={`${e.entra} ${s.logo}`}
            style={{ animationDelay: "120ms" }}
          />
        </h1>

        <p className={`${e.entra} ${s.linea} font-medium text-white/85`} style={{ animationDelay: "380ms" }}>
          La guía de República Dominicana hecha por gente de aquí.
        </p>

        <div className={`${e.entra} ${s.acciones}`} style={{ animationDelay: "520ms" }}>
          <Button variant="primary" size="lg" icon="download">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      <CueDescenso />

      <p className={`${e.credito} m-0 font-label text-micro font-semibold`}>
        Imágenes de la Tierra: NASA GIBS
      </p>
    </>
  );
}
