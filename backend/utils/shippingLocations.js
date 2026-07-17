const SRI_LANKA_COUNTRY_CODE = 'LK';
const SRI_LANKA_COUNTRY_NAME = 'Sri Lanka';

const SRI_LANKA_DISTRICTS = [
  'Ampara',
  'Anuradhapura',
  'Badulla',
  'Batticaloa',
  'Colombo',
  'Galle',
  'Gampaha',
  'Hambantota',
  'Jaffna',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Kilinochchi',
  'Kurunegala',
  'Mannar',
  'Matale',
  'Matara',
  'Monaragala',
  'Mullaitivu',
  'Nuwara Eliya',
  'Polonnaruwa',
  'Puttalam',
  'Ratnapura',
  'Trincomalee',
  'Vavuniya',
];

const COUNTRY_NAME_TO_CODE = {
  'sri lanka': 'LK',
  lanka: 'LK',
  lk: 'LK',
  lka: 'LK',
  'united states': 'US',
  'united states of america': 'US',
  usa: 'US',
  'u.s.a.': 'US',
  'u.s.': 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  england: 'GB',
  australia: 'AU',
  india: 'IN',
  canada: 'CA',
  'united arab emirates': 'AE',
  uae: 'AE',
  singapore: 'SG',
  malaysia: 'MY',
  maldives: 'MV',
  germany: 'DE',
  france: 'FR',
  italy: 'IT',
  japan: 'JP',
  china: 'CN',
  'new zealand': 'NZ',
};

const normalizeText = (value = '') =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeKey = (value = '') => normalizeText(value).toLowerCase();

const normalizeLocationCode = (value = '') =>
  normalizeText(value)
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const resolveCountryCode = ({ country = '', countryCode = '' } = {}) => {
  const normalizedCode = normalizeText(countryCode).toUpperCase();

  if (/^[A-Z]{2}$/.test(normalizedCode)) {
    return normalizedCode;
  }

  const normalizedCountry = normalizeText(country);
  const countryKey = normalizeKey(normalizedCountry);

  if (COUNTRY_NAME_TO_CODE[countryKey]) {
    return COUNTRY_NAME_TO_CODE[countryKey];
  }

  if (/^[A-Z]{2}$/i.test(normalizedCountry)) {
    return normalizedCountry.toUpperCase();
  }

  return '';
};

const resolveCountryName = ({ country = '', countryCode = '' } = {}) => {
  const code = resolveCountryCode({ country, countryCode });

  if (code === SRI_LANKA_COUNTRY_CODE) {
    return SRI_LANKA_COUNTRY_NAME;
  }

  return normalizeText(country) || code;
};

const isSriLankaDestination = (destination = {}) =>
  resolveCountryCode(destination) === SRI_LANKA_COUNTRY_CODE;

const resolveDistrict = (shippingAddress = {}) =>
  normalizeLocationCode(
    shippingAddress.district ||
      shippingAddress.state ||
      shippingAddress.city ||
      ''
  );

const resolveShippingDestination = (shippingAddress = {}) => {
  const countryCode = resolveCountryCode(shippingAddress);
  const countryName = resolveCountryName(shippingAddress);
  const domestic = countryCode === SRI_LANKA_COUNTRY_CODE;

  return {
    locationType: domestic ? 'domestic' : 'international',
    countryCode,
    countryName,
    district: domestic ? resolveDistrict(shippingAddress) : '',
  };
};

export {
  SRI_LANKA_COUNTRY_CODE,
  SRI_LANKA_COUNTRY_NAME,
  SRI_LANKA_DISTRICTS,
  isSriLankaDestination,
  normalizeLocationCode,
  normalizeText,
  resolveCountryCode,
  resolveCountryName,
  resolveDistrict,
  resolveShippingDestination,
};
