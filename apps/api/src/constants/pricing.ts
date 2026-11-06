import type { VehicleType } from '@atarashi/domain';

export interface VehicleRate {
  baseFarePaise: number;
  perKmFarePaise: number;
}

/**
 * Currency invariant: All fares and rates are strictly in integer PAISE (100 paise = ₹1.00).
 * Rates:
 *  - bike: base 3500 paise (₹35), per km 1200 paise (₹12/km)
 *  - auto: base 5000 paise (₹50), per km 1800 paise (₹18/km)
 *  - car: base 8000 paise (₹80), per km 2500 paise (₹25/km)
 *  - pickup: base 15000 paise (₹150), per km 3500 paise (₹35/km)
 */
export const VEHICLE_RATES: Record<VehicleType, VehicleRate> = {
  bike: {
    baseFarePaise: 3500,
    perKmFarePaise: 1200,
  },
  auto: {
    baseFarePaise: 5000,
    perKmFarePaise: 1800,
  },
  car: {
    baseFarePaise: 8000,
    perKmFarePaise: 2500,
  },
  pickup: {
    baseFarePaise: 15000,
    perKmFarePaise: 3500,
  },
};
