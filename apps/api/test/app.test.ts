import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('GET /health returns 200 and health status', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'atarashi-api');
  await app.close();
});

test('GET /v1 returns 200 and service metadata', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/v1',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.name, 'Atarashi Logistics API');
  assert.equal(body.version, '0.1.0');
  await app.close();
});

test('GET /unknown returns 404', async () => {
  const app = buildApp();
  const response = await app.inject({
    method: 'GET',
    url: '/unknown-route',
  });

  assert.equal(response.statusCode, 404);
  await app.close();
});
