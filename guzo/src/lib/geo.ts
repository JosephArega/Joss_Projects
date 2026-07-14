import { LatLng } from '../types';

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEG_LAT = 110.574;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Distance (km) from point p to the segment a→b, using a local flat
 * projection — accurate to a few metres at city scale.
 */
export function distToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const kmPerDegLng = 111.32 * Math.cos((a.latitude * Math.PI) / 180);
  const toXY = (q: LatLng) => ({
    x: (q.longitude - a.longitude) * kmPerDegLng,
    y: (q.latitude - a.latitude) * KM_PER_DEG_LAT,
  });
  const P = toXY(p);
  const B = toXY(b);
  const len2 = B.x * B.x + B.y * B.y;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (P.x * B.x + P.y * B.y) / len2));
  const dx = P.x - t * B.x;
  const dy = P.y - t * B.y;
  return Math.sqrt(dx * dx + dy * dy);
}
