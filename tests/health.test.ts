import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { readEnv } from '../src/config/env.js';

test('health and unknown routes', async t => {
  const app = buildApp();
  t.after(() => app.close());
  const health = await app.inject('/health');
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { status: 'ok' });
  const missing = await app.inject('/missing');
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, 'NOT_FOUND');
});

test('environment validates ports and log levels', () => {
  assert.equal(readEnv({}).port, 3000);
  assert.equal(readEnv({ PORT: '8080' }).port, 8080);
  for (const PORT of ['', '0', '-1', '65536', '1.5', '12foo']) {
    assert.throws(() => readEnv({ PORT }));
  }
  assert.throws(() => readEnv({ LOG_LEVEL: 'invalid' }));
});

test('unexpected errors are sanitized', async t => {
  const app = buildApp();
  app.get('/failure', () => { throw new Error('private diagnostic'); });
  t.after(() => app.close());
  const response = await app.inject('/failure');
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});
