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

// El reloj de las animaciones de entrada.
//
// Una animación CSS arranca cuando el navegador resuelve el estilo del
// elemento, no cuando lo pinta. En esta máquina esos dos momentos son el
// mismo; en un teléfono real no: medido con la CPU a un cuarto y red 3G sobre
// el build de producción, los estilos salen a los 1,28 s y el primer pintado a
// los 2,70 s. La entrada del hero (planeta, cielo, logo, frase, botones) dura
// 1,8 s como mucho, así que terminaba entera dentro de ese hueco y el primer
// pixel que veía el visitante ya era el estado final: el hero aparecía montado
// de golpe, sin una sola animación.
//
// Esto la congela en el frame cero hasta que hay un frame pintado de verdad.
// `requestAnimationFrame` es exactamente esa señal: mientras el render está
// bloqueado el navegador no produce frames y no lo llama.
//
// Va en línea y de primero en el <body> para correr antes de que exista el
// hero. Si el visitante tiene JavaScript apagado, el atributo nunca se pone y
// todo anima como antes: nadie se queda con un hero en blanco. El temporizador
// de 4 s es la red por si el navegador no entrega frames (una pestaña abierta
// en segundo plano) y luego nunca los reclama.
const RELOJ_DE_ENTRADA = `
document.documentElement.dataset.entrada = "lista";
var arranca = function () { document.documentElement.dataset.entrada = "corre"; };
requestAnimationFrame(function () { requestAnimationFrame(arranca); });
setTimeout(arranca, 4000);
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${bricolage.variable} ${plusJakarta.variable} ${inter.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: RELOJ_DE_ENTRADA }} />
        {children}
        {/* Vistas de página y los cuatro eventos del embudo (src/lib/analytics).
            En local no envía nada: el script sólo se carga en Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
