import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createBookingSchema } from '@atarashi/domain';
import { calculateHaversineDistanceKm, estimateDurationMins } from '../lib/geo.js';
import { calculateFarePaise } from '../lib/pricing.js';
import { defaultStore } from '../store/memory-store.js';

interface BookingParams {
  id: string;
}

export async function bookingRoutes(app: FastifyInstance) {
  const store = app.store ?? defaultStore;

  // POST /v1/bookings
  app.post(
    '/v1/bookings',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = createBookingSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid booking request',
          details: parseResult.error.issues,
        });
      }

      const bookingData = parseResult.data;
      const distance_km = calculateHaversineDistanceKm(
        bookingData.pickup.coordinates,
        bookingData.dropoff.coordinates
      );
      const duration_mins = estimateDurationMins(distance_km);
      const fare_paise = calculateFarePaise(bookingData.vehicle_type, distance_km);

      const booking = store.createBooking(
        bookingData,
        distance_km,
        duration_mins,
        fare_paise
      );

      return reply.status(201).send(booking);
    }
  );

  // GET /v1/bookings/:id
  app.get<{ Params: BookingParams }>(
    '/v1/bookings/:id',
    async (request, reply) => {
      const { id } = request.params;
      const booking = store.getBooking(id);

      if (!booking) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      return reply.status(200).send(booking);
    }
  );
}
