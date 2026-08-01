import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Caveat, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-caveat",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-jetbrains",
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
      className={`${plusJakarta.variable} ${inter.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Unregister any stale service workers from other projects on this port */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));` }} />
      </head>
      <body>
        {children}
        {/* Vistas de página y los cuatro eventos del embudo (src/lib/analytics).
            En local no envía nada: el script sólo se carga en Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
