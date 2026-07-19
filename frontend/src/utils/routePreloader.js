const PRELOADED_ROUTES_KEY = 'apex:preloaded-routes:v1';
const MAX_STORED_ROUTES = 100;
const TRACKED_REQUEST_KEY = '__apexRoutePreloaderTracked';

let pendingApiRequests = 0;
let requestTrackingInstalled = false;
const requestListeners = new Set();
const preloadedRoutesInDocument = new Set();

const normalizeRoutePreloadKey = (pathname = '/') => {
  const normalized = `/${String(pathname || '/')}`
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '') || '/';

  if (normalized === '/shop' || normalized.startsWith('/shop/')) {
    return '/products';
  }

  if (normalized === '/account') {
    return '/profile';
  }

  return normalized;
};

const initialDocumentRouteKey = typeof window === 'undefined'
  ? '/'
  : normalizeRoutePreloadKey(window.location.pathname);

const getSessionStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

const readPreloadedRoutes = (storage = getSessionStorage()) => {
  if (!storage) {
    return [];
  }

  try {
    const routes = JSON.parse(storage.getItem(PRELOADED_ROUTES_KEY) || '[]');
    return Array.isArray(routes) ? routes.filter((route) => typeof route === 'string') : [];
  } catch {
    return [];
  }
};

const hasPreloadedRoute = (routeKey, storage = getSessionStorage()) =>
  readPreloadedRoutes(storage).includes(normalizeRoutePreloadKey(routeKey));

const shouldPreloadRoute = (routeKey, storage = getSessionStorage()) => {
  const normalizedKey = normalizeRoutePreloadKey(routeKey);
  if (preloadedRoutesInDocument.has(normalizedKey)) {
    return false;
  }

  return normalizedKey === initialDocumentRouteKey || !hasPreloadedRoute(normalizedKey, storage);
};

const markRoutePreloaded = (routeKey, storage = getSessionStorage()) => {
  const normalizedKey = normalizeRoutePreloadKey(routeKey);
  preloadedRoutesInDocument.add(normalizedKey);

  if (!storage) {
    return;
  }

  const routes = readPreloadedRoutes(storage).filter((route) => route !== normalizedKey);
  routes.push(normalizedKey);

  try {
    storage.setItem(PRELOADED_ROUTES_KEY, JSON.stringify(routes.slice(-MAX_STORED_ROUTES)));
  } catch {
    // Session storage may be unavailable in private browsing or restricted contexts.
  }
};

const notifyRequestListeners = () => {
  requestListeners.forEach((listener) => listener(pendingApiRequests));
};

const shouldTrackRequest = (config = {}) => {
  const url = String(config.url || '');
  if (!url.includes('/api/')) {
    return false;
  }

  return !/\/api\/(analytics|marketing\/events)(?:\/|\?|$)/i.test(url);
};

const installRoutePreloadRequestTracking = (axiosInstance) => {
  if (requestTrackingInstalled || !axiosInstance?.interceptors) {
    return;
  }

  requestTrackingInstalled = true;
  axiosInstance.interceptors.request.use((config) => {
    if (shouldTrackRequest(config)) {
      config[TRACKED_REQUEST_KEY] = true;
      pendingApiRequests += 1;
      notifyRequestListeners();
    }

    return config;
  });

  const settleRequest = (config) => {
    if (config?.[TRACKED_REQUEST_KEY]) {
      config[TRACKED_REQUEST_KEY] = false;
      pendingApiRequests = Math.max(0, pendingApiRequests - 1);
      notifyRequestListeners();
    }
  };

  axiosInstance.interceptors.response.use(
    (response) => {
      settleRequest(response.config);
      return response;
    },
    (error) => {
      settleRequest(error?.config);
      return Promise.reject(error);
    }
  );
};

const delay = (milliseconds, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timeoutId = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeoutId);
      resolve();
    }, { once: true });
  });

const waitForApiIdle = ({ idleMs = 180, timeoutMs = 8000, signal } = {}) =>
  new Promise((resolve) => {
    let idleTimer = null;
    let timeoutTimer = null;

    const cleanup = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
      requestListeners.delete(check);
      signal?.removeEventListener('abort', finish);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const check = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      if (pendingApiRequests === 0) {
        idleTimer = window.setTimeout(finish, idleMs);
      }
    };

    requestListeners.add(check);
    signal?.addEventListener('abort', finish, { once: true });
    timeoutTimer = window.setTimeout(finish, timeoutMs);
    check();
  });

const waitForAnimationFrames = (count = 2, signal) =>
  new Promise((resolve) => {
    let remaining = count;
    const advance = () => {
      if (signal?.aborted || remaining <= 0) {
        resolve();
        return;
      }

      remaining -= 1;
      window.requestAnimationFrame(advance);
    };

    advance();
  });

const waitForWindowLoad = (signal) => {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      window.removeEventListener('load', finish);
      signal?.removeEventListener('abort', finish);
      resolve();
    };

    window.addEventListener('load', finish, { once: true });
    signal?.addEventListener('abort', finish, { once: true });
  });
};

const isNearViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight + 180 && rect.bottom > -180;
};

const waitForImage = (image, signal) => {
  if (image.complete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      signal?.removeEventListener('abort', finish);
      resolve();
    };

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    signal?.addEventListener('abort', finish, { once: true });
  });
};

const getVisibleBackgroundUrls = (root) => {
  if (!root) {
    return [];
  }

  const urls = new Set();
  root.querySelectorAll('[style*="background-image"]').forEach((element) => {
    if (!isNearViewport(element) || window.getComputedStyle(element).display === 'none') {
      return;
    }

    const backgroundImage = window.getComputedStyle(element).backgroundImage;
    for (const match of backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (match[1] && !match[1].startsWith('data:')) {
        urls.add(match[1]);
      }
    }
  });

  return [...urls];
};

const waitForBackgroundImage = (url, signal) =>
  new Promise((resolve) => {
    const image = new Image();
    const finish = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener('abort', finish);
      resolve();
    };

    image.onload = finish;
    image.onerror = finish;
    signal?.addEventListener('abort', finish, { once: true });
    image.src = url;
    if (image.complete) finish();
  });

const waitForCriticalMedia = async (root, { timeoutMs = 4000, signal } = {}) => {
  if (!root || signal?.aborted) {
    return;
  }

  const criticalImages = [...root.querySelectorAll('img')].filter(
    (image) =>
      image.fetchPriority === 'high' ||
      image.loading === 'eager' ||
      isNearViewport(image)
  );
  const mediaReady = Promise.allSettled([
    ...criticalImages.map((image) => waitForImage(image, signal)),
    ...getVisibleBackgroundUrls(root).map((url) => waitForBackgroundImage(url, signal)),
    ...(document.fonts?.ready ? [document.fonts.ready] : []),
  ]);

  await Promise.race([mediaReady, delay(timeoutMs, signal)]);
};

export {
  PRELOADED_ROUTES_KEY,
  delay,
  hasPreloadedRoute,
  installRoutePreloadRequestTracking,
  markRoutePreloaded,
  normalizeRoutePreloadKey,
  readPreloadedRoutes,
  shouldPreloadRoute,
  shouldTrackRequest,
  waitForAnimationFrames,
  waitForApiIdle,
  waitForCriticalMedia,
  waitForWindowLoad,
};
