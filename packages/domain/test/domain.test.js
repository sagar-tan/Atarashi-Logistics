import test from 'node:test';
import assert from 'node:assert/strict';
import {
  vehicleTypeSchema,
  bookingStatusSchema,
  parcelSizeSchema,
  coordinatesSchema,
  healthResponseSchema,
  createBookingSchema,
  pricingQuoteRequestSchema,
  pricingQuoteResponseSchema,
  driverStatusSchema,
  transitionBookingSchema,
} from '../src/index.js';

test('vehicleTypeSchema validates allowed vehicle types', () => {
  for (const type of ['bike', 'auto', 'car', 'pickup']) {
    assert.equal(vehicleTypeSchema.parse(type), type);
  }
  assert.throws(() => vehicleTypeSchema.parse('truck'));
});

test('bookingStatusSchema validates allowed booking statuses', () => {
  for (const status of ['pending', 'assigned', 'picked_up', 'in_transit', 'completed', 'cancelled', 'timed_out']) {
    assert.equal(bookingStatusSchema.parse(status), status);
  }
  assert.throws(() => bookingStatusSchema.parse('invalid_status'));
});

test('parcelSizeSchema validates allowed sizes', () => {
  for (const size of ['small', 'medium', 'large']) {
    assert.equal(parcelSizeSchema.parse(size), size);
  }
  assert.throws(() => parcelSizeSchema.parse('extra_large'));
});

test('coordinatesSchema validates valid coordinates', () => {
  const valid = { latitude: 28.6139, longitude: 77.2090 };
  assert.deepEqual(coordinatesSchema.parse(valid), valid);

  assert.throws(() => coordinatesSchema.parse({ latitude: 95, longitude: 77 }));
  assert.throws(() => coordinatesSchema.parse({ latitude: 28, longitude: 190 }));
});

test('healthResponseSchema validates health output', () => {
  const valid = { status: 'ok', service: 'atarashi-api' };
  assert.deepEqual(healthResponseSchema.parse(valid), valid);
  assert.throws(() => healthResponseSchema.parse({ status: 'bad', service: 'atarashi-api' }));
});

test('createBookingSchema validates booking creation payload', () => {
  const valid = {
    pickup: {
      coordinates: { latitude: 12.9716, longitude: 77.5946 },
      address: 'Indiranagar 100ft Road',
    },
    dropoff: {
      coordinates: { latitude: 12.9352, longitude: 77.6245 },
      address: 'Koramangala 4th Block',
    },
    vehicle_type: 'bike',
    parcel_size: 'small',
    sender_name: 'Aarav Patel',
    sender_phone: '+919876543210',
    recipient_name: 'Priya Sharma',
    recipient_phone: '+919876543211',
    payment_method: 'online',
  };

  assert.deepEqual(createBookingSchema.parse(valid), valid);

  // Missing pickup address
  assert.throws(() => createBookingSchema.parse({ ...valid, pickup: { coordinates: valid.pickup.coordinates, address: '' } }));

  // Invalid vehicle_type
  assert.throws(() => createBookingSchema.parse({ ...valid, vehicle_type: 'lorry' }));

  // Invalid payment_method
  assert.throws(() => createBookingSchema.parse({ ...valid, payment_method: 'crypto' }));
});

test('pricingQuoteRequestSchema validates pricing request payload', () => {
  const valid = {
    pickup: { latitude: 12.9716, longitude: 77.5946 },
    dropoff: { latitude: 12.9352, longitude: 77.6245 },
    vehicle_type: 'auto',
  };
  assert.deepEqual(pricingQuoteRequestSchema.parse(valid), valid);
  assert.throws(() => pricingQuoteRequestSchema.parse({ ...valid, vehicle_type: 'spaceship' }));
});

test('pricingQuoteResponseSchema validates pricing response payload', () => {
  const valid = {
    distance_km: 5.4,
    duration_mins: 15,
    fare_paise: 9980,
    vehicle_type: 'auto',
  };
  assert.deepEqual(pricingQuoteResponseSchema.parse(valid), valid);

  // Negative fare rejected
  assert.throws(() => pricingQuoteResponseSchema.parse({ ...valid, fare_paise: -100 }));

  // Float fare rejected (paise must be integer)
  assert.throws(() => pricingQuoteResponseSchema.parse({ ...valid, fare_paise: 99.8 }));
});

test('driverStatusSchema validates location and online status', () => {
  const valid = {
    is_online: true,
    location: { latitude: 12.9716, longitude: 77.5946 },
    heading: 180,
  };
  assert.deepEqual(driverStatusSchema.parse(valid), valid);

  // Heading is optional
  const withoutHeading = {
    is_online: false,
    location: { latitude: 12.9716, longitude: 77.5946 },
  };
  assert.deepEqual(driverStatusSchema.parse(withoutHeading), withoutHeading);

  // Invalid latitude rejected
  assert.throws(() => driverStatusSchema.parse({ ...valid, location: { latitude: 100, longitude: 77 } }));
});

test('transitionBookingSchema validates booking lifecycle transitions', () => {
  const pickedUp = { status: 'picked_up', code: '1234' };
  assert.deepEqual(transitionBookingSchema.parse(pickedUp), pickedUp);

  const inTransit = { status: 'in_transit' };
  assert.deepEqual(transitionBookingSchema.parse(inTransit), inTransit);

  const completed = { status: 'completed', code: '5678' };
  assert.deepEqual(transitionBookingSchema.parse(completed), completed);

  // Invalid status
  assert.throws(() => transitionBookingSchema.parse({ status: 'delivered' }));
});
