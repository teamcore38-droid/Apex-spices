import { OAuth2Client } from 'google-auth-library';

const MAX_GOOGLE_CREDENTIAL_LENGTH = 10000;
const googleClient = new OAuth2Client();

class GoogleAuthenticationError extends Error {
  constructor(message, statusCode = 401, code = 'GOOGLE_AUTH_FAILED') {
    super(message);
    this.name = 'GoogleAuthenticationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const normalizeGoogleIdentity = (payload = {}) => {
  const subject = String(payload.sub || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const name = String(payload.name || email.split('@')[0] || 'Apex Spices Customer').trim();

  if (!subject || subject.length > 255) {
    throw new GoogleAuthenticationError('Google account identity is invalid');
  }

  if (!email || payload.email_verified !== true) {
    throw new GoogleAuthenticationError('A verified Google email address is required');
  }

  return {
    subject,
    email,
    name: name.slice(0, 200),
  };
};

const verifyGoogleCredential = async (credential = '') => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const idToken = String(credential || '').trim();

  if (!clientId) {
    throw new GoogleAuthenticationError(
      'Google Sign-In is not configured on the server',
      503,
      'GOOGLE_AUTH_NOT_CONFIGURED'
    );
  }

  if (!idToken || idToken.length > MAX_GOOGLE_CREDENTIAL_LENGTH) {
    throw new GoogleAuthenticationError('Google credential is invalid');
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });

    return normalizeGoogleIdentity(ticket.getPayload());
  } catch (error) {
    if (error instanceof GoogleAuthenticationError) {
      throw error;
    }

    throw new GoogleAuthenticationError('Unable to verify Google Sign-In');
  }
};

export {
  GoogleAuthenticationError,
  normalizeGoogleIdentity,
  verifyGoogleCredential,
};
