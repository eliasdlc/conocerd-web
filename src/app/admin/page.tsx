// ─────────────────────────────────────────────────────────────────────────────
//  /admin — panel interno de la lista de espera.
//
//  Una sola ruta con dos estados: sin sesión muestra el login, con sesión el
//  panel. Los datos se leen en el servidor y bajan ya resueltos, así que la
//  contraseña ni la conexión a Neon tocan el cliente.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";

import { hasAdminSession, isAdminConfigured } from "@/lib/admin/auth";
import { computeStats } from "@/lib/waitlist/stats";
import { getWaitlistStore } from "@/lib/waitlist/store";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";

export const metadata: Metadata = {
  title: "Panel",
  // Un panel con correos de gente real no puede acabar en un buscador.
  robots: { index: false, follow: false, nocache: true },
};

// Lee cookies y base de datos: nunca se prerenderiza ni se cachea.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await hasAdminSession())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  const store = getWaitlistStore();
  const rows = await store.list();

  return <AdminDashboard rows={rows} stats={computeStats(rows)} storeKind={store.kind} />;
}
