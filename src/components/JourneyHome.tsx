import { SceneProvider } from "@/context/SceneContext";
import { ClimaProvider } from "@/context/ClimaContext";
import Nav from "@/components/Nav";
import MapScrollJourney from "@/components/MapScrollJourney";
import Footer from "@/components/Footer";
import PistasMapa from "@/components/PistasMapa";

export default function JourneyHome() {
  return (
    // El proveedor de escena envuelve al nav y al journey: el enlace activo
    // del nav se marca por capítulo, así que necesita la misma fuente de
    // verdad que el riel y el panel de pasos.
    <SceneProvider>
      <PistasMapa />
      <a className="crd-skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <Nav />
      {/* El clima de ahora se pide una vez, al entrar al primer destino, y lo
          leen las polaroids y Tu ruta. Va dentro del proveedor de escena porque
          es la escena la que decide cuándo pedirlo. */}
      <ClimaProvider>
        <main id="main-content">
          <MapScrollJourney />
        </main>
      </ClimaProvider>
      <Footer />
    </SceneProvider>
  );
}
