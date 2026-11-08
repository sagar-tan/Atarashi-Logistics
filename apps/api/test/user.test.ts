import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { MemoryStore } from '../src/store/memory-store.js';

test('User Onboarding & Server-Side Registration Suite', async (t) => {
  const store = new MemoryStore();
  const app = buildApp({ store, logger: false });

  const newCustomerAuth = { authorization: 'Bearer test-jwt-brand-new-customer' };
  const existingCustomerAuth = { authorization: 'Bearer test-jwt-returning-customer' };

  await t.test('POST /v1/auth/check-phone returns registered: false for new number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/check-phone',
      payload: { phone: '+919999900000' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.registered, false);
    assert.equal(body.onboarding_completed, false);
  });

  await t.test('GET /v1/user/onboarding-status identifies brand new user and returns multi-step flow', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/user/onboarding-status',
      headers: newCustomerAuth,
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.user_id, 'brand-new-customer');
    assert.equal(body.is_new_user, true);
    assert.equal(body.onboarding_completed, false);
    assert.equal(body.step_count, 3);
    assert.deepEqual(body.steps_required, ['profile', 'location', 'welcome']);
    assert.equal(body.next_step, 'profile');
  });

  await t.test('GET /v1/user/onboarding-status identifies existing registered user and returns 1-step flow', async () => {
    // Seed an existing registered user who has name and phone but missing city/hub
    store.upsertProfile('returning-customer', {
      full_name: 'Rohit Verma',
      phone: '+919888877777',
      onboarding_completed: false,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/user/onboarding-status',
      headers: existingCustomerAuth,
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.user_id, 'returning-customer');
    assert.equal(body.is_new_user, false);
    assert.equal(body.onboarding_completed, false);
    assert.equal(body.step_count, 1);
    assert.deepEqual(body.steps_required, ['location']);
    assert.equal(body.next_step, 'location');
    assert.equal(body.profile.full_name, 'Rohit Verma');
  });

  await t.test('POST /v1/user/onboarding-complete saves profile and activates ₹500 welcome credit', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/user/onboarding-complete',
      headers: newCustomerAuth,
      payload: {
        full_name: 'Aarav Patel',
        email: 'aarav.patel@example.in',
        phone: '+919999900000',
        account_type: 'personal',
        city: 'Bengaluru',
        default_address: 'Flat 402, Green Glen Layout, Bellandur',
        default_pincode: '560103',
        preferred_vehicle: 'bike',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.onboarding_completed, true);
    assert.equal(body.welcome_bonus_paise, 50000);
    assert.equal(body.profile.full_name, 'Aarav Patel');
    assert.equal(body.profile.city, 'Bengaluru');

    // Verify wallet ledger entry
    const ledger = store.getWalletEntries('brand-new-customer');
    assert.ok(ledger.some((e) => e.amount_paise === 50000 && e.entry_type === 'credit'));
  });

  await t.test('Subsequent GET /v1/user/onboarding-status returns completed: true and 0 steps', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/user/onboarding-status',
      headers: newCustomerAuth,
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.onboarding_completed, true);
    assert.equal(body.step_count, 0);
    assert.deepEqual(body.steps_required, []);
    assert.equal(body.profile.full_name, 'Aarav Patel');
  });

  await t.test('POST /v1/auth/check-phone returns registered: true after onboarding', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/check-phone',
      payload: { phone: '+919999900000' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.registered, true);
    assert.equal(body.onboarding_completed, true);
    assert.equal(body.name, 'Aarav Patel');
  });
});
