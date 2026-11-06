---
name: razorpay-integration
description: Comprehensive architecture, lifecycle, and implementation guide for integrating Razorpay Standard Checkout, Orders API, server-side HMAC-SHA256 signature verification, webhooks, and logistics wallet billing across React Native (Expo) and Fastify 5 TypeScript API.
---

# Razorpay Payment Gateway & Logistics Wallet Integration Skill

## Overview
This skill provides complete technical specifications, lifecycle flows, server-authoritative security protocols, and client implementation patterns for integrating **Razorpay Payment Gateway** into the **Atarashi Logistics** parcel delivery platform.

In Atarashi Logistics:
- Backend: Fastify 5 + TypeScript in `apps/api`
- Database: Supabase PostgreSQL (`public.wallet_ledger`, `public.bookings`)
- **Strict Currency Standard: All monetary amounts are stored as integer PAISE** (`100 paise = ₹1.00`).
- Clients: Customer App (`apps/customer`) and Admin Console (`apps/admin`).

---

## 1. Security-Critical Architecture Principles

> [!IMPORTANT]
> **Server-Authoritative Rule**: NEVER initiate payments or mutate wallet balances directly on the client side.
> 1. Orders MUST be generated server-side using the Razorpay `Orders API` (`/v1/orders`) via `apps/api`.
> 2. The mobile client receives `order_id` and opens the Razorpay checkout interface.
> 3. After checkout completion, the client transmits `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to `apps/api`.
> 4. `apps/api` cryptographically verifies the HMAC-SHA256 signature before inserting into `public.wallet_ledger` or updating `public.bookings`.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Mobile App)
    participant API as Atarashi Fastify API (apps/api)
    participant RZP as Razorpay API Server
    participant DB as Supabase PostgreSQL

    Customer->>API: POST /v1/wallet/orders { amountPaise: 50000 }
    API->>RZP: POST /v1/orders { amount: 50000, currency: "INR", receipt }
    RZP-->>API: 201 Created { id: "order_xyz123", amount: 50000 }
    API-->>Customer: 200 OK { orderId: "order_xyz123", amountPaise: 50000, keyId: "rzp_test_..." }
    
    Customer->>Customer: Open Razorpay Checkout (UPI / Card / Netbanking)
    Customer->>RZP: Authorize Payment
    RZP-->>Customer: Callback { razorpay_payment_id, razorpay_order_id, razorpay_signature }

    Customer->>API: POST /v1/wallet/verify { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    API->>API: HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
    API->>DB: INSERT into wallet_ledger (user_id, amount_paise, idempotency_key)
    API-->>Customer: 200 OK { success: true, balancePaise: 50000 }
    Customer->>Customer: Refresh in-app wallet balance
```

---

## 2. Server-Side Verification (Fastify 5 TypeScript)

```typescript
import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import Razorpay from 'razorpay';
import { z } from 'zod';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(signature));
}
```

---

## 3. Webhook Handling & Idempotency
- Webhooks must be verified using `crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)`.
- Use the `x-razorpay-event-id` or `payment.id` as the `idempotency_key` when inserting into `public.wallet_ledger`.
- If the idempotency key already exists, return `200 OK` without applying duplicate balance credits.
