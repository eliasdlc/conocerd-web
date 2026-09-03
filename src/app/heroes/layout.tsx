import type { Metadata } from "next";
import VariantSwitcher from "./_components/VariantSwitcher";

export const metadata: Metadata = {
  title: "Propuestas de primera pantalla",
  robots: { index: false, follow: false },
};

export default function HeroesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <VariantSwitcher />
    </>
  );
}
