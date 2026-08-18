import type { Metadata } from "next";
import PantallaSello from "./PantallaSello";

export const metadata: Metadata = {
  title: "Sello de entrada — propuesta de primera pantalla",
  robots: { index: false, follow: false },
};

export default function SelloPage() {
  return <PantallaSello />;
}
