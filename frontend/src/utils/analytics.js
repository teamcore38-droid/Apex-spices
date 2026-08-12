import axios from 'axios';

const SESSION_KEY = 'apexMarketingSessionId';
const CONSENT_KEY = 'apexCookieConsent';
const CONSENT_EVENT = 'apex:consent-updated';
const DEFAULT_META_PIXEL_ID = '969724942822685';
let consentListenerInstalled = false;
let metaPixelInitializedId = '';
let lastMetaPixelPagePath = '';

const getStoredConsent = () => {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null') || {};
  } catch {
    return {};
  }
};

const getMarketingSessionId = () => {
  const existing = localStorage.getItem(SESSION_KEY);

  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  localStorage.setItem(SESSION_KEY, next);
  return next;
};

const loadScript = (id, src, body) => {
  if (document.getElementById(id)) {
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  if (src) script.src = src;
  if (body) script.textContent = body;
  document.head.appendChild(script);
};

const getCurrentPagePath = () => `${window.location.pathname}${window.location.search}`;

const installMetaPixel = (pixelId) => {
  if (!pixelId || metaPixelInitializedId === pixelId) {
    return;
  }

  if (!window.fbq) {
    ((f, b, e, v, n, t, s) => {
      if (f.fbq) return;
      n = f.fbq = function fbq() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
  metaPixelInitializedId = pixelId;
  lastMetaPixelPagePath = getCurrentPagePath();
};

const installAdTracking = () => {
  if (!consentListenerInstalled) {
    window.addEventListener(CONSENT_EVENT, installAdTracking);
    consentListenerInstalled = true;
  }

  const consent = getStoredConsent();
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const metaPixelId = String(import.meta.env.VITE_META_PIXEL_ID || '').trim() || DEFAULT_META_PIXEL_ID;
  const tiktokPixelId = import.meta.env.VITE_TIKTOK_PIXEL_ID;
  const linkedinPartnerId = import.meta.env.VITE_LINKEDIN_PARTNER_ID;

  if (gaId && consent.analytics) {
    loadScript('ga4-loader', `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }

  if (metaPixelId && consent.marketing) {
    installMetaPixel(metaPixelId);
  }

  if (tiktokPixelId && consent.marketing) {
    loadScript('tiktok-pixel-loader', 'https://analytics.tiktok.com/i18n/pixel/events.js');
    window.ttq = window.ttq || { track: () => {}, page: () => {}, load: () => {} };
    window.ttq.load?.(tiktokPixelId);
    window.ttq.page?.();
  }

  if (linkedinPartnerId && consent.marketing) {
    window._linkedin_partner_id = linkedinPartnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(linkedinPartnerId);
    loadScript('linkedin-insight-loader', 'https://snap.licdn.com/li.lms-analytics/insight.min.js');
  }
};

const trackPageView = (pathname) => {
  const consent = getStoredConsent();

  if (window.gtag && consent.analytics) {
    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }

  if (window.fbq && consent.marketing && metaPixelInitializedId && pathname !== lastMetaPixelPagePath) {
    window.fbq('track', 'PageView');
    lastMetaPixelPagePath = pathname;
  }
};

const trackAdPlatforms = (eventName, properties = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }

  if (window.fbq) {
    const metaMap = {
      product_view: 'ViewContent',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      purchase: 'Purchase',
    };
    window.fbq('track', metaMap[eventName] || eventName, properties);
  }

  if (window.ttq?.track) {
    window.ttq.track(eventName, properties);
  }
};

const trackEvent = async (eventName, properties = {}, options = {}) => {
  const payload = {
    eventName,
    sessionId: getMarketingSessionId(),
    anonymousId: getMarketingSessionId(),
    source: 'web',
    path: window.location.pathname,
    referrer: document.referrer,
    properties,
  };

  trackAdPlatforms(eventName, properties);

  try {
    await axios.post('/api/analytics/events', payload, {
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        'x-session-id': payload.sessionId,
      },
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[analytics]', error);
    }
  }
};

export {
  getMarketingSessionId,
  installAdTracking,
  trackEvent,
  trackPageView,
};
