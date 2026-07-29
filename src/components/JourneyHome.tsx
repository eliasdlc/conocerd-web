import Nav from "@/components/Nav";
import MapScrollJourney from "@/components/MapScrollJourney";
import Footer from "@/components/Footer";

export default function JourneyHome() {
  return (
    <>
      <a className="crd-skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <Nav />
      <main id="main-content">
        <MapScrollJourney />
      </main>
      <Footer />
    </>
  );
}
