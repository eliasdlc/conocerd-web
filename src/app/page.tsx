import { preload } from "react-dom";
import JourneyHome from "@/components/JourneyHome";
import { MUNDO_NOCHE } from "@/lib/mundo";

export default function Home() {
  // La Tierra de noche, pedida desde el HTML.
  //
  // Es lo primero que se ve del globo y, sin esto, no puede empezar a bajar
  // hasta que el navegador haya traído y evaluado el chunk de MapLibre y el
  // mapa haya montado sus capas: más de un segundo de planeta sin imagen. Con
  // la precarga viaja en paralelo con el JS.
  //
  // Sólo la noche. El día pesa cuatro veces más, no se ve hasta que empieza el
  // descenso y se monta entonces (`sections/espacio/capasNasa`).
  preload(MUNDO_NOCHE, { as: "image", fetchPriority: "high" });

  return <JourneyHome />;
}
