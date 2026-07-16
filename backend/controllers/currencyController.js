import { getCurrencyQuote, getCurrencyForCountry } from '../utils/currencyService.js';

const getCurrencyQuoteForCountry = async (req, res) => {
  try {
    const countryCode = String(req.query.country || req.query.countryCode || '').trim().toUpperCase();
    const requestedCurrency = String(req.query.currency || '').trim().toUpperCase();
    const quote = await getCurrencyQuote({
      countryCode,
      currency: requestedCurrency || getCurrencyForCountry(countryCode),
    });

    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.json({
      countryCode,
      ...quote,
    });
  } catch (error) {
    console.error('[currencyController:getCurrencyQuoteForCountry]', error);
    res.status(500).json({ message: 'Unable to load currency quote' });
  }
};

export { getCurrencyQuoteForCountry };
