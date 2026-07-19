import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, Globe2, LockKeyhole, Mail, Phone, Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { COUNTRY_DIAL_CODES, COUNTRY_PHONE_LENGTHS, DEFAULT_COUNTRY_ISO2 } from '../utils/countries';

const getDialDigits = (country) => country.dialCode.replace(/\D/g, '');

const getPhoneRule = (country) => {
  const dialDigits = getDialDigits(country);
  return COUNTRY_PHONE_LENGTHS[country.iso2] || { min: 4, max: Math.max(4, 15 - dialDigits.length) };
};

const normalizeNationalPhone = (value, country) => {
  const dialDigits = getDialDigits(country);
  const digits = value.replace(/\D/g, '');
  const withoutDialCode = digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;

  return withoutDialCode.replace(/^0+/, '');
};

const formatInternationalPhone = (country, nationalNumber) =>
  nationalNumber ? `+${getDialDigits(country)}${nationalNumber}` : '';

const validatePhoneNumber = (country, nationalNumber) => {
  if (!nationalNumber) {
    return '';
  }

  const { min, max } = getPhoneRule(country);
  const expectedLength = min === max ? `${min} digits` : `${min}-${max} digits`;

  if (nationalNumber.length < min || nationalNumber.length > max) {
    return `Enter a valid ${country.name} phone number (${expectedLength} after ${country.dialCode}).`;
  }

  return '';
};

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountryIso2, setSelectedCountryIso2] = useState(DEFAULT_COUNTRY_ISO2);
  const [countrySearch, setCountrySearch] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, loginWithGoogle, userInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  const selectedCountry = useMemo(
    () =>
      COUNTRY_DIAL_CODES.find((country) => country.iso2 === selectedCountryIso2) ||
      COUNTRY_DIAL_CODES.find((country) => country.iso2 === DEFAULT_COUNTRY_ISO2) ||
      COUNTRY_DIAL_CODES[0],
    [selectedCountryIso2],
  );

  const filteredCountries = useMemo(() => {
    const searchTerm = countrySearch.trim().toLowerCase();

    if (!searchTerm) {
      return COUNTRY_DIAL_CODES;
    }

    return COUNTRY_DIAL_CODES.filter((country) =>
      `${country.name} ${country.iso2} ${country.dialCode}`.toLowerCase().includes(searchTerm),
    );
  }, [countrySearch]);

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  const submitHandler = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const phoneError = validatePhoneNumber(selectedCountry, phone);

    if (phoneError) {
      setError(phoneError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        name,
        email,
        phone: formatInternationalPhone(selectedCountry, phone),
        countryCode: selectedCountry.iso2,
        countryName: selectedCountry.name,
        password,
        confirmPassword,
      });
    } catch (registerError) {
      setError(registerError);
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setGoogleLoading(true);
    setError('');

    try {
      const result = await loginWithGoogle(credential);
      if (result?.requiresTwoFactor) {
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`, {
          state: { twoFactorChallenge: result },
        });
      }
    } catch (googleError) {
      setError(googleError);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-[#f7f9fc] pb-10 pt-5 sm:pb-12 sm:pt-7 lg:pb-14 lg:pt-8">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-xl rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(11,31,58,0.08)] border border-gray-100">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Create Your Account</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark">Join Apex Spices</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Save delivery details, revisit orders, and enjoy a more refined shopping experience.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8">
            <GoogleSignInButton
              text="signup_with"
              disabled={googleLoading || loading}
              onCredential={handleGoogleCredential}
              onError={setError}
            />
          </div>
          <div className="my-6 flex items-center gap-4 text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            <span>or register with email</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <form onSubmit={submitHandler} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Full Name</label>
                <div className="relative">
                  <User size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Country</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCountryDropdownOpen((current) => !current)}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-left text-sm text-gray-700 outline-none transition hover:border-brand-accent focus:border-brand-accent"
                    aria-expanded={countryDropdownOpen}
                  >
                    <Globe2 size={18} className="shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate">
                      {selectedCountry.name} ({selectedCountry.dialCode})
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-brand-accent transition-transform ${
                        countryDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {countryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_18px_40px_rgba(11,31,58,0.16)]">
                      <div className="relative">
                        <Search
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="search"
                          value={countrySearch}
                          onChange={(event) => setCountrySearch(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                          placeholder="Search country or code"
                          autoFocus
                        />
                      </div>

                      <div className="mt-3 max-h-64 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country) => (
                            <button
                              key={country.iso2}
                              type="button"
                              onClick={() => {
                                setSelectedCountryIso2(country.iso2);
                                setPhone((currentPhone) => normalizeNationalPhone(currentPhone, country));
                                setCountrySearch('');
                                setCountryDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-brand-light ${
                                country.iso2 === selectedCountry.iso2
                                  ? 'bg-brand-light font-semibold text-brand-primary'
                                  : 'text-gray-700'
                              }`}
                            >
                              <span className="min-w-0 flex-1 truncate">{country.name}</span>
                              <span className="shrink-0 text-xs font-bold text-brand-accent">{country.dialCode}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-5 text-center text-sm text-gray-500">No countries found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-dark">
                Phone Number <span className="font-medium text-gray-400">(optional)</span>
              </label>
              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-[#f7f9fc] transition focus-within:border-brand-accent">
                <div className="flex shrink-0 items-center gap-2 border-r border-gray-200 bg-white px-4 text-sm font-semibold text-brand-primary">
                  <Phone size={18} className="text-gray-400" />
                  <span>{selectedCountry.dialCode}</span>
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(normalizeNationalPhone(event.target.value, selectedCountry))}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-gray-700 outline-none"
                  placeholder="Enter phone number"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Enter only the local number. The country code is added automatically.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Password</label>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-12 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-brand-primary focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Confirm Password</label>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-12 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-brand-primary focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 rounded-2xl bg-brand-light px-4 py-3 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
              className="font-bold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
