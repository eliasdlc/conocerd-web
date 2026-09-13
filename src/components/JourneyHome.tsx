import { SceneProvider } from "@/context/SceneContext";
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
      <main id="main-content">
        <MapScrollJourney />
      </main>
      <Footer />
    </SceneProvider>
  );
}
