import type { VehicleType } from '@atarashi/domain';
import { VEHICLE_RATES } from '../constants/pricing.js';

/**
 * Calculates fare in integer PAISE.
 * Formula: baseFarePaise + round(distanceKm * perKmFarePaise)
 */
export function calculateFarePaise(vehicleType: VehicleType, distanceKm: number): number {
  const rate = VEHICLE_RATES[vehicleType];
  if (!rate) {
    throw new Error(`Invalid vehicle type for pricing: ${vehicleType}`);
  }

  const distanceFarePaise = Math.round(distanceKm * rate.perKmFarePaise);
  return rate.baseFarePaise + distanceFarePaise;
}
