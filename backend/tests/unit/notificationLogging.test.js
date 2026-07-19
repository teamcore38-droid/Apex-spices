import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeNotificationLogMessage } from '../../utils/notificationLogging.js';

test('notification logging redacts bearer tokens and complete URLs', () => {
  const sanitized = sanitizeNotificationLogMessage(
    'Bearer secret-token failed for https://push.example/device/private-id'
  );

  assert.doesNotMatch(sanitized, /secret-token/);
  assert.doesNotMatch(sanitized, /push\.example/);
  assert.match(sanitized, /Bearer \[redacted\]/);
  assert.match(sanitized, /\[url\]/);
});
