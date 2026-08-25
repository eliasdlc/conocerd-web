import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// Tipografía de marca. La web hablaba su propio idioma (Fraunces serif +
// Instrument Sans + JetBrains Mono) mientras la app hablaba el suyo; el
// sistema de diseño las unifica en las tres familias de la app:
//
//   display  Bricolage Grotesque : titulares y cifras de carretera
//   label    Plus Jakarta Sans   : botones, chips, etiquetas y overlines
//   body     Inter               : todo el texto corrido
//
// El mono desaparece del sistema: las cifras que antes lo llevaban (km, horas,
// sellos) van en Bricolage, y los metadatos en Inter. El acento editorial ya no
// es una itálica de otra familia, sino la misma Bricolage en coralInk.
//
// La manuscrita (Caveat) no está aquí: es tinta de contenido con un solo uso, y
// se declara en la sección que la usa para no precargarla en todo el sitio.
//
// Bricolage es variable con eje óptico: el titular del hero pide `opsz 96` (la
// regla de portada) y el resto se queda en el óptico por defecto.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const DESCRIPTION =
  "La app que te lleva a la República Dominicana que no sale en las guías: destinos auténticos, negocios locales y experiencias reales.";

export const metadata: Metadata = {
  // Resuelve las rutas relativas de OG (la imagen la genera
  // opengraph-image.tsx). En preview de Vercel apunta al deployment, así que la
  // preview del enlace ya funciona antes de producción.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ConoceRD — Descubre Lo Nuestro",
    template: "%s — ConoceRD",
  },
  description: DESCRIPTION,
  applicationName: "ConoceRD",
  // La waitlist se difunde por WhatsApp e Instagram: sin esto el enlace sale
  // sin imagen ni marca, que es la primera impresión del sitio (audit 5.5).
  openGraph: {
    type: "website",
    siteName: "ConoceRD",
    locale: "es_DO",
    url: "/",
    title: "ConoceRD — Descubre Lo Nuestro",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "ConoceRD — Descubre Lo Nuestro",
    description: DESCRIPTION,
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${plusJakarta.variable} ${inter.variable}`}
    >
      <body>
        {children}
        {/* Vistas de página y los cuatro eventos del embudo (src/lib/analytics).
            En local no envía nada: el script sólo se carga en Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
