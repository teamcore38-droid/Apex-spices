import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Google Identity Services is rendered through the shared component', async () => {
  const component = await readSource('../src/components/GoogleSignInButton.jsx');

  assert.match(component, /https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(component, /VITE_GOOGLE_CLIENT_ID/);
  assert.match(component, /google\.accounts\.id\.renderButton/);
});

test('login, registration, and profile linking use the shared Google flow', async () => {
  const [login, register, profile, authContext] = await Promise.all([
    readSource('../src/pages/LoginPage.jsx'),
    readSource('../src/pages/RegisterPage.jsx'),
    readSource('../src/pages/ProfilePage.jsx'),
    readSource('../src/context/AuthContext.jsx'),
  ]);

  assert.match(login, /GoogleSignInButton/);
  assert.match(register, /GoogleSignInButton/);
  assert.match(profile, /\/api\/users\/google\/link/);
  assert.match(profile, /\/api\/users\/google\/link\/2fa/);
  assert.match(authContext, /\/api\/users\/google/);
});
