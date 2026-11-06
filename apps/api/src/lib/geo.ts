import type { Coordinates } from '@atarashi/domain';

/**
 * Calculates great-circle distance between two points using the Haversine formula in kilometers.
 * Accurate for all geographic coordinate pairs.
 */
export function calculateHaversineDistanceKm(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const lat1Rad = (from.latitude * Math.PI) / 180;
  const lat2Rad = (to.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
}

/**
 * Estimates duration in minutes based on distance in km.
 * Urban logistics baseline: ~25 km/h avg speed with minimum 5 min dispatch/loading buffer.
 */
export function estimateDurationMins(distanceKm: number): number {
  const travelMins = (distanceKm / 25) * 60;
  return Math.max(5, Math.ceil(travelMins));
}
