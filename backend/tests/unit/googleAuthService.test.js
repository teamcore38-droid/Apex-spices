import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import User from '../../models/userModel.js';
import TwoFactorChallenge from '../../models/twoFactorChallengeModel.js';
import {
  GoogleAuthenticationError,
  normalizeGoogleIdentity,
  verifyGoogleCredential,
} from '../../utils/googleAuthService.js';

test('normalizes only verified Google identities and uses sub as the stable identity', () => {
  const identity = normalizeGoogleIdentity({
    sub: 'google-subject-123',
    email: ' Customer@Example.com ',
    email_verified: true,
    name: 'Apex Customer',
  });

  assert.deepEqual(identity, {
    subject: 'google-subject-123',
    email: 'customer@example.com',
    name: 'Apex Customer',
  });
  assert.throws(
    () => normalizeGoogleIdentity({ sub: '123', email: 'user@example.com', email_verified: false }),
    GoogleAuthenticationError
  );
});

test('Google credential verification fails closed when the server client ID is absent', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;

  await assert.rejects(
    verifyGoogleCredential('credential'),
    (error) => error instanceof GoogleAuthenticationError && error.statusCode === 503
  );

  if (previousClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = previousClientId;
  }
});

test('user model supports Google-only users without weakening password matching', async () => {
  const invalidPasswordlessUser = new User({
    name: 'Invalid Customer',
    email: 'invalid@example.com',
  });
  assert.ok(invalidPasswordlessUser.validateSync()?.errors?.password);

  const googleUser = new User({
    name: 'Google Customer',
    email: 'google@example.com',
    googleSubject: 'google-subject',
    googleLinkedAt: new Date(),
  });

  assert.equal(googleUser.validateSync(), undefined);
  assert.equal(await googleUser.matchPassword('anything'), false);

  const localUser = new User({
    name: 'Local Customer',
    email: 'local@example.com',
    password: await bcrypt.hash('password123', 10),
  });
  assert.equal(await localUser.matchPassword('password123'), true);
  assert.equal(await localUser.matchPassword('incorrect'), false);
});

test('Google subjects have a partial unique index and privileged linking has a 2FA purpose', () => {
  const googleIndex = User.schema.indexes().find(([keys]) => keys.googleSubject === 1);
  assert.ok(googleIndex);
  assert.equal(googleIndex[1].unique, true);
  assert.deepEqual(googleIndex[1].partialFilterExpression, { googleSubject: { $type: 'string' } });

  const purposes = TwoFactorChallenge.schema.path('purpose').options.enum;
  assert.ok(purposes.includes('google-link'));
  assert.equal(TwoFactorChallenge.schema.path('metadata').options.select, false);
});
