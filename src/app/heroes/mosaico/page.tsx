import type { Metadata } from "next";
import Mosaico from "./Mosaico";

export const metadata: Metadata = {
  title: "Mosaico vivo — propuesta de primera pantalla",
};

export default function MosaicoPage() {
  return <Mosaico />;
}
