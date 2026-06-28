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
