import { forwardReporte } from "@/lib/reportar/proxy";

export async function POST(request: Request) {
  return forwardReporte({
    apiUrl: process.env.CONOCERD_API_URL,
    cuerpo: await request.json().catch(() => ({})),
    desde: request.headers.get("x-forwarded-for"),
  });
}
