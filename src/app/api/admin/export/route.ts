// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/admin/export — la lista completa en CSV.
//
//  Route Handler y no Server Function porque el navegador tiene que descargar
//  un archivo, no recibir un re-render. Misma cookie de sesión que /admin: sin
//  ella responde 404, no 401 — no confirmamos que esta ruta exista a quien la
//  encuentre por casualidad.
// ─────────────────────────────────────────────────────────────────────────────

import { requestHasAdminSession } from "@/lib/admin/auth";
import { toCsv } from "@/lib/waitlist/stats";
import { getWaitlistStore } from "@/lib/waitlist/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requestHasAdminSession(request))) {
    return new Response("Not found", { status: 404 });
  }

  const rows = await getWaitlistStore().list();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="conocerd-lista-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
