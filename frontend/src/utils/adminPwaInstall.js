const ADMIN_MANIFEST_HREF = '/admin.webmanifest?v=20260721';
const INSTALL_STATE_EVENT = 'admin-pwa-install-state-change';

let deferredInstallPrompt = null;
let appInstalled = false;
let defaultManifestHref = null;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const isStandaloneDisplay = () => {
  if (!isBrowser()) {
    return false;
  }

  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
    window.navigator.standalone === true
  );
};

const isIosLike = () => {
  if (!isBrowser()) {
    return false;
  }

  const platform = window.navigator.platform || '';
  const userAgent = window.navigator.userAgent || '';
  const hasTouchMac = platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/i.test(userAgent) || hasTouchMac;
};

const emitInstallStateChange = () => {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(INSTALL_STATE_EVENT, { detail: getAdminPwaInstallState() }));
};

const getManifestLink = () => {
  if (!isBrowser()) {
    return null;
  }

  return document.querySelector('link[rel="manifest"]');
};

export const ensureAdminManifest = () => {
  const manifestLink = getManifestLink();

  if (!manifestLink) {
    return;
  }

  if (!defaultManifestHref) {
    defaultManifestHref = manifestLink.getAttribute('href') || '/site.webmanifest?v=20260719';
  }

  if (manifestLink.getAttribute('href') !== ADMIN_MANIFEST_HREF) {
    manifestLink.setAttribute('href', ADMIN_MANIFEST_HREF);
  }
};

export const restoreDefaultManifest = () => {
  const manifestLink = getManifestLink();

  if (!manifestLink || !defaultManifestHref) {
    return;
  }

  if (manifestLink.getAttribute('href') === ADMIN_MANIFEST_HREF) {
    manifestLink.setAttribute('href', defaultManifestHref);
  }
};

export const getAdminPwaInstallState = () => ({
  canPrompt: Boolean(deferredInstallPrompt),
  installed: appInstalled || isStandaloneDisplay(),
  isIos: isIosLike(),
  supportsPrompt: isBrowser() && 'BeforeInstallPromptEvent' in window,
});

export const subscribeToAdminPwaInstallState = (callback) => {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = () => callback(getAdminPwaInstallState());
  const standaloneMediaQuery = window.matchMedia?.('(display-mode: standalone)');

  window.addEventListener(INSTALL_STATE_EVENT, listener);
  window.addEventListener('appinstalled', listener);
  standaloneMediaQuery?.addEventListener?.('change', listener);

  return () => {
    window.removeEventListener(INSTALL_STATE_EVENT, listener);
    window.removeEventListener('appinstalled', listener);
    standaloneMediaQuery?.removeEventListener?.('change', listener);
  };
};

export const promptAdminPwaInstall = async () => {
  ensureAdminManifest();

  if (!deferredInstallPrompt) {
    throw new Error('Install prompt is not available in this browser right now.');
  }

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  emitInstallStateChange();

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  emitInstallStateChange();

  return choice;
};

if (isBrowser()) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    emitInstallStateChange();
  });

  window.addEventListener('appinstalled', () => {
    appInstalled = true;
    deferredInstallPrompt = null;
    emitInstallStateChange();
  });
}
