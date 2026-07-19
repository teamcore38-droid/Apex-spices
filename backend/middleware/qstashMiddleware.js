import { Receiver } from '@upstash/qstash';

let receiverSignature = '';
let receiver = null;

const getQstashSigningConfiguration = () => ({
  currentSigningKey: String(process.env.QSTASH_CURRENT_SIGNING_KEY || '').trim(),
  nextSigningKey: String(process.env.QSTASH_NEXT_SIGNING_KEY || '').trim(),
});

const getRequestPublicUrl = (req) => {
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const protocol = forwardedProtocol || req.protocol || 'https';
  const host = forwardedHost || req.get('host');

  return `${protocol}://${host}${req.originalUrl}`;
};

const getQstashReceiver = () => {
  const configuration = getQstashSigningConfiguration();
  if (!configuration.currentSigningKey || !configuration.nextSigningKey) {
    const error = new Error('QStash signing keys are not configured');
    error.code = 'QSTASH_SIGNING_KEYS_MISSING';
    throw error;
  }

  const signature = `${configuration.currentSigningKey}:${configuration.nextSigningKey}`;
  if (!receiver || signature !== receiverSignature) {
    receiver = new Receiver(configuration);
    receiverSignature = signature;
  }

  return receiver;
};

const verifyQstashSignature = async (req, res, next) => {
  const signature = String(req.get('upstash-signature') || '').trim();
  if (!signature) {
    return res.status(401).json({ message: 'Missing QStash signature' });
  }

  try {
    const body = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
    const valid = await getQstashReceiver().verify({
      signature,
      body,
      url: getRequestPublicUrl(req),
    });

    if (!valid) {
      return res.status(401).json({ message: 'Invalid QStash signature' });
    }

    next();
  } catch (error) {
    console.error('[qstashMiddleware:verify]', error);
    const status = error.code === 'QSTASH_SIGNING_KEYS_MISSING' ? 503 : 401;
    return res.status(status).json({
      message: status === 503 ? error.message : 'Invalid QStash signature',
    });
  }
};

export {
  getQstashReceiver,
  getQstashSigningConfiguration,
  getRequestPublicUrl,
  verifyQstashSignature,
};
