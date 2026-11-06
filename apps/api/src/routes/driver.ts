import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  driverStatusSchema,
  transitionBookingSchema,
} from '@atarashi/domain';
import { defaultStore } from '../store/memory-store.js';

interface BookingParams {
  id: string;
}

interface EarningsQuery {
  driver_id?: string;
}

export async function driverRoutes(app: FastifyInstance) {
  const store = app.store ?? defaultStore;

  // POST /v1/driver/status
  app.post(
    '/v1/driver/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = driverStatusSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid driver status payload',
          details: parseResult.error.issues,
        });
      }

      const driverId =
        (request.headers['x-driver-id'] as string) ||
        ((request.body as Record<string, unknown>)?.driver_id as string) ||
        'default-driver';

      const updated = store.updateDriverStatus(driverId, parseResult.data);
      return reply.status(200).send(updated);
    }
  );

  // POST /v1/driver/bookings/:id/accept
  app.post<{ Params: BookingParams }>(
    '/v1/driver/bookings/:id/accept',
    async (request, reply) => {
      const { id } = request.params;
      const driverId =
        (request.headers['x-driver-id'] as string) ||
        ((request.body as Record<string, unknown>)?.driver_id as string) ||
        'default-driver';

      const result = store.acceptBooking(id, driverId);
      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }

      return reply.status(200).send(result.booking);
    }
  );

  // POST /v1/driver/bookings/:id/transition
  app.post<{ Params: BookingParams }>(
    '/v1/driver/bookings/:id/transition',
    async (request, reply) => {
      const { id } = request.params;
      const parseResult = transitionBookingSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid transition payload',
          details: parseResult.error.issues,
        });
      }

      const { status, code } = parseResult.data;
      const result = store.transitionBooking(id, status, code);

      if (!result.success) {
        return reply.status(result.statusCode).send({ error: result.error });
      }

      return reply.status(200).send(result.booking);
    }
  );

  // GET /v1/driver/earnings
  app.get<{ Querystring: EarningsQuery }>(
    '/v1/driver/earnings',
    async (request, reply) => {
      const driverId =
        request.query.driver_id ||
        (request.headers['x-driver-id'] as string) ||
        'default-driver';

      const earnings = store.getDriverEarnings(driverId);
      return reply.status(200).send(earnings);
    }
  );
}
