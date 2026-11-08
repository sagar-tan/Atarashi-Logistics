import { z } from 'zod';

export declare const vehicleTypeSchema: z.ZodType<'bike' | 'auto' | 'car' | 'pickup'>;
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

export declare const bookingStatusSchema: z.ZodType<'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'completed' | 'cancelled' | 'timed_out'>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export declare const parcelSizeSchema: z.ZodType<'small' | 'medium' | 'large'>;
export type ParcelSize = z.infer<typeof parcelSizeSchema>;

export interface Coordinates {
  latitude: number;
  longitude: number;
}
export declare const coordinatesSchema: z.ZodType<Coordinates>;

export interface HealthResponse {
  status: 'ok';
  service: 'atarashi-api';
}
export declare const healthResponseSchema: z.ZodType<HealthResponse>;

export interface CreateBookingInput {
  pickup: {
    coordinates: Coordinates;
    address: string;
  };
  dropoff: {
    coordinates: Coordinates;
    address: string;
  };
  vehicle_type: VehicleType;
  parcel_size: ParcelSize;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  payment_method: 'cash' | 'online' | 'wallet';
}
export declare const createBookingSchema: z.ZodType<CreateBookingInput>;

export interface PricingQuoteRequest {
  pickup: Coordinates;
  dropoff: Coordinates;
  vehicle_type: VehicleType;
}
export declare const pricingQuoteRequestSchema: z.ZodType<PricingQuoteRequest>;

export interface PricingQuoteResponse {
  distance_km: number;
  duration_mins: number;
  fare_paise: number;
  vehicle_type: VehicleType;
}
export declare const pricingQuoteResponseSchema: z.ZodType<PricingQuoteResponse>;

export interface DriverStatusInput {
  is_online: boolean;
  location: Coordinates;
  heading?: number;
}
export declare const driverStatusSchema: z.ZodType<DriverStatusInput>;

export interface TransitionBookingInput {
  status: 'picked_up' | 'in_transit' | 'completed' | 'cancelled';
  code?: string;
}
export declare const transitionBookingSchema: z.ZodType<TransitionBookingInput>;

export type AccountType = 'personal' | 'business';
export declare const accountTypeSchema: z.ZodType<AccountType>;

export interface UserOnboardingInput {
  full_name: string;
  email?: string;
  phone?: string;
  account_type: AccountType;
  company_name?: string;
  gstin?: string;
  city: string;
  default_address: string;
  default_pincode?: string;
  preferred_vehicle?: VehicleType;
}
export declare const userOnboardingSchema: z.ZodType<UserOnboardingInput>;

export interface OnboardingStatusResponse {
  user_id: string;
  is_new_user: boolean;
  onboarding_completed: boolean;
  step_count: number;
  steps_required: string[];
  profile: {
    id: string;
    full_name: string | null;
    email?: string | null;
    phone?: string | null;
    account_type: AccountType;
    company_name?: string | null;
    gstin?: string | null;
    city?: string | null;
    default_address?: string | null;
    default_pincode?: string | null;
    preferred_vehicle?: VehicleType;
  };
}
export declare const onboardingStatusResponseSchema: z.ZodType<OnboardingStatusResponse>;

