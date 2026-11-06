---
name: in-app-payment-system
description: |
  Architecture, lifecycle, and implementation guide for the payment and wallet system in Moveet / Duro EV.
  Covers Razorpay checkout flow, server-side HMAC-SHA256 signature verification, security deposit enforcement,
  subscription plan activation, wallet top-ups, refund requests, and sandbox/mock fallback handling.
license: Proprietary
metadata:
  version: v1.0.0
  publisher: duro-ev
---

# In-App Payment & Wallet System Skill

This skill documents how payments, subscriptions, security deposits, and refunds are integrated across the **Moveet Customer App (`moveet-frontend`)** and the **Moveet Node.js Backend (`moveet-backend`)**.

---

## 1. System Overview & Core Capabilities

The payment subsystem handles 4 distinct financial flows:
1. **Security Deposit**: Mandatory refundable guarantee before activating any rental subscription.
2. **Weekly Subscription Plan**: 7-day scooter rental plan (supports admin-customized pricing per user).
3. **Wallet Top-Up / Balance**: Prepaid wallet used to pay for deposits or plan renewals.
4. **Refund & Withdrawal Ledger**: Bank account or UPI withdrawal requests subject to administrative approval.

---

## 2. Architecture & File Structure

```
├── moveet-backend/
│   ├── src/modules/payment/payment.routes.js   # Razorpay order generation, HMAC verification, subscribe, refund
│   ├── src/services/deposit.service.js        # Deposit calculations, validity windows, and requirements
│   └── tests/payment.test.js                  # Integration tests for orders, signatures, and wallet operations
│
├── moveet-frontend/
│   ├── app/(tabs)/payments.tsx                # Customer payment dashboard, sheets, and Razorpay modal triggers
│   ├── src/services/payment.service.ts        # Typed API service (`requestAPI` client)
│   ├── src/stores/payment.store.ts            # Zustand store managing plans, refund history, and payment state
│   └── src/config/env.ts                      # Client-side Razorpay Key ID and environment flags
```

---

## 3. End-to-End Payment Lifecycle

```
[Customer App]                      [Moveet Backend]                     [Razorpay Gateway]
      │                                     │                                     │
      │ 1. POST /payments/purchase          │                                     │
      ├────────────────────────────────────>│                                     │
      │    { planId, amount }               │ 2. razorpay.orders.create()         │
      │                                     ├────────────────────────────────────>│
      │                                     │<────────────────────────────────────┤
      │                                     │    { order_id, amount, ... }        │
      │                                     │ 3. Create Transaction (PENDING)     │
      │<────────────────────────────────────┤                                     │
      │    { orderId, amount }              │                                     │
      │                                     │                                     │
      │ 4. RazorpayCheckout.open(options)   │                                     │
      ├──────────────────────────────────────────────────────────────────────────>│
      │                                                                           │
      │ 5. Payment completed (returns order_id, payment_id, signature)             │
      │<──────────────────────────────────────────────────────────────────────────┤
      │                                     │                                     │
      │ 6. POST /payments/verify            │                                     │
      ├────────────────────────────────────>│                                     │
      │    { razorpay_order_id,             │ 7. Verify HMAC-SHA256 signature     │
      │      razorpay_payment_id,           │    - Expected vs received signature │
      │      razorpay_signature, amount }   │ 8. Mark Transaction SUCCESS         │
      │                                     │ 9. Atomically credit wallet /       │
      │                                     │    activate plan / update deposit   │
      │<────────────────────────────────────┤                                     │
      │    { verified: true }               │                                     │
```

---

## 4. Backend Implementation (`payment.routes.js`)

### 4.1 Order Creation (`POST /payments/purchase`)
- Accepts `{ planId, amount }` with bearer authentication.
- Converts amount to smallest currency unit (**paise**: `Math.round(amount * 100)`).
- Initializes Razorpay client using sanitized environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- Persists a new row in `transactions` with status `'PENDING'`.

### 4.2 Cryptographic Verification (`POST /payments/verify`)
Every successful checkout on mobile returns three cryptographic fields:
- `razorpay_order_id`
- `razorpay_payment_id`
- `razorpay_signature`

**Signature Algorithm:**
```javascript
const crypto = require('crypto');

const body = `${razorpay_order_id}|${razorpay_payment_id}`;
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(body)
  .digest('hex');

if (expectedSignature !== razorpay_signature) {
  // Mark transaction FAILED and reject
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: 'FAILED' },
  });
  return ApiResponse.badRequest(res, 'Payment verification failed.');
}
```

### 4.3 Atomic Fulfillment Logic
Once verified, the backend handles entity updates inside the database:
- **`security-deposit`**: Updates `user.securityDepositPaid = true`, stores `securityDepositAmount`, sets `securityDepositExpiresAt`.
- **Subscription (`weekly`)**:
  - Calculates start/expiry dates (extends current expiry if active, or sets 7 days from now).
  - Updates `user.activePlanId`, `user.planExpiryDate`, and adjusts `walletBalance`.
  - Records matching subscription `transaction` entry.
- **`wallet-topup` / Recharge**: Increments `user.walletBalance`.

### 4.4 Wallet Subscriptions (`POST /payments/subscribe`)
Allows instant activation without entering payment gateway details:
1. Validates that the user has an active, non-expired security deposit (`depositService.getUserDepositInfo(userId)`).
2. Verifies `user.walletBalance >= planPrice`.
3. Atomically decrements `walletBalance` by `planPrice` and activates the subscription.

---

## 5. Frontend Integration (`moveet-frontend`)

### 5.1 Native Razorpay SDK Loading
To ensure compatibility across Expo Go, Web, and bare React Native builds:
```typescript
import Constants from 'expo-constants';
import { Platform } from 'react-native';

let RazorpayCheckout: any = { 
  open: () => Promise.reject(new Error('Razorpay not available in this environment')) 
};

const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

if (!isExpoGo && !isWeb) {
  try {
    RazorpayCheckout = require('react-native-razorpay').default ?? RazorpayCheckout;
  } catch (e) {
    console.error('[Razorpay] Critical error loading react-native-razorpay:', e);
  }
}
```

### 5.2 Launching Checkout
```typescript
const options = {
  description: type === 'top-up' ? 'Wallet Recharge' : `${type.toUpperCase()} Subscription`,
  currency: 'INR',
  key: ENV.RAZORPAY_KEY_ID,
  amount: amount * 100, // In paise
  name: 'Duro EV',
  order_id: orderId,
  prefill: {
    email: user?.email || '',
    contact: user?.phone || '',
    name: `${user?.firstName} ${user?.lastName}`.trim(),
  },
  theme: { color: theme.colors.primary }, // Brand neon green #3FE56C
};

RazorpayCheckout.open(options)
  .then(async (data: any) => {
    // data contains razorpay_order_id, razorpay_payment_id, razorpay_signature
    await paymentService.verifyPayment({
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
      amount,
    });
  })
  .catch((error: any) => {
    // Handle user cancellation (error.code === 'USER_CANCELLED') or gateway failures
  });
```

---

## 6. Development & Mock Fallback Mode

To enable frictionless testing on simulators, Expo Go, and CI/CD test runners:
- When running with `NODE_ENV=development` or `test`:
  - If Razorpay SDK is uninstalled or API keys are not yet configured, the backend automatically issues a mock order ID prefixed with `order_mock_${Date.now()}`.
  - The verification route recognizes `order_mock_` and safely skips HMAC signature checks.
  - In `moveet-frontend/app/(tabs)/payments.tsx`, if running inside Expo Go or debug mode where native Razorpay cannot launch, the app catches the missing module and simulates successful verification directly.

---

## 7. Operational & Security Checklist

- **Never Expose Secrets**: `RAZORPAY_KEY_SECRET` exists strictly on `moveet-backend`. The mobile client only receives `RAZORPAY_KEY_ID`.
- **Double-Quote Sanitization**: Backend strips surrounding quotes (`replace(/['"]/g, '').trim()`) to prevent environment injection issues on Render/Cloud Run.
- **Double-Spend Prevention**: When submitting a withdrawal / refund request, balance is immediately decremented from `user.walletBalance` and held in `RefundRequest` status `'PENDING'`.
- **Active Ride Lockout**: Funds cannot be withdrawn while the user has an ongoing active scooter ride (`status === 'ACTIVE'`).
