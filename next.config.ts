import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El logo y el sello viajan DENTRO del correo (`lib/email/assets.ts`), así
  // que las rutas que mandan correo los leen del disco en runtime. Hoy Next ya
  // arrastra `public/` al trace de cualquier ruta de servidor, pero eso es un
  // detalle de implementación y no una promesa: declarado, el día que deje de
  // hacerlo los correos no salen sin marca en silencio.
  outputFileTracingIncludes: {
    "/api/itinerario": ["public/assets/email/marca/*.png"],
    "/api/subscribe": ["public/assets/email/marca/*.png"],
  },
};

export default nextConfig;
