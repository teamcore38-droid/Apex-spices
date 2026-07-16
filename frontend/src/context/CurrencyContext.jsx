/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext();
const STORAGE_KEY_PREFIX = 'apexCurrencyQuote';
const SELECTED_CURRENCY_KEY = 'apexSelectedCurrency';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const SUPPORTED_PAYMENT_CURRENCIES = [
  { code: 'LKR', label: 'LKR' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'GBP', label: 'GBP' },
  { code: 'AUD', label: 'AUD' },
];
const SUPPORTED_CURRENCY_CODES = SUPPORTED_PAYMENT_CURRENCIES.map((currency) => currency.code);

const DEFAULT_QUOTE = {
  countryCode: 'LK',
  baseCurrency: 'LKR',
  currency: 'LKR',
  rate: 1,
  fallback: false,
  cachedAt: Date.now(),
};

const USD_FALLBACK_QUOTE = {
  countryCode: 'US',
  baseCurrency: 'LKR',
  currency: 'USD',
  rate: 0.00335,
  fallback: true,
  cachedAt: Date.now(),
};

const STATIC_FALLBACK_RATES = {
  LKR: 1,
  USD: 0.00335,
  EUR: 0.00308,
  GBP: 0.00263,
  AUD: 0.0051,
};

const resolveSupportedCurrency = (currency = '') => {
  const normalizedCurrency = String(currency || '').trim().toUpperCase();
  return SUPPORTED_CURRENCY_CODES.includes(normalizedCurrency) ? normalizedCurrency : 'USD';
};

const getStorageKey = (currency) => `${STORAGE_KEY_PREFIX}:${resolveSupportedCurrency(currency)}`;

const readCachedQuote = (currency) => {
  try {
    const raw = localStorage.getItem(getStorageKey(currency));
    if (!raw) return null;

    const quote = JSON.parse(raw);
    if (!quote?.currency || !quote?.rate || Date.now() - Number(quote.cachedAt || 0) > CACHE_TTL_MS) {
      return null;
    }

    return quote;
  } catch {
    return null;
  }
};

const writeCachedQuote = (currency, quote) => {
  try {
    localStorage.setItem(
      getStorageKey(currency),
      JSON.stringify({
        ...quote,
        cachedAt: Date.now(),
      }),
    );
  } catch {
    // Local storage can fail in private browsing; pricing still works from memory.
  }
};

const normalizeCountryCode = (value) => String(value || 'LK').trim().toUpperCase().slice(0, 2) || 'LK';

const readSelectedCurrency = (preferredCurrency) => {
  try {
    const storedCurrency = localStorage.getItem(SELECTED_CURRENCY_KEY);
    if (storedCurrency) {
      return resolveSupportedCurrency(storedCurrency);
    }
  } catch {
    // Continue with the account/default currency if local storage is unavailable.
  }

  return resolveSupportedCurrency(preferredCurrency || 'LKR');
};

export const CurrencyProvider = ({ children }) => {
  const { userInfo } = useAuth();
  const countryCode = normalizeCountryCode(userInfo?.countryCode || 'LK');
  const [selectedCurrency, setSelectedCurrency] = useState(() => readSelectedCurrency(userInfo?.preferredCurrency));
  const [quote, setQuote] = useState(() => readCachedQuote(selectedCurrency) || {
    ...DEFAULT_QUOTE,
    countryCode,
    currency: selectedCurrency,
    rate: STATIC_FALLBACK_RATES[selectedCurrency] || DEFAULT_QUOTE.rate,
  });

  useEffect(() => {
    let cancelled = false;

    const syncAccountCurrency = async () => {
      await Promise.resolve();
      const hasStoredCurrency = (() => {
        try {
          return Boolean(localStorage.getItem(SELECTED_CURRENCY_KEY));
        } catch {
          return false;
        }
      })();

      if (!cancelled && !hasStoredCurrency && userInfo?.preferredCurrency) {
        setSelectedCurrency(resolveSupportedCurrency(userInfo.preferredCurrency));
      }
    };

    syncAccountCurrency();

    return () => {
      cancelled = true;
    };
  }, [userInfo?.preferredCurrency]);

  useEffect(() => {
    let cancelled = false;
    const requestedCurrency = resolveSupportedCurrency(selectedCurrency || userInfo?.preferredCurrency || 'LKR');

    const loadQuote = async () => {
      await Promise.resolve();
      const cachedQuote = readCachedQuote(requestedCurrency);

      if (cancelled) {
        return;
      }

      if (cachedQuote) {
        setQuote(cachedQuote);
        return;
      }

      setQuote({
        ...DEFAULT_QUOTE,
        countryCode,
        currency: requestedCurrency,
        rate: STATIC_FALLBACK_RATES[requestedCurrency] || DEFAULT_QUOTE.rate,
        cachedAt: Date.now(),
      });

      if (requestedCurrency === 'LKR') {
        const baseQuote = { ...DEFAULT_QUOTE, countryCode, cachedAt: Date.now() };
        setQuote(baseQuote);
        writeCachedQuote(requestedCurrency, baseQuote);
        return;
      }

      try {
        const { data } = await axios.get('/api/currency/quote', {
          params: { country: countryCode, currency: requestedCurrency },
        });

        if (!cancelled) {
          const nextQuote = {
            ...data,
            countryCode,
            rate: Number(data.rate || 1),
            cachedAt: Date.now(),
          };
          setQuote(nextQuote);
          writeCachedQuote(requestedCurrency, nextQuote);
        }
      } catch (error) {
        console.error('[CurrencyProvider]', error);
        if (!cancelled) {
          setQuote({ ...USD_FALLBACK_QUOTE, cachedAt: Date.now() });
        }
      }
    };

    loadQuote();

    return () => {
      cancelled = true;
    };
  }, [countryCode, selectedCurrency, userInfo?.preferredCurrency]);

  const changeCurrency = useCallback((nextCurrency) => {
    const supportedCurrency = resolveSupportedCurrency(nextCurrency);
    setSelectedCurrency(supportedCurrency);
    try {
      localStorage.setItem(SELECTED_CURRENCY_KEY, supportedCurrency);
    } catch {
      // Non-persistent currency switching is still fine if storage is blocked.
    }
  }, []);

  const convertPrice = useCallback(
    (value) => Math.round((Number(value || 0) * Number(quote?.rate || 1) + Number.EPSILON) * 100) / 100,
    [quote?.rate],
  );

  const formatMoney = useCallback((value, currency = quote?.currency || 'LKR') => {
    const normalizedCurrency = String(currency || 'LKR').toUpperCase();
    const amount = Number(value || 0);

    try {
      return `${new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: normalizedCurrency,
      }).format(amount)} ${normalizedCurrency}`;
    } catch {
      return `${normalizedCurrency} ${amount.toFixed(2)}`;
    }
  }, [quote?.currency]);

  const formatPrice = useCallback(
    (baseValue) => formatMoney(convertPrice(baseValue), quote?.currency || 'LKR'),
    [convertPrice, formatMoney, quote?.currency],
  );

  const value = useMemo(
    () => ({
      quote,
      countryCode,
      currency: quote?.currency || 'LKR',
      exchangeRate: Number(quote?.rate || 1),
      supportedCurrencies: SUPPORTED_PAYMENT_CURRENCIES,
      changeCurrency,
      convertPrice,
      formatMoney,
      formatPrice,
    }),
    [changeCurrency, countryCode, convertPrice, formatMoney, formatPrice, quote],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
