// Origen canónico del sitio. En preview de Vercel apunta al deployment para que
// la preview del enlace (OG) y el sitemap se resuelvan contra el host real; en
// producción y en local siempre al dominio de marca.
//
// Con `www.`: el ápex responde 308 hacia él, así que era el dominio real todo
// este tiempo. La diferencia importa fuera del navegador — el proxy de imágenes
// de un cliente de correo, un scraper de OG o un bot de sitemap no tienen por
// qué seguir un redirect, y cada uno que no lo sigue es una imagen que no se
// pinta. Si algún día el ápex deja de redirigir, esto cambia con él.
export const SITE_URL =
  process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://www.conocerd.app";
