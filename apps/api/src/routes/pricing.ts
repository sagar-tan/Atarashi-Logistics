import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  pricingQuoteRequestSchema,
  pricingQuoteResponseSchema,
} from '@atarashi/domain';
import { calculateHaversineDistanceKm, estimateDurationMins } from '../lib/geo.js';
import { calculateFarePaise } from '../lib/pricing.js';

export async function pricingRoutes(app: FastifyInstance) {
  app.post(
    '/v1/pricing/quote',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = pricingQuoteRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid pricing quote request',
          details: parseResult.error.issues,
        });
      }

      const { pickup, dropoff, vehicle_type } = parseResult.data;
      const distance_km = calculateHaversineDistanceKm(pickup, dropoff);
      const duration_mins = estimateDurationMins(distance_km);
      const fare_paise = calculateFarePaise(vehicle_type, distance_km);

      const responsePayload = {
        distance_km,
        duration_mins,
        fare_paise,
        vehicle_type,
      };

      const validated = pricingQuoteResponseSchema.parse(responsePayload);
      return reply.status(200).send(validated);
    }
  );
}
