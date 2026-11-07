import crypto from 'node:crypto';
import type {
  BookingStatus,
  CreateBookingInput,
  DriverStatusInput,
} from '@atarashi/domain';

export interface BookingRecord extends CreateBookingInput {
  id: string;
  distance_km: number;
  duration_mins: number;
  fare_paise: number;
  pickup_otp: string;
  delivery_pin: string;
  status: BookingStatus;
  driver_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface DriverStatusRecord extends DriverStatusInput {
  driver_id: string;
  updated_at: string;
}

export interface WalletOrderRecord {
  order_id: string;
  amount_paise: number;
  currency: string;
  status: 'created' | 'paid';
  created_at: string;
}

export interface WalletLedgerEntry {
  id: string;
  user_id: string;
  amount_paise: number;
  entry_type: 'credit' | 'debit' | 'refund' | 'commission' | 'settlement';
  idempotency_key: string;
  created_at: string;
}

export interface TransitionResult {
  success: boolean;
  booking?: BookingRecord;
  error?: string;
  statusCode: number;
}

export class MemoryStore {
  private bookings: Map<string, BookingRecord> = new Map();
  private driverStatuses: Map<string, DriverStatusRecord> = new Map();
  private walletOrders: Map<string, WalletOrderRecord> = new Map();
  private walletLedger: Map<string, WalletLedgerEntry> = new Map();

  /**
   * Generates a 4-digit numeric code (e.g., '4821')
   */
  private generate4DigitCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  public createBooking(
    data: CreateBookingInput,
    distanceKm: number,
    durationMins: number,
    farePaise: number
  ): BookingRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const pickupOtp = this.generate4DigitCode();
    const deliveryPin = this.generate4DigitCode();

    const booking: BookingRecord = {
      ...data,
      id,
      distance_km: distanceKm,
      duration_mins: durationMins,
      fare_paise: farePaise,
      pickup_otp: pickupOtp,
      delivery_pin: deliveryPin,
      status: 'pending',
      driver_id: null,
      created_at: now,
      updated_at: now,
    };

    this.bookings.set(id, booking);
    return booking;
  }

  public getBooking(id: string): BookingRecord | undefined {
    return this.bookings.get(id);
  }

  public listBookings(): BookingRecord[] {
    return Array.from(this.bookings.values());
  }

  public acceptBooking(id: string, driverId: string): TransitionResult {
    const booking = this.bookings.get(id);
    if (!booking) {
      return { success: false, error: 'Booking not found', statusCode: 404 };
    }

    if (booking.status !== 'pending') {
      return {
        success: false,
        error: `Cannot accept booking in '${booking.status}' status. Only 'pending' bookings can be accepted.`,
        statusCode: 400,
      };
    }

    const now = new Date().toISOString();
    booking.status = 'assigned';
    booking.driver_id = driverId;
    booking.updated_at = now;

    this.bookings.set(id, booking);
    return { success: true, booking, statusCode: 200 };
  }

  public transitionBooking(
    id: string,
    targetStatus: 'picked_up' | 'in_transit' | 'completed' | 'cancelled',
    code?: string
  ): TransitionResult {
    const booking = this.bookings.get(id);
    if (!booking) {
      return { success: false, error: 'Booking not found', statusCode: 404 };
    }

    const currentStatus = booking.status;
    const now = new Date().toISOString();

    if (targetStatus === 'cancelled') {
      if (currentStatus === 'completed') {
        return {
          success: false,
          error: 'Cannot cancel a completed booking',
          statusCode: 400,
        };
      }
      if (currentStatus === 'cancelled') {
        return {
          success: false,
          error: 'Booking is already cancelled',
          statusCode: 400,
        };
      }
      booking.status = 'cancelled';
      booking.updated_at = now;
      this.bookings.set(id, booking);
      return { success: true, booking, statusCode: 200 };
    }

    if (targetStatus === 'picked_up') {
      if (currentStatus !== 'assigned') {
        return {
          success: false,
          error: `Invalid transition to 'picked_up' from current status '${currentStatus}'. Must be 'assigned'.`,
          statusCode: 400,
        };
      }
      if (!code || code !== booking.pickup_otp) {
        return {
          success: false,
          error: 'Invalid or missing pickup OTP',
          statusCode: 400,
        };
      }
      booking.status = 'picked_up';
      booking.updated_at = now;
      this.bookings.set(id, booking);
      return { success: true, booking, statusCode: 200 };
    }

    if (targetStatus === 'in_transit') {
      if (currentStatus !== 'picked_up') {
        return {
          success: false,
          error: `Invalid transition to 'in_transit' from current status '${currentStatus}'. Must be 'picked_up'.`,
          statusCode: 400,
        };
      }
      booking.status = 'in_transit';
      booking.updated_at = now;
      this.bookings.set(id, booking);
      return { success: true, booking, statusCode: 200 };
    }

    if (targetStatus === 'completed') {
      if (currentStatus !== 'in_transit') {
        return {
          success: false,
          error: `Invalid transition to 'completed' from current status '${currentStatus}'. Must be 'in_transit'.`,
          statusCode: 400,
        };
      }
      if (!code || code !== booking.delivery_pin) {
        return {
          success: false,
          error: 'Invalid or missing delivery PIN',
          statusCode: 400,
        };
      }
      booking.status = 'completed';
      booking.completed_at = now;
      booking.updated_at = now;
      this.bookings.set(id, booking);
      return { success: true, booking, statusCode: 200 };
    }

    return {
      success: false,
      error: `Unsupported status transition from '${currentStatus}' to '${targetStatus}'.`,
      statusCode: 400,
    };
  }

  public updateDriverStatus(
    driverId: string,
    status: DriverStatusInput
  ): DriverStatusRecord {
    const record: DriverStatusRecord = {
      ...status,
      heading: status.heading ?? 0,
      driver_id: driverId,
      updated_at: new Date().toISOString(),
    };
    this.driverStatuses.set(driverId, record);
    return record;
  }

  public getDriverStatus(driverId: string): DriverStatusRecord | undefined {
    return this.driverStatuses.get(driverId);
  }

  public getDriverEarnings(driverId: string): {
    trips_count: number;
    earnings_paise: number;
    currency: 'INR';
  } {
    const today = new Date().toISOString().slice(0, 10);
    const completedTrips = Array.from(this.bookings.values()).filter(
      (b) =>
        b.status === 'completed' &&
        (b.driver_id === driverId || !driverId || driverId === 'default') &&
        b.completed_at &&
        b.completed_at.slice(0, 10) === today
    );

    const tripsCount = completedTrips.length;
    const earningsPaise = completedTrips.reduce((acc, trip) => acc + trip.fare_paise, 0);

    return {
      trips_count: tripsCount,
      earnings_paise: earningsPaise,
      currency: 'INR',
    };
  }

  public createWalletOrder(
    amountPaise: number,
    currency: string = 'INR'
  ): WalletOrderRecord {
    const orderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const record: WalletOrderRecord = {
      order_id: orderId,
      amount_paise: amountPaise,
      currency,
      status: 'created',
      created_at: new Date().toISOString(),
    };
    this.walletOrders.set(orderId, record);
    return record;
  }

  public getWalletOrder(orderId: string): WalletOrderRecord | undefined {
    return this.walletOrders.get(orderId);
  }

  public topupWallet(
    userId: string,
    amountPaise: number,
    idempotencyKey: string = `topup_${crypto.randomUUID()}`
  ): WalletLedgerEntry {
    const entry: WalletLedgerEntry = {
      id: crypto.randomUUID(),
      user_id: userId,
      amount_paise: amountPaise,
      entry_type: 'credit',
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
    };
    this.walletLedger.set(entry.id, entry);
    return entry;
  }

  public getWalletEntries(userId: string): WalletLedgerEntry[] {
    return Array.from(this.walletLedger.values()).filter((e) => e.user_id === userId);
  }

  public reset(): void {
    this.bookings.clear();
    this.driverStatuses.clear();
    this.walletOrders.clear();
    this.walletLedger.clear();
  }
}

export const defaultStore = new MemoryStore();
