import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// El panel de administración y la API no aportan nada a un índice de búsqueda y
// sí filtran superficie: fuera del crawl (audit 5.5).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
