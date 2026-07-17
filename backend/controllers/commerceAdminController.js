import InventoryEvent from '../models/inventoryEventModel.js';
import Product from '../models/productModel.js';
import ShippingRate from '../models/shippingRateModel.js';
import TaxRule from '../models/taxRuleModel.js';
import { Coupon, GiftCard } from '../models/promotionModel.js';
import {
  SRI_LANKA_COUNTRY_CODE,
  SRI_LANKA_COUNTRY_NAME,
  normalizeLocationCode,
  resolveCountryCode,
  resolveCountryName,
} from '../utils/shippingLocations.js';

const toMoneyNumber = (value, label) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be a valid amount`);
  }

  return number;
};

const titleCaseLocation = (value = '') =>
  String(value || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildShippingRatePayload = (body = {}) => {
  const locationType = body.locationType === 'domestic' ? 'domestic' : 'international';
  const carrier = String(body.carrier || 'Apex Logistics').trim();
  const basePrice = toMoneyNumber(body.basePrice, 'Shipping fee');
  const freeShippingThreshold = Number(body.freeShippingThreshold || 0);
  const estimatedDaysMin = Number(body.estimatedDaysMin ?? 3);
  const estimatedDaysMax = Number(body.estimatedDaysMax ?? 5);

  if (!Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0) {
    throw new Error('Free shipping threshold must be a valid amount');
  }

  if (!Number.isFinite(estimatedDaysMin) || !Number.isFinite(estimatedDaysMax)) {
    throw new Error('Estimated delivery days must be valid numbers');
  }

  const countryCode =
    locationType === 'domestic'
      ? SRI_LANKA_COUNTRY_CODE
      : resolveCountryCode({
          country: body.countryName || body.country,
          countryCode: body.countryCode,
        }) || String(body.countryCode || '').trim().toUpperCase().slice(0, 2);
  const countryName =
    locationType === 'domestic'
      ? SRI_LANKA_COUNTRY_NAME
      : String(
          body.countryName ||
            resolveCountryName({ country: body.country || body.countryName, countryCode }) ||
            ''
        ).trim();
  const district =
    locationType === 'domestic'
      ? normalizeLocationCode(body.district || body.state)
      : '';
  const districtLabel = titleCaseLocation(district);
  const service = String(
    body.service ||
      (locationType === 'domestic'
        ? `${districtLabel} District Delivery`
        : `${countryName} International Shipping`)
  ).trim();

  if (!carrier || !service) {
    throw new Error('Carrier and service are required');
  }

  if (locationType === 'domestic' && !district) {
    throw new Error('District is required for Sri Lanka shipping rates');
  }

  if (locationType === 'international' && (!countryCode || !countryName)) {
    throw new Error('Country is required for international shipping rates');
  }

  return {
    locationType,
    carrier,
    service,
    country: countryCode,
    countryCode,
    countryName,
    state: locationType === 'domestic' ? district : '',
    district,
    basePrice,
    freeShippingThreshold,
    estimatedDaysMin: Math.max(0, estimatedDaysMin),
    estimatedDaysMax: Math.max(estimatedDaysMin, estimatedDaysMax),
    isActive: body.isActive !== false,
  };
};

const getInventoryEvents = async (req, res) => {
  try {
    const { productId = '', type = '' } = req.query;
    const filter = {
      ...(productId ? { product: productId } : {}),
      ...(type ? { type } : {}),
    };
    const events = await InventoryEvent.find(filter)
      .populate('product', 'name sku countInStock reservedStock lowStockThreshold')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json(events);
  } catch (error) {
    console.error('[commerceAdminController:getInventoryEvents]', error);
    res.status(500).json({ message: 'Unable to load inventory events right now' });
  }
};

const getLowStockProducts = async (_req, res) => {
  try {
    const products = await Product.find({ isActive: { $ne: false } }).sort({ countInStock: 1 });
    const lowStockProducts = products.filter((product) => {
      const available = Number(product.countInStock || 0) - Number(product.reservedStock || 0);
      return available <= Number(product.lowStockThreshold ?? 10);
    });

    res.json(lowStockProducts);
  } catch (error) {
    console.error('[commerceAdminController:getLowStockProducts]', error);
    res.status(500).json({ message: 'Unable to load low-stock products right now' });
  }
};

const listCoupons = async (_req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });
  res.json(coupons);
};

const upsertCoupon = async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const coupon = await Coupon.findOneAndUpdate(
    { code },
    { ...req.body, code },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(coupon);
};

const listGiftCards = async (_req, res) => {
  const giftCards = await GiftCard.find({}).sort({ createdAt: -1 });
  res.json(giftCards);
};

const upsertGiftCard = async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ message: 'Gift card code is required' });
  }

  const initialBalance = Number(req.body.initialBalance ?? req.body.balance ?? 0);
  const giftCard = await GiftCard.findOneAndUpdate(
    { code },
    {
      ...req.body,
      code,
      initialBalance,
      balance: Number(req.body.balance ?? initialBalance),
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(giftCard);
};

const listTaxRules = async (_req, res) => {
  const rules = await TaxRule.find({}).sort({ country: 1, state: 1 });
  res.json(rules);
};

const upsertTaxRule = async (req, res) => {
  const country = String(req.body.country || '').trim().toUpperCase();
  const state = String(req.body.state || '').trim().toUpperCase();

  if (!country) {
    return res.status(400).json({ message: 'Country is required' });
  }

  const rule = await TaxRule.findOneAndUpdate(
    { country, state },
    { ...req.body, country, state },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json(rule);
};

const listShippingRates = async (_req, res) => {
  const rates = await ShippingRate.find({}).sort({
    locationType: 1,
    countryName: 1,
    district: 1,
    basePrice: 1,
  });
  res.json(rates);
};

const upsertShippingRate = async (req, res) => {
  try {
    const payload = buildShippingRatePayload(req.body);
    const rate = req.body._id
      ? await ShippingRate.findByIdAndUpdate(req.body._id, payload, {
          new: true,
          runValidators: true,
        })
      : await ShippingRate.findOneAndUpdate(
          {
            locationType: payload.locationType,
            countryCode: payload.countryCode,
            district: payload.district,
          },
          payload,
          { new: true, upsert: true, runValidators: true }
        );

    if (!rate) {
      return res.status(404).json({ message: 'Shipping rate not found' });
    }

    res.status(201).json(rate);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Unable to save shipping rate' });
  }
};

const toggleShippingRate = async (req, res) => {
  const isActive = req.body.isActive !== false;
  const rate = await ShippingRate.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  );

  if (!rate) {
    return res.status(404).json({ message: 'Shipping rate not found' });
  }

  res.json(rate);
};

const deleteShippingRate = async (req, res) => {
  const rate = await ShippingRate.findByIdAndDelete(req.params.id);

  if (!rate) {
    return res.status(404).json({ message: 'Shipping rate not found' });
  }

  res.json({ message: 'Shipping rate deleted' });
};

export {
  getInventoryEvents,
  getLowStockProducts,
  listCoupons,
  upsertCoupon,
  listGiftCards,
  upsertGiftCard,
  listTaxRules,
  upsertTaxRule,
  listShippingRates,
  toggleShippingRate,
  deleteShippingRate,
  upsertShippingRate,
};
