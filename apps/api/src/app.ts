import Fastify, { type FastifyServerOptions } from 'fastify';
import { healthRoutes } from './routes/health.js';
import { pricingRoutes } from './routes/pricing.js';
import { bookingRoutes } from './routes/bookings.js';
import { driverRoutes } from './routes/driver.js';
import { walletRoutes } from './routes/wallet.js';
import { MemoryStore, defaultStore } from './store/memory-store.js';

declare module 'fastify' {
  interface FastifyInstance {
    store: MemoryStore;
  }
}

export interface AppOptions extends FastifyServerOptions {
  store?: MemoryStore;
}

export function buildApp(opts: AppOptions = {}) {
  const { store = defaultStore, ...fastifyOpts } = opts;
  const app = Fastify({
    logger: fastifyOpts.logger ?? false,
    trustProxy: true,
    ...fastifyOpts,
  });

  app.decorate('store', store);

  // Register all route modules
  app.register(healthRoutes);
  app.register(pricingRoutes);
  app.register(bookingRoutes);
  app.register(driverRoutes);
  app.register(walletRoutes);

  return app;
}
