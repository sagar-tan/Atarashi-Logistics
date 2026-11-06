import { z } from 'zod';

export const vehicleTypeSchema = z.enum(['bike', 'auto', 'car', 'pickup']);
export const bookingStatusSchema = z.enum(['pending', 'assigned', 'picked_up', 'in_transit', 'completed', 'cancelled', 'timed_out']);
export const parcelSizeSchema = z.enum(['small', 'medium', 'large']);
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('atarashi-api'),
});

export const createBookingSchema = z.object({
  pickup: z.object({
    coordinates: coordinatesSchema,
    address: z.string().min(1),
  }),
  dropoff: z.object({
    coordinates: coordinatesSchema,
    address: z.string().min(1),
  }),
  vehicle_type: vehicleTypeSchema,
  parcel_size: parcelSizeSchema,
  sender_name: z.string().min(1),
  sender_phone: z.string().min(1),
  recipient_name: z.string().min(1),
  recipient_phone: z.string().min(1),
  payment_method: z.enum(['cash', 'online', 'wallet']),
});

export const pricingQuoteRequestSchema = z.object({
  pickup: coordinatesSchema,
  dropoff: coordinatesSchema,
  vehicle_type: vehicleTypeSchema,
});

export const pricingQuoteResponseSchema = z.object({
  distance_km: z.number().nonnegative(),
  duration_mins: z.number().nonnegative(),
  fare_paise: z.number().int().nonnegative(),
  vehicle_type: vehicleTypeSchema,
});

export const driverStatusSchema = z.object({
  is_online: z.boolean(),
  location: coordinatesSchema,
  heading: z.number().min(0).max(360).optional(),
});

export const transitionBookingSchema = z.object({
  status: z.enum(['picked_up', 'in_transit', 'completed', 'cancelled']),
  code: z.string().optional(),
});
