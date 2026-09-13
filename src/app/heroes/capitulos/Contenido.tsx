import Image from "next/image";
import Button from "@/components/Button";
import CueDescenso from "../_espacio/CueDescenso";
import e from "@/sections/espacio/espacio.module.css";
import Capitulos from "./Capitulos";
import s from "./estilos.module.css";

/**
 * Composición del hero. Componente de servidor: en el cielo sólo el logo y
 * las acciones. El mensaje vive en la bajada (Capitulos.tsx); para lectores
 * de pantalla va entero en el h1.
 */
export default function Contenido() {
  return (
    <>
      <div className={s.columna}>
        <h1 className="m-0">
          <span className="sr-only">
            ConoceRD, descubre lo nuestro. Playas, pueblos y negocios locales, recomendados por gente de aquí.
          </span>
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

        <div className={`${e.entra} ${s.acciones}`} style={{ animationDelay: "420ms" }}>
          <Button variant="primary" size="lg" icon="download">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront">
            Soy un negocio
          </Button>
        </div>
      </div>

      <CueDescenso />
      <Capitulos />

      <p className={`${e.credito} m-0 font-label text-micro font-semibold`}>
        Imágenes de la Tierra: NASA GIBS
      </p>
    </>
  );
}
