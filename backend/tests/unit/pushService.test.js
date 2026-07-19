import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVapidConfiguration,
  isExpiredPushSubscriptionError,
  isVapidConfigured,
} from '../../utils/pushService.js';

const withVapidEnvironment = (values, callback) => {
  const previous = {
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  };

  Object.assign(process.env, values);

  try {
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test('VAPID configuration uses the Phase 1 environment variable names', () => {
  withVapidEnvironment(
    {
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'mailto:info@apexspices.lk',
    },
    () => {
      assert.deepEqual(getVapidConfiguration(), {
        publicKey: 'public-key',
        privateKey: 'private-key',
        subject: 'mailto:info@apexspices.lk',
      });
      assert.equal(isVapidConfigured(), true);
    }
  );
});

test('VAPID configuration rejects an invalid subject', () => {
  withVapidEnvironment(
    {
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'info@apexspices.lk',
    },
    () => assert.equal(isVapidConfigured(), false)
  );
});

test('expired Web Push endpoints are recognized', () => {
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 404 }), true);
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 410 }), true);
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 500 }), false);
});
