const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

const createAdminPushError = (code, message, details = {}) => {
  const error = new Error(message);
  error.name = 'AdminPushError';
  error.code = code;
  error.details = details;
  return error;
};

const getUserAgentText = () =>
  `${navigator.userAgentData?.platform || navigator.platform || ''} ${navigator.userAgent || ''}`.trim();

const isAppleMobileBrowserContext = () => {
  const platform = getUserAgentText();
  const hasTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod|ios/i.test(platform) || hasTouchMac;
};

const isMacOs = () => /mac/i.test(getUserAgentText());

const isStandaloneDisplay = () =>
  Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
      navigator.standalone === true
  );

const supportsPushPrimitives = () =>
  Boolean(
    window.isSecureContext &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
  );

const getAdminPushEnvironment = () => {
  const installRequired = isAppleMobileBrowserContext() && !isStandaloneDisplay();
  const supported = supportsPushPrimitives() && !installRequired;

  let reason = '';
  if (!window.isSecureContext) {
    reason = 'secure-context-required';
  } else if (!('Notification' in window)) {
    reason = 'notifications-api-unavailable';
  } else if (!('serviceWorker' in navigator)) {
    reason = 'service-worker-unavailable';
  } else if (!('PushManager' in window)) {
    reason = 'push-api-unavailable';
  } else if (installRequired) {
    reason = 'install-required';
  }

  return {
    supported,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    publicKeyConfigured: Boolean(VAPID_PUBLIC_KEY),
    installRequired,
    isAppleMobile: isAppleMobileBrowserContext(),
    isMacOs: isMacOs(),
    isStandalone: isStandaloneDisplay(),
    reason,
  };
};

const getExistingPushSubscription = async () => {
  if (!getAdminPushEnvironment().supported) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
};

const getPlatform = () => {
  const platform = getUserAgentText();

  if (/android/i.test(platform)) {
    return 'android';
  }

  if (isAppleMobileBrowserContext()) {
    return 'ios';
  }

  return 'web';
};

const getDeviceLabel = () =>
  String(navigator.userAgentData?.platform || navigator.platform || 'Web browser').slice(0, 120);

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(base64);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const validateApplicationServerKey = () => {
  if (!VAPID_PUBLIC_KEY) {
    throw createAdminPushError(
      'VAPID_PUBLIC_KEY_MISSING',
      'The frontend VAPID public key is not configured.'
    );
  }

  let applicationServerKey;

  try {
    applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  } catch (error) {
    throw createAdminPushError(
      'VAPID_PUBLIC_KEY_INVALID',
      'The frontend VAPID public key is invalid and could not be decoded.',
      { cause: error.message }
    );
  }

  if (applicationServerKey.length !== 65) {
    throw createAdminPushError(
      'VAPID_PUBLIC_KEY_INVALID',
      `The frontend VAPID public key decoded to ${applicationServerKey.length} bytes instead of the required 65-byte P-256 key.`
    );
  }

  return applicationServerKey;
};

const registerAdminServiceWorker = async () => {
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });

  await registration.update().catch(() => {});
  return navigator.serviceWorker.ready;
};

const normalizeSubscriptionError = (error, environment) => {
  const name = String(error?.name || '');
  const message = String(error?.message || '').trim();
  const lowerMessage = message.toLowerCase();

  if (error?.code === 'VAPID_PUBLIC_KEY_INVALID' || error?.code === 'VAPID_PUBLIC_KEY_MISSING') {
    return error;
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return createAdminPushError(
      'NOTIFICATION_PERMISSION_BLOCKED',
      'Notifications are blocked for this site or browser. Allow notifications, then try again.',
      { name, message }
    );
  }

  if (name === 'InvalidStateError') {
    return createAdminPushError(
      'SERVICE_WORKER_NOT_READY',
      'The browser push worker is not active yet. Reload the page and try enabling notifications again.',
      { name, message }
    );
  }

  if (name === 'AbortError' && lowerMessage.includes('push service error')) {
    if (environment.installRequired) {
      return createAdminPushError(
        'INSTALL_REQUIRED',
        'This Apple device can only enable Web Push from the installed Admin App. Use Add to Home Screen, open the app from there, then try again.',
        { name, message }
      );
    }

    return createAdminPushError(
      'PUSH_SERVICE_UNAVAILABLE',
      environment.isMacOs
        ? `This browser could not register with its push service (${name}: ${message}). On macOS, confirm browser notifications are allowed for this site and use a browser with working Web Push support.`
        : `This browser could not register with its push service (${name}: ${message}).`,
      { name, message }
    );
  }

  if (message) {
    return createAdminPushError('PUSH_SUBSCRIPTION_FAILED', `${name || 'Push error'}: ${message}`, {
      name,
      message,
    });
  }

  return createAdminPushError(
    'PUSH_SUBSCRIPTION_FAILED',
    'The browser could not create a Web Push subscription.',
    { name }
  );
};

const enableAdminPush = async () => {
  const environment = getAdminPushEnvironment();

  if (environment.installRequired) {
    throw createAdminPushError(
      'INSTALL_REQUIRED',
      'This Apple device can only enable Web Push from the installed Admin App. Use Add to Home Screen, open the app from there, then try again.'
    );
  }

  if (!window.isSecureContext) {
    throw createAdminPushError(
      'SECURE_CONTEXT_REQUIRED',
      'Web Push requires HTTPS or localhost. This page is not running in a secure context.'
    );
  }

  if (!('Notification' in window)) {
    throw createAdminPushError(
      'NOTIFICATIONS_API_UNAVAILABLE',
      'This browser does not expose the Notifications API.'
    );
  }

  if (!('serviceWorker' in navigator)) {
    throw createAdminPushError(
      'SERVICE_WORKER_UNAVAILABLE',
      'This browser does not support service workers, so Web Push cannot be enabled.'
    );
  }

  if (!('PushManager' in window)) {
    throw createAdminPushError(
      'PUSH_API_UNAVAILABLE',
      'This browser does not expose the Push API in the current context.'
    );
  }

  const applicationServerKey = validateApplicationServerKey();
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw createAdminPushError(
      permission === 'denied' ? 'NOTIFICATION_PERMISSION_BLOCKED' : 'NOTIFICATION_PERMISSION_NOT_GRANTED',
      permission === 'denied'
        ? 'Notifications are blocked. Allow them in this site or browser settings and try again.'
        : 'Notification permission was not granted.'
    );
  }

  let registration;

  try {
    registration = await registerAdminServiceWorker();
  } catch (error) {
    throw createAdminPushError(
      'SERVICE_WORKER_REGISTRATION_FAILED',
      `The push service worker could not be registered (${error?.name || 'Error'}: ${error?.message || 'Unknown error'}).`,
      {
        name: error?.name || '',
        message: error?.message || '',
      }
    );
  }

  const existingSubscription = await registration.pushManager.getSubscription();

  try {
    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }));

    return {
      subscription,
      payload: {
        subscription: subscription.toJSON(),
        platform: getPlatform(),
        deviceLabel: getDeviceLabel(),
        userAgent: navigator.userAgent,
      },
    };
  } catch (error) {
    throw normalizeSubscriptionError(error, environment);
  }
};

export {
  createAdminPushError,
  enableAdminPush,
  getAdminPushEnvironment,
  getExistingPushSubscription,
  normalizeSubscriptionError,
  urlBase64ToUint8Array,
};
