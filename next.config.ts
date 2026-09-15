import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El badge "N" del dev overlay se apoya justo sobre el botón "Siguiente
  // escena" del panel de pasos móvil y se come los clicks reales: rompía
  // journey-smoke en dev y estorba al probar en el teléfono. Los errores de
  // compilación/runtime siguen apareciendo igual.
  devIndicators: false,
  // El logo y el sello viajan DENTRO del correo (`lib/email/assets.ts`), así
  // que las rutas que mandan correo los leen del disco en runtime. Hoy Next ya
  // arrastra `public/` al trace de cualquier ruta de servidor, pero eso es un
  // detalle de implementación y no una promesa: declarado, el día que deje de
  // hacerlo los correos no salen sin marca en silencio.
  outputFileTracingIncludes: {
    "/api/itinerario": ["public/assets/email/marca/*.png"],
    "/api/subscribe": ["public/assets/email/marca/*.png"],
  },
  // Las imágenes del cielo del hero están horneadas y son inmutables: su
  // contenido no cambia nunca, y el día que cambien se hornean en otra carpeta
  // de versión (`lib/mundo` · MUNDO_VERSION). Sin esta cabecera Next las sirve
  // con el default de `public/`, que obliga a revalidarlas en cada visita.
  async headers() {
    return [
      {
        source: "/mundo/:ruta*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
