import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRefreshTokenDays,
  hashValue,
  issueAccessToken,
} from '../../utils/securityService.js';

process.env.JWT_SECRET ||= 'test-jwt-secret';

test('hashValue is deterministic and does not expose raw token', () => {
  const token = 'refresh-token-value';
  const first = hashValue(token);
  const second = hashValue(token);

  assert.equal(first, second);
  assert.notEqual(first, token);
  assert.equal(first.length, 64);
});

test('refresh token policy defaults to 7 days and remember me extends to 30 days', () => {
  assert.equal(getRefreshTokenDays(false), 7);
  assert.equal(getRefreshTokenDays(true), 30);
});

test('issueAccessToken creates a short-lived 15 minute JWT', () => {
  const issued = issueAccessToken('507f1f77bcf86cd799439011');

  assert.ok(issued.token);
  assert.ok(issued.tokenExpiresAt);
  assert.ok(issued.tokenExpiresInSeconds <= 15 * 60);
  assert.ok(issued.tokenExpiresInSeconds > 14 * 60);
});
