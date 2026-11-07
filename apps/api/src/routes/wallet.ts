import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { defaultStore } from '../store/memory-store.js';

const createOrderSchema = z.object({
  amount_paise: z.number().int().positive(),
  currency: z.string().default('INR'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

const topupSchema = z.object({
  amount_paise: z.number().int().positive(),
  idempotency_key: z.string().optional(),
});

export async function walletRoutes(app: FastifyInstance) {
  const store = app.store ?? defaultStore;

  // POST /v1/wallet/topup
  app.post(
    '/v1/wallet/topup',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = topupSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid topup payload',
          details: parseResult.error.issues,
        });
      }

      const { amount_paise, idempotency_key } = parseResult.data;
      const userId = request.user?.id || 'guest-user';
      const entry = store.topupWallet(userId, amount_paise, idempotency_key);

      return reply.status(200).send({
        success: true,
        entry,
      });
    }
  );

  // POST /v1/wallet/orders
  app.post(
    '/v1/wallet/orders',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = createOrderSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid order creation payload',
          details: parseResult.error.issues,
        });
      }

      const { amount_paise, currency } = parseResult.data;
      const order = store.createWalletOrder(amount_paise, currency);
      const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_atarashi';

      return reply.status(201).send({
        order_id: order.order_id,
        amount_paise: order.amount_paise,
        currency: order.currency,
        key_id: keyId,
      });
    }
  );

  // POST /v1/wallet/verify
  app.post(
    '/v1/wallet/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = verifyPaymentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid payment verification payload',
          details: parseResult.error.issues,
        });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parseResult.data;
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';

      const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(razorpay_signature, 'utf8');

      const isValid =
        expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

      if (!isValid) {
        return reply.status(400).send({
          verified: false,
          error: 'Invalid payment signature',
        });
      }

      return reply.status(200).send({
        verified: true,
        payment_id: razorpay_payment_id,
      });
    }
  );
}
