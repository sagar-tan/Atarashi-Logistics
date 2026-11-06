import type { FastifyInstance } from 'fastify';
import { healthResponseSchema } from '@atarashi/domain';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () =>
    healthResponseSchema.parse({
      status: 'ok',
      service: 'atarashi-api',
    })
  );

  app.get('/v1', async () => ({
    name: 'Atarashi Logistics API',
    version: '0.1.0',
  }));
}
