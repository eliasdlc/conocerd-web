import Image from "next/image";
import Button from "@/components/Button";
import { MitadInferior, MitadSuperior } from "./Anillo";
import CapaViva from "./CapaViva";
import s from "./estilos.module.css";

// Coordenadas del keyframe `hero` (centro del troquel), en grados sexagesimales.
const COORDENADAS = "18°44′08″N 70°09′46″O";

/** Estrella de cuatro puntas: el remate de imprenta de las esquinas. */
function Estrella({ clase }: { clase: string }) {
  return (
    <span aria-hidden="true" className={`${s.estrella} ${clase}`}>
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <path
          d="M12 0c0 6.6 5.4 12 12 12-6.6 0-12 5.4-12 12 0-6.6-5.4-12-12-12C6.6 12 12 6.6 12 0Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export default function Composicion() {
  return (
    <>
      {/* Papel troquelado: tapa el mapa entero salvo el agujero del medallón. */}
      <div aria-hidden="true" className={s.papel}>
        <Estrella clase={s.eNO} />
        <Estrella clase={s.eNE} />
        <Estrella clase={s.eSO} />
        <Estrella clase={s.eSE} />
      </div>

      {/* Sombra del troquel dentro del agujero: le devuelve el volumen al globo. */}
      <div aria-hidden="true" className={s.lente} />

      {/* El anillo grabado, en dos mitades. */}
      <div aria-hidden="true" className={s.medallon}>
        <div className={s.troquel}>
          <div className={s.sombra} />
          <MitadSuperior />
          <MitadInferior />
        </div>
      </div>

      <div className={s.marco}>
        <CapaViva zona="sup">
          <div className={s.marca}>
            {/* El wordmark es tinta plana: sobre el papel crema funciona como
                grabado y no compite con el color del anillo. */}
            <Image
              src="/assets/wordmark.svg"
              alt="ConoceRD"
              width={668}
              height={211}
              priority
              unoptimized
              className={s.wordmark}
            />
            <p className={s.lema}>
              <i aria-hidden="true" />
              <span>Descubre lo nuestro</span>
              <i aria-hidden="true" />
            </p>
          </div>
        </CapaViva>

        {/* Hueco reservado al medallón: nada de la composición lo pisa. */}
        <div aria-hidden="true" className={s.hueco} />

        <CapaViva zona="inf">
          {/* En desktop este bloque sube por encima del troquel (CSS); en el DOM
              va aquí para que el orden de lectura siga siendo marca → titular →
              acciones en los dos tamaños. */}
          <div className={s.titular}>
            <h1>
              Vive la isla <em className="crd-accent">como la vivimos</em>
            </h1>
            <p>
              Playas sin gente, montañas frías y negocios de barrio con nombre propio.
              ConoceRD te arma la ruta y te dice qué vale la pena de verdad.
            </p>
          </div>

          <div className={s.acciones}>
            <div className={s.botones}>
              {/* Maqueta: son botones de verdad (foco, teclado, estados) pero
                  todavía no llevan a ningún sitio. */}
              <Button
                variant="primary"
                size="lg"
                icon="download"
                className="max-desk:h-12 max-desk:gap-1.5 max-desk:px-[15px] max-desk:text-[13px]"
                iconClassName="max-desk:text-lg"
              >
                Descargar la app
              </Button>
              <Button
                variant="outline"
                size="lg"
                icon="storefront"
                className="max-desk:h-12 max-desk:gap-1.5 max-desk:px-[15px] max-desk:text-[13px]"
                iconClassName="max-desk:text-lg"
              >
                Soy un negocio
              </Button>
            </div>

            {/* El enlace apunta al final de la pista de scroll: pulsarlo hace el
                descenso completo, igual que bajar con la rueda. */}
            <a className={s.cue} href="#aterrizaje">
              <span>Baja y entra por el sello</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <polyline
                  points="5,8 12,16 19,8"
                  fill="none"
                  stroke="#F76C4D"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="sr-only">
                Bajar sobre el globo hasta el primer destino
              </span>
            </a>

            <p className={s.pie}>
              <span>Edición 01 · Agosto 2026</span>
              <i aria-hidden="true" />
              <span>República Dominicana</span>
              <i aria-hidden="true" className={s.sepCoord} />
              <b>{COORDENADAS}</b>
            </p>
          </div>
        </CapaViva>
      </div>
    </>
  );
}
