import Image from "next/image";
import Button from "@/components/Button";
import PhoneMockup from "@/sections/PhoneMockup";
import CueAterrizar from "./CueAterrizar";
import s from "./estilos.module.css";

// Composición del hero. Es un componente de servidor: el titular, el copy y
// los CTA están en el HTML inicial y no cuelgan del mapa, que se carga sin SSR.
export default function Composicion() {
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
          className={`${s.logo} ${s.entra}`}
        />

        <h1
          className={`${s.titulo} ${s.entra}`}
          style={{ animationDelay: "80ms", fontVariationSettings: '"opsz" 96' }}
        >
          La isla entera, <em className="crd-accent whitespace-nowrap">en tu mano</em>
        </h1>

        <p className={`${s.copy} ${s.entra}`} style={{ animationDelay: "160ms" }}>
          Destinos, rutas y negocios locales en una sola app, hecha por gente de aquí.
        </p>

        <div className={`${s.acciones} ${s.entra}`} style={{ animationDelay: "240ms" }}>
          <Button variant="primary" size="lg" icon="download" className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm">
            Descargar la app
          </Button>
          <Button variant="ghost" size="lg" icon="storefront" className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm">
            Soy un negocio
          </Button>
        </div>

        <CueAterrizar />
      </div>

      {/* El teléfono, apoyado sobre el borde del globo. La pantalla es una
          captura real de Explorar; el mockup trae su propio marco y reflejo. */}
      <div className={`${s.telefono} ${s.entraTelefono}`} aria-hidden="true">
        <PhoneMockup
          chrome={false}
          screen={
            <Image
              src="/assets/app-explorar.webp"
              alt=""
              fill
              sizes="(max-width: 899px) 40vw, 280px"
              priority
              className="object-cover object-top"
            />
          }
        />
      </div>
    </>
  );
}
