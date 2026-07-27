// ─────────────────────────────────────────────────────────────────────────────
//  Rate limit por clave (IP) con ventana deslizante, en memoria del proceso.
//
//  Limitación asumida: con Fluid Compute las instancias se reutilizan pero no
//  son únicas, así que el límite es por instancia, no global. Suficiente para
//  frenar un bot básico en un evento; si el volumen crece, moverlo a Upstash
//  Redis (Vercel Marketplace) sin cambiar esta firma.
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = number[]; // timestamps (ms) de los intentos dentro de la ventana

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Barrido barato: sin esto el Map crece con cada IP que pasó una vez.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** IP del cliente detrás del proxy de Vercel. `unknown` agrupa lo no identificable. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
