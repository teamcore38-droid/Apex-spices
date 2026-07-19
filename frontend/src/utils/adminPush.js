const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

const urlBase64ToUint8Array = (value) => {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = window.atob(base64);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const getAdminPushEnvironment = () => ({
  supported: Boolean(
    window.isSecureContext &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
  ),
  permission: 'Notification' in window ? Notification.permission : 'unsupported',
  publicKeyConfigured: Boolean(VAPID_PUBLIC_KEY),
});

const getExistingPushSubscription = async () => {
  if (!getAdminPushEnvironment().supported) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
};

const getPlatform = () => {
  const platform = `${navigator.userAgentData?.platform || navigator.platform || ''} ${navigator.userAgent || ''}`;

  if (/android/i.test(platform)) {
    return 'android';
  }

  if (/iphone|ipad|ipod|ios/i.test(platform)) {
    return 'ios';
  }

  return 'web';
};

const getDeviceLabel = () =>
  String(navigator.userAgentData?.platform || navigator.platform || 'Web browser').slice(0, 120);

const enableAdminPush = async () => {
  const environment = getAdminPushEnvironment();

  if (!environment.supported) {
    throw new Error('Web Push is not supported in this browser or requires an installed PWA.');
  }

  if (!environment.publicKeyConfigured) {
    throw new Error('The frontend VAPID public key is not configured.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Allow them in this site\'s browser settings and try again.'
        : 'Notification permission was not granted.'
    );
  }

  await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  return {
    subscription,
    payload: {
      subscription: subscription.toJSON(),
      platform: getPlatform(),
      deviceLabel: getDeviceLabel(),
      userAgent: navigator.userAgent,
    },
  };
};

export {
  enableAdminPush,
  getAdminPushEnvironment,
  getExistingPushSubscription,
  urlBase64ToUint8Array,
};
