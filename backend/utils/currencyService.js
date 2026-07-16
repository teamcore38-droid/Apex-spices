import { getCurrencyForCountry } from './countryCurrency.js';

const BASE_CURRENCY = 'LKR';
const FALLBACK_CURRENCY = 'USD';
const SUPPORTED_PAYMENT_CURRENCIES = (process.env.PAYHERE_SUPPORTED_CURRENCIES || 'LKR,USD,EUR,GBP,AUD')
  .split(',')
  .map((currency) => currency.trim().toUpperCase())
  .filter(Boolean);
const CACHE_TTL_MS = Number(process.env.EXCHANGE_RATE_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS || 4000);
const EXCHANGE_RATE_API_URL =
  process.env.EXCHANGE_RATE_API_URL || `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`;

const STATIC_FALLBACK_RATES = {
  LKR: 1,
  USD: 0.00335,
  EUR: 0.00308,
  GBP: 0.00263,
  AUD: 0.0051,
};

let cache = {
  rates: null,
  fetchedAt: null,
  expiresAt: null,
  source: 'empty',
};
let pendingFetch = null;

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const normalizeCurrency = (currency = '') =>
  String(currency || FALLBACK_CURRENCY).trim().toUpperCase().slice(0, 3);

const resolveSupportedCurrency = (currency = '') => {
  const normalizedCurrency = normalizeCurrency(currency);
  return SUPPORTED_PAYMENT_CURRENCIES.includes(normalizedCurrency) ? normalizedCurrency : FALLBACK_CURRENCY;
};

const getSupportedCurrencyForCountry = (countryCode = '') =>
  resolveSupportedCurrency(getCurrencyForCountry(countryCode));

const normalizeRatesPayload = (payload = {}) => {
  const rates = payload.conversion_rates || payload.rates || {};
  return Object.fromEntries(
    Object.entries(rates)
      .map(([currency, rate]) => [String(currency).toUpperCase(), Number(rate)])
      .filter(([, rate]) => Number.isFinite(rate) && rate > 0)
  );
};

const hasFreshCache = () => cache.rates && cache.expiresAt && cache.expiresAt > Date.now();

const fetchLatestRates = async () => {
  if (pendingFetch) {
    return pendingFetch;
  }

  pendingFetch = (async () => {
    const response = await fetch(EXCHANGE_RATE_API_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Exchange-rate API responded with ${response.status}`);
    }

    const payload = await response.json();
    const rates = normalizeRatesPayload(payload);

    if (!rates[BASE_CURRENCY]) {
      rates[BASE_CURRENCY] = 1;
    }

    if (Object.keys(rates).length < 2) {
      throw new Error('Exchange-rate API returned an empty rates payload');
    }

    const fetchedAt = new Date();
    cache = {
      rates,
      fetchedAt,
      expiresAt: fetchedAt.getTime() + CACHE_TTL_MS,
      source: EXCHANGE_RATE_API_URL,
    };

    return cache;
  })().finally(() => {
    pendingFetch = null;
  });

  return pendingFetch;
};

const getRatesCache = async () => {
  if (hasFreshCache()) {
    return cache;
  }

  try {
    return await fetchLatestRates();
  } catch (error) {
    console.error('[currencyService:getRatesCache]', error.message);

    if (cache.rates) {
      return {
        ...cache,
        source: `${cache.source}:stale`,
      };
    }

    return {
      rates: STATIC_FALLBACK_RATES,
      fetchedAt: null,
      expiresAt: Date.now() + 60 * 60 * 1000,
      source: 'static-fallback',
    };
  }
};

const getCurrencyQuote = async ({ countryCode = '', currency = '' } = {}) => {
  const localCurrency = normalizeCurrency(currency || getCurrencyForCountry(countryCode));
  const requestedCurrency = resolveSupportedCurrency(localCurrency);
  const unsupportedCurrencyFallback = localCurrency !== requestedCurrency;

  if (requestedCurrency === BASE_CURRENCY) {
    return {
      baseCurrency: BASE_CURRENCY,
      currency: BASE_CURRENCY,
      rate: 1,
      source: 'base',
      fetchedAt: null,
      expiresAt: null,
      fallback: unsupportedCurrencyFallback,
      unsupportedCurrencyFallback,
    };
  }

  const ratesCache = await getRatesCache();
  const requestedRate = Number(ratesCache.rates?.[requestedCurrency] || 0);

  if (requestedRate > 0) {
    return {
      baseCurrency: BASE_CURRENCY,
      currency: requestedCurrency,
      rate: requestedRate,
      source: ratesCache.source,
      fetchedAt: ratesCache.fetchedAt,
      expiresAt: ratesCache.expiresAt ? new Date(ratesCache.expiresAt) : null,
      fallback: unsupportedCurrencyFallback || ratesCache.source === 'static-fallback',
      unsupportedCurrencyFallback,
    };
  }

  const fallbackRate = Number(ratesCache.rates?.[FALLBACK_CURRENCY] || STATIC_FALLBACK_RATES.USD);

  return {
    baseCurrency: BASE_CURRENCY,
    currency: FALLBACK_CURRENCY,
    rate: fallbackRate,
    source: ratesCache.source,
    fetchedAt: ratesCache.fetchedAt,
    expiresAt: ratesCache.expiresAt ? new Date(ratesCache.expiresAt) : null,
    fallback: true,
    unsupportedCurrencyFallback: true,
  };
};

const getCurrencyRate = async (currency = BASE_CURRENCY) => {
  const quote = await getCurrencyQuote({ currency });
  return quote.rate;
};

const convertFromBaseCurrency = (value, quote) => roundMoney(Number(value || 0) * Number(quote?.rate || 1));

const formatMoney = (value, currency = BASE_CURRENCY) => {
  const normalizedCurrency = normalizeCurrency(currency || BASE_CURRENCY);

  try {
    return `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(Number(value || 0))} ${normalizedCurrency}`;
  } catch {
    return `${normalizedCurrency} ${Number(value || 0).toFixed(2)}`;
  }
};

export {
  BASE_CURRENCY,
  FALLBACK_CURRENCY,
  SUPPORTED_PAYMENT_CURRENCIES,
  convertFromBaseCurrency,
  formatMoney,
  getCurrencyForCountry,
  getCurrencyQuote,
  getCurrencyRate,
  getSupportedCurrencyForCountry,
  normalizeCurrency,
  resolveSupportedCurrency,
  roundMoney,
};
