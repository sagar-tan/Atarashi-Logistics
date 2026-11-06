import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory-store.js';

test('Gateway API Integration Suite', async (t) => {
  const store = new MemoryStore();
  const app = buildApp({ store, logger: false });

  // Baseline coordinates in Bengaluru (Indiranagar to Koramangala)
  const pickupCoords = { latitude: 12.9716, longitude: 77.5946 };
  const dropoffCoords = { latitude: 12.9352, longitude: 77.6245 };

  await t.test('GET /health returns service health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'atarashi-api');
  });

  await t.test('GET /v1 returns API metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.name, 'Atarashi Logistics API');
    assert.equal(body.version, '0.1.0');
  });

  await t.test('POST /v1/pricing/quote calculates Haversine fare in integer paise', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/pricing/quote',
      payload: {
        pickup: pickupCoords,
        dropoff: dropoffCoords,
        vehicle_type: 'bike',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(typeof body.distance_km === 'number' && body.distance_km > 0);
    assert.ok(typeof body.duration_mins === 'number' && body.duration_mins >= 5);
    assert.ok(Number.isInteger(body.fare_paise) && body.fare_paise > 3500);
    assert.equal(body.vehicle_type, 'bike');
  });

  await t.test('POST /v1/pricing/quote verifies vehicle rates across tiers', async () => {
    const vehicleTypes = ['bike', 'auto', 'car', 'pickup'] as const;
    const baseFares = { bike: 3500, auto: 5000, car: 8000, pickup: 15000 };

    for (const vType of vehicleTypes) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/pricing/quote',
        payload: {
          pickup: pickupCoords,
          dropoff: dropoffCoords,
          vehicle_type: vType,
        },
      });

      assert.equal(res.statusCode, 200);
      const body = res.json();
      assert.ok(Number.isInteger(body.fare_paise));
      assert.ok(body.fare_paise >= baseFares[vType]);
      assert.equal(body.vehicle_type, vType);
    }
  });

  await t.test('POST /v1/pricing/quote rejects invalid coordinates and vehicle', async () => {
    const invalidCoords = await app.inject({
      method: 'POST',
      url: '/v1/pricing/quote',
      payload: {
        pickup: { latitude: 95, longitude: 77 },
        dropoff: dropoffCoords,
        vehicle_type: 'bike',
      },
    });
    assert.equal(invalidCoords.statusCode, 400);

    const invalidVehicle = await app.inject({
      method: 'POST',
      url: '/v1/pricing/quote',
      payload: {
        pickup: pickupCoords,
        dropoff: dropoffCoords,
        vehicle_type: 'aeroplane',
      },
    });
    assert.equal(invalidVehicle.statusCode, 400);
  });

  let createdBookingId = '';
  let pickupOtp = '';
  let deliveryPin = '';

  await t.test('POST /v1/bookings creates booking with OTP, PIN, and calculated fare', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/bookings',
      payload: {
        pickup: { coordinates: pickupCoords, address: 'Indiranagar 100ft Road' },
        dropoff: { coordinates: dropoffCoords, address: 'Koramangala 4th Block' },
        vehicle_type: 'auto',
        parcel_size: 'medium',
        sender_name: 'Vikram Seth',
        sender_phone: '+919876543210',
        recipient_name: 'Ananya Roy',
        recipient_phone: '+919876543211',
        payment_method: 'wallet',
      },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.ok(body.id);
    createdBookingId = body.id;

    assert.equal(body.status, 'pending');
    assert.equal(body.vehicle_type, 'auto');
    assert.equal(body.parcel_size, 'medium');
    assert.ok(Number.isInteger(body.fare_paise));

    // Strict 4-digit codes verification
    assert.ok(typeof body.pickup_otp === 'string' && body.pickup_otp.length === 4);
    assert.ok(typeof body.delivery_pin === 'string' && body.delivery_pin.length === 4);
    pickupOtp = body.pickup_otp;
    deliveryPin = body.delivery_pin;
  });

  await t.test('GET /v1/bookings/:id retrieves the booking', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/bookings/${createdBookingId}`,
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.id, createdBookingId);
    assert.equal(body.status, 'pending');

    const notFound = await app.inject({
      method: 'GET',
      url: '/v1/bookings/00000000-0000-0000-0000-000000000000',
    });
    assert.equal(notFound.statusCode, 404);
  });

  await t.test('POST /v1/driver/status updates driver location and availability', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/driver/status',
      headers: { 'x-driver-id': 'driver-blr-1' },
      payload: {
        is_online: true,
        location: pickupCoords,
        heading: 90,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.driver_id, 'driver-blr-1');
    assert.equal(body.is_online, true);
    assert.equal(body.location.latitude, pickupCoords.latitude);
    assert.equal(body.heading, 90);
  });

  await t.test('POST /v1/driver/bookings/:id/accept assigns driver to pending booking', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/accept`,
      headers: { 'x-driver-id': 'driver-blr-1' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.id, createdBookingId);
    assert.equal(body.status, 'assigned');
    assert.equal(body.driver_id, 'driver-blr-1');

    // Re-accepting already accepted booking fails
    const reAccept = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/accept`,
      headers: { 'x-driver-id': 'driver-blr-2' },
    });
    assert.equal(reAccept.statusCode, 400);
  });

  await t.test('POST /v1/driver/bookings/:id/transition enforces OTP on pickup', async () => {
    // 1. Wrong OTP rejected
    const wrongOtpRes = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'picked_up',
        code: '0000',
      },
    });
    assert.equal(wrongOtpRes.statusCode, 400);
    assert.ok(wrongOtpRes.json().error.includes('pickup OTP'));

    // 2. Missing OTP rejected
    const missingOtpRes = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'picked_up',
      },
    });
    assert.equal(missingOtpRes.statusCode, 400);

    // 3. Correct OTP accepted
    const correctOtpRes = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'picked_up',
        code: pickupOtp,
      },
    });
    assert.equal(correctOtpRes.statusCode, 200);
    assert.equal(correctOtpRes.json().status, 'picked_up');
  });

  await t.test('POST /v1/driver/bookings/:id/transition transitions to in_transit without code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'in_transit',
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().status, 'in_transit');
  });

  await t.test('POST /v1/driver/bookings/:id/transition enforces PIN on delivery', async () => {
    // 1. Wrong PIN rejected
    const wrongPinRes = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'completed',
        code: '9999',
      },
    });
    assert.equal(wrongPinRes.statusCode, 400);
    assert.ok(wrongPinRes.json().error.includes('delivery PIN'));

    // 2. Correct PIN completes booking
    const correctPinRes = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'completed',
        code: deliveryPin,
      },
    });
    assert.equal(correctPinRes.statusCode, 200);
    const body = correctPinRes.json();
    assert.equal(body.status, 'completed');
    assert.ok(body.completed_at);
  });

  await t.test('POST /v1/driver/bookings/:id/transition rejects invalid state jumps', async () => {
    // Attempting to transition a completed booking to picked_up
    const res = await app.inject({
      method: 'POST',
      url: `/v1/driver/bookings/${createdBookingId}/transition`,
      payload: {
        status: 'picked_up',
        code: pickupOtp,
      },
    });
    assert.equal(res.statusCode, 400);
  });

  await t.test('GET /v1/driver/earnings calculates completed trips and earnings in paise', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/driver/earnings',
      headers: { 'x-driver-id': 'driver-blr-1' },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.trips_count, 1);
    assert.ok(Number.isInteger(body.earnings_paise));
    assert.ok(body.earnings_paise > 0);
    assert.equal(body.currency, 'INR');
  });

  await t.test('POST /v1/wallet/orders creates Razorpay order in paise', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/wallet/orders',
      payload: {
        amount_paise: 25000, // ₹250.00
      },
    });

    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.ok(body.order_id.startsWith('order_'));
    assert.equal(body.amount_paise, 25000);
    assert.equal(body.currency, 'INR');
    assert.ok(body.key_id);

    // Rejects non-positive or float amounts
    const floatRes = await app.inject({
      method: 'POST',
      url: '/v1/wallet/orders',
      payload: { amount_paise: 250.5 },
    });
    assert.equal(floatRes.statusCode, 400);
  });

  await t.test('POST /v1/wallet/verify validates HMAC-SHA256 signature', async () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_key';

    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // 1. Valid signature
    const validRes = await app.inject({
      method: 'POST',
      url: '/v1/wallet/verify',
      payload: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      },
    });

    assert.equal(validRes.statusCode, 200);
    const validBody = validRes.json();
    assert.equal(validBody.verified, true);
    assert.equal(validBody.payment_id, paymentId);

    // 2. Tampered signature rejected
    const invalidRes = await app.inject({
      method: 'POST',
      url: '/v1/wallet/verify',
      payload: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'invalid_tampered_signature_hex_0123456789abcdef',
      },
    });

    assert.equal(invalidRes.statusCode, 400);
    const invalidBody = invalidRes.json();
    assert.equal(invalidBody.verified, false);
    assert.equal(invalidBody.error, 'Invalid payment signature');
  });

  await app.close();
});
