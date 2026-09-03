import Image from "next/image";
import Button from "@/components/Button";
import CueBajar from "./CueBajar";
import s from "./estilos.module.css";

// Bloque editorial de la propuesta. Se renderiza DOS veces —una por cara del
// troquel— así que tiene que ser puramente declarativo y producir exactamente
// la misma caja en las dos: cualquier diferencia de altura descuadraría el
// registro del titular contra el corte. `espejo` sólo cambia lo que no puede
// duplicarse (la etiqueta del titular y la prioridad de carga de la imagen),
// nunca el layout.
//
// Es un componente de servidor a propósito: el copy y los CTA existen en el
// HTML inicial, sin esperar al runtime de WebGL ni a la hidratación.

export default function Editorial({ espejo = false }: { espejo?: boolean }) {
  const Titulo: React.ElementType = espejo ? "div" : "h1";

  return (
    <div className={s.columna}>
      {/* La marca. El logotipo a mano es la firma de la casa; en móvil, donde
          el papel es media pantalla, el wordmark dice lo mismo en un tercio
          del alto. */}
      <Image
        src="/assets/wordmark.svg"
        alt={espejo ? "" : "ConoceRD"}
        width={668}
        height={211}
        aria-hidden={espejo || undefined}
        className={`${s.marcaMovil} ${s.entra}`}
      />
      <Image
        src="/assets/logo.png"
        alt={espejo ? "" : "ConoceRD — Descubre Lo Nuestro"}
        width={760}
        height={363}
        priority={!espejo}
        aria-hidden={espejo || undefined}
        sizes="(max-width: 899px) 42vw, min(20vw, 224px)"
        className={`${s.marcaDesk} ${s.entra}`}
      />

      <p className={`${s.coords} ${s.entra}`} style={{ "--vt-d": ".08s" } as React.CSSProperties}>
        República Dominicana · 18.7° N 70.2° O
      </p>

      <Titulo
        className={`${s.titular} ${s.entra}`}
        style={{ "--vt-d": ".14s" } as React.CSSProperties}
      >
        <span className={s.linea}>Asómate</span>{" "}
        <span className={s.linea}>
          a la <em className={s.acento}>isla</em>
        </span>{" "}
        <span className={s.linea}>que no sale</span>{" "}
        <span className={s.linea}>en las guías</span>
      </Titulo>

      <p
        className={`${s.entradilla} ${s.entra}`}
        style={{ "--vt-d": ".22s" } as React.CSSProperties}
      >
        De Bahía de las Águilas al Pico Duarte: te armamos la ruta y te llevamos a los negocios
        de la gente de aquí.
      </p>

      <div
        className={`${s.acciones} ${s.entra}`}
        style={{ "--vt-d": ".3s" } as React.CSSProperties}
      >
        {/* Móvil: los dos botones caben en una fila de 390px por 16px, y esa
            fila vale 58px de alto en una franja de papel que no los tiene.
            Desktop: 22px de padding en vez de 26 para que la fila termine
            antes del filo del troquel (el papel mide 436px de ancho a esa
            altura y la fila, sin recortar, medía 426). */}
        <Button
          variant="primary"
          size="lg"
          icon="download"
          className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm desk:px-[22px]"
        >
          Descargar la app
        </Button>
        <Button
          variant="outline"
          size="lg"
          icon="storefront"
          className="max-desk:h-12 max-desk:px-3.5 max-desk:text-sm desk:px-[22px]"
        >
          Soy un negocio
        </Button>
      </div>

      <CueBajar />
    </div>
  );
}
