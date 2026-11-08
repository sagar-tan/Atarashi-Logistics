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

export const accountTypeSchema = z.enum(['personal', 'business']);

export const userOnboardingSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  account_type: accountTypeSchema.default('personal'),
  company_name: z.string().optional(),
  gstin: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  default_address: z.string().min(3, 'Address is required'),
  default_pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit Indian pincode').optional().or(z.literal('')),
  preferred_vehicle: vehicleTypeSchema.default('bike'),
});

export const onboardingStatusResponseSchema = z.object({
  user_id: z.string(),
  is_new_user: z.boolean(),
  onboarding_completed: z.boolean(),
  step_count: z.number().int(),
  steps_required: z.array(z.string()),
  profile: z.object({
    id: z.string(),
    full_name: z.string().nullable(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    account_type: accountTypeSchema,
    company_name: z.string().nullable().optional(),
    gstin: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    default_address: z.string().nullable().optional(),
    default_pincode: z.string().nullable().optional(),
    preferred_vehicle: vehicleTypeSchema.optional(),
  }),
});

