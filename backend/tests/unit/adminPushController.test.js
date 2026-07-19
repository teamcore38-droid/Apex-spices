import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebPushSubscription } from '../../controllers/adminPushController.js';

test('normalizeWebPushSubscription accepts a complete HTTPS browser subscription', () => {
  const result = normalizeWebPushSubscription({
    subscription: {
      endpoint: 'https://push.example.com/subscriptions/device-1',
      keys: {
        p256dh: 'public-encryption-key',
        auth: 'authentication-secret',
      },
    },
    platform: 'android',
    deviceLabel: 'Android',
    userAgent: 'Example Browser',
  });

  assert.equal(result.endpoint, 'https://push.example.com/subscriptions/device-1');
  assert.equal(result.platform, 'android');
  assert.deepEqual(result.keys, {
    p256dh: 'public-encryption-key',
    auth: 'authentication-secret',
  });
});

test('normalizeWebPushSubscription rejects insecure endpoints', () => {
  const result = normalizeWebPushSubscription({
    endpoint: 'http://push.example.com/device-1',
    keys: { p256dh: 'key', auth: 'secret' },
  });

  assert.equal(result.error, 'A valid HTTPS Web Push endpoint is required');
});

test('normalizeWebPushSubscription requires both encryption keys', () => {
  const result = normalizeWebPushSubscription({
    endpoint: 'https://push.example.com/device-1',
    keys: { p256dh: 'key' },
  });

  assert.equal(result.error, 'Web Push encryption keys are required');
});
