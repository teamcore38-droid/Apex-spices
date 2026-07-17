import { COUNTRY_DIAL_CODES } from './countries';

export const SRI_LANKA_COUNTRY_CODE = 'LK';

export const SRI_LANKA_DISTRICTS = [
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

export const COUNTRY_OPTIONS = COUNTRY_DIAL_CODES.map((country) => ({
  value: country.iso2,
  label: `${country.name} (${country.iso2})`,
  name: country.name,
  iso2: country.iso2,
}));

const normalize = (value = '') => String(value || '').trim().toLowerCase();

export const getCountryOptionByCode = (countryCode = '') =>
  COUNTRY_OPTIONS.find((country) => country.iso2 === String(countryCode || '').trim().toUpperCase()) || null;

export const resolveCountryOption = ({ country = '', countryCode = '' } = {}) => {
  const byCode = getCountryOptionByCode(countryCode);

  if (byCode) {
    return byCode;
  }

  const normalizedCountry = normalize(country);
  return (
    COUNTRY_OPTIONS.find(
      (option) => normalize(option.name) === normalizedCountry || normalize(option.iso2) === normalizedCountry
    ) || null
  );
};

export const isSriLankaCountry = (country = '', countryCode = '') => {
  const option = resolveCountryOption({ country, countryCode });
  const normalizedCountry = normalize(country);

  return (
    option?.iso2 === SRI_LANKA_COUNTRY_CODE ||
    normalizedCountry === 'sri lanka' ||
    normalizedCountry === 'lk' ||
    normalizedCountry === 'lka'
  );
};
