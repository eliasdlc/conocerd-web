// ─────────────────────────────────────────────────────────────────────────────
//  Utilidades geográficas. Coordenadas siempre [lng, lat].
//  Usadas por el chevron de Destinos (#6), el resumen del constructor de ruta
//  (#9, haversine) y los arcos de Negocios (#11).
// ─────────────────────────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
const R_KM = 6371;

export type LngLat = [number, number];

/** Distancia haversine en km entre dos puntos [lng,lat]. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo (0=N, 90=E) del punto a al b. Para rotar el chevron/self-pin. */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Longitud total de una polilínea en km. */
export function pathLengthKm(coords: LngLat[]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineKm(coords[i], coords[i + 1]);
  }
  return total;
}

/**
 * Suaviza una lista de waypoints en una curva (spline Catmull-Rom densificada).
 * Convierte los tramos rectos entre paradas en una ruta curva y orgánica —
 * quita el look de "líneas rectas raras" del recorrido. Con <3 puntos no hay
 * curva posible ⇒ devuelve tal cual.
 */
export function smoothPath(pts: LngLat[], segments = 18): LngLat[] {
  if (pts.length < 3) return pts;
  const out: LngLat[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Punto a la fracción t∈[0,1] de la longitud total de la polilínea, más el
 * rumbo del segmento en ese punto. Interpolación planar (suficiente a esta
 * escala). Para animar un marcador a lo largo de la ruta (#6).
 */
export function pointAlongPath(
  coords: LngLat[],
  t: number
): { point: LngLat; bearing: number } {
  if (coords.length === 0) return { point: [0, 0], bearing: 0 };
  if (coords.length === 1) return { point: coords[0], bearing: 0 };

  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const total = pathLengthKm(coords);
  const target = total * clamped;

  let acc = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const segLen = haversineKm(coords[i], coords[i + 1]);
    if (acc + segLen >= target || i === coords.length - 2) {
      const local = segLen === 0 ? 0 : (target - acc) / segLen;
      const point: LngLat = [
        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * local,
        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * local,
      ];
      return { point, bearing: bearingDeg(coords[i], coords[i + 1]) };
    }
    acc += segLen;
  }
  return { point: coords[coords.length - 1], bearing: 0 };
}
