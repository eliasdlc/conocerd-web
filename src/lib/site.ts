// Origen canónico del sitio. En preview de Vercel apunta al deployment para que
// la preview del enlace (OG) y el sitemap se resuelvan contra el host real; en
// producción y en local siempre al dominio de marca.
export const SITE_URL =
  process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://conocerd.app";
