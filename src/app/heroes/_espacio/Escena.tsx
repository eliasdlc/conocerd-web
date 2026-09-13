import GloboHero from "../_components/GloboHero";
import CapaHero from "./CapaHero";
import Cielo from "@/sections/espacio/Cielo";
import Espacio from "./Espacio";
import Marcadores from "./Marcadores";
import s from "@/sections/espacio/espacio.module.css";

/**
 * La escena común de todas las propuestas: el planeta visto desde el espacio,
 * de noche, con las luces de ciudad, nubes y atmósfera de verdad; al bajar
 * amanece y la cámara desciende hasta el primer destino con la matemática
 * real del recorrido (GloboHero).
 *
 * Encuadre `{ padLeft: 0, padBottom: 0 }`: el globo se centra en el viewport y
 * la escena lo hunde después con un transform propio (espacio.module.css)
 * para que sólo asome su casquete. El canvas conserva el viewport completo,
 * así que la cámara es la del journey; el desplazamiento se anula a mitad de
 * pista y el aterrizaje queda idéntico al de producción.
 *
 * `children` es la composición de la propuesta: lo que vive en el cielo.
 * `arcoBajo` baja el horizonte un poco, para las composiciones con el logo
 * grande centrado, que necesitan más cielo. `cueBajo` cuelga el cue sobre la
 * corteza en vez de en la cima del arco, cuando ahí vive un texto.
 */
export default function Escena({
  children,
  arcoBajo = false,
  cueBajo = false,
}: {
  children: React.ReactNode;
  arcoBajo?: boolean;
  cueBajo?: boolean;
}) {
  return (
    <main>
      <GloboHero
        encuadre={{ padLeft: 0, padBottom: 0 }}
        alturaVh={300}
        giroMs={Infinity}
        className={`${s.escena} ${arcoBajo ? s.arcoBajo : ""} ${cueBajo ? s.cueBajo : ""}`}
        fondo={<Cielo />}
        capasDelMapa={
          <>
            <Espacio />
            <Marcadores />
          </>
        }
      >
        <CapaHero>{children}</CapaHero>
      </GloboHero>
    </main>
  );
}
