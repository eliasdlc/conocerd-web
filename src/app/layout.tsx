import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, Caveat, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// Tipografía de marca (audit §3). Inter + Plus Jakarta ExtraBold con tracking
// negativo era la fórmula del titular SaaS genérico y no decía nada del Caribe
// ni conectaba con el logo, que es rotulación a mano. Fraunces sí: es el serif
// de las guías de viaje, y su itálica hace de acento donde antes había un
// <strong> coral.
//
// Presupuesto (audit 5.6c): entran cuando salen las otras dos, nunca conviven.
// Medido sobre el subset latin en woff2 — Fraunces 700 romana (17.8 KB) +
// itálica (22.5 KB) + Instrument variable 400..700 (29.4 KB) = 69.7 KB, contra
// los 73.8 KB de Inter + Plus Jakarta. El neto baja.
//
// Fraunces sólo en un peso: 700 cubre todos los titulares y ahorra los 17.7 KB
// del 600, que a estos tamaños casi no se distingue.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "700",
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
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
      className={`${fraunces.variable} ${instrumentSans.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
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
