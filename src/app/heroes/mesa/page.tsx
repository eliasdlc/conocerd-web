import type { Metadata } from "next";
import Mesa from "./Mesa";

export const metadata: Metadata = {
  title: "Mesa de viaje, propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

export default function MesaPage() {
  return <Mesa />;
}
