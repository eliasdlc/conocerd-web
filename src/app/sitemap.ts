import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Cuatro rutas públicas; el panel de administración y la API quedan fuera (ver
// robots.ts). /lista va con prioridad alta porque es el destino del QR y de los
// enlaces que se reenvían.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/lista`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/privacidad`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
