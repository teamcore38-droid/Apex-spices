import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Edit3,
  Loader2,
  Plus,
  Power,
  Save,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import { formatCurrency } from '../utils/productUi';
import {
  COUNTRY_OPTIONS,
  SRI_LANKA_COUNTRY_CODE,
  SRI_LANKA_DISTRICTS,
  getCountryOptionByCode,
} from '../utils/shippingLocations';

const EMPTY_FORM = {
  _id: '',
  locationType: 'domestic',
  district: '',
  countryCode: 'US',
  countryName: 'United States',
  basePrice: '',
  estimatedDaysMin: 3,
  estimatedDaysMax: 5,
  isActive: true,
};

const labelForDistrictCode = (code = '') =>
  String(code || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const AdminShippingPage = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const canManageCommerce = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('commerce:manage') ||
      userInfo?.permissions?.includes('*')
  );
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('domestic');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const config = userInfo?.token
    ? {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    : null;

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/admin/shipping');
      return;
    }

    if (!canManageCommerce) {
      navigate('/profile');
    }
  }, [canManageCommerce, navigate, userInfo]);

  const loadRates = async () => {
    if (!config) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await axios.get('/api/admin/commerce/shipping-rates', config);
      setRates(data);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.response?.data?.message || 'Unable to load shipping rates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo?.token && canManageCommerce) {
      const timer = window.setTimeout(() => {
        loadRates();
      }, 0);

      return () => window.clearTimeout(timer);
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageCommerce, userInfo?.token]);

  const filteredRates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rates
      .filter((rate) => (rate.locationType || 'international') === activeTab)
      .filter((rate) => {
        if (!query) {
          return true;
        }

        return [
          rate.countryName,
          rate.countryCode,
          rate.district,
          rate.service,
          rate.carrier,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });
  }, [activeTab, rates, searchTerm]);

  const domesticCount = rates.filter((rate) => rate.locationType === 'domestic').length;
  const internationalCount = rates.filter((rate) => rate.locationType === 'international').length;

  const updateForm = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const selectLocationType = (locationType) => {
    setActiveTab(locationType);
    setSearchTerm('');
    setForm({
      ...EMPTY_FORM,
      locationType,
      ...(locationType === 'domestic'
        ? { district: '' }
        : { countryCode: 'US', countryName: 'United States' }),
    });
  };

  const selectCountry = (countryCode) => {
    const country = getCountryOptionByCode(countryCode);

    if (!country) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      countryCode: country.iso2,
      countryName: country.name,
    }));
  };

  const editRate = (rate) => {
    const locationType = rate.locationType === 'domestic' ? 'domestic' : 'international';
    setActiveTab(locationType);
    setForm({
      _id: rate._id,
      locationType,
      district: labelForDistrictCode(rate.district || rate.state),
      countryCode: rate.countryCode || rate.country || 'US',
      countryName: rate.countryName || '',
      basePrice: rate.basePrice ?? '',
      estimatedDaysMin: rate.estimatedDaysMin ?? 3,
      estimatedDaysMax: rate.estimatedDaysMax ?? 5,
      isActive: rate.isActive !== false,
    });
    setSuccess('');
    setError('');
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      locationType: activeTab,
    });
    setSuccess('');
    setError('');
  };

  const saveRate = async (event) => {
    event.preventDefault();
    const amount = Number(form.basePrice);

    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid shipping fee.');
      return;
    }

    if (form.locationType === 'domestic' && !form.district) {
      setError('Select a Sri Lanka district.');
      return;
    }

    if (form.locationType === 'international' && (!form.countryCode || !form.countryName)) {
      setError('Select a country.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        '/api/admin/commerce/shipping-rates',
        {
          ...form,
          countryCode:
            form.locationType === 'domestic' ? SRI_LANKA_COUNTRY_CODE : form.countryCode,
          countryName: form.locationType === 'domestic' ? 'Sri Lanka' : form.countryName,
          basePrice: amount,
        },
        config
      );
      setSuccess('Shipping rate saved.');
      resetForm();
      await loadRates();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || 'Unable to save shipping rate.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRate = async (rate) => {
    setError('');
    setSuccess('');

    try {
      await axios.patch(
        `/api/admin/commerce/shipping-rates/${rate._id}`,
        { isActive: rate.isActive === false },
        config
      );
      setSuccess(rate.isActive === false ? 'Shipping rate enabled.' : 'Shipping rate disabled.');
      await loadRates();
    } catch (toggleError) {
      console.error(toggleError);
      setError(toggleError.response?.data?.message || 'Unable to update shipping rate.');
    }
  };

  const deleteRate = async (rate) => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`/api/admin/commerce/shipping-rates/${rate._id}`, config);
      setSuccess('Shipping rate deleted.');
      await loadRates();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.response?.data?.message || 'Unable to delete shipping rate.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-10">
      <div className="container mx-auto max-w-7xl px-4">
        <Link to="/admin" className="inline-flex items-center text-sm font-semibold text-brand-primary">
          <ArrowLeft size={16} className="mr-2" /> Back to Admin
        </Link>

        <div className="mt-6 overflow-hidden rounded-[32px] bg-brand-dark text-white shadow-[0_22px_52px_rgba(42,16,7,0.22)]">
          <div className="flex flex-col gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-accent">
                Shipping Management
              </p>
              <h1 className="mt-3 font-serif text-4xl font-bold">District and country rates</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
                Maintain Sri Lanka district fees and international country rates in LKR. Orders keep the applied shipping fee as a snapshot.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Configured</p>
              <p className="mt-2 font-serif text-3xl font-bold">
                {domesticCount + internationalCount}
              </p>
            </div>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.45fr]">
          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                {form._id ? <Edit3 size={20} /> : <Plus size={20} />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                  {form._id ? 'Edit rate' : 'Add rate'}
                </p>
                <h2 className="font-serif text-2xl font-bold text-brand-dark">
                  {activeTab === 'domestic' ? 'Sri Lanka district fee' : 'International country fee'}
                </h2>
              </div>
            </div>

            <form onSubmit={saveRate} className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f7f9fc] p-2">
                {[
                  ['domestic', 'Sri Lanka'],
                  ['international', 'International'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectLocationType(value)}
                    className={`rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] transition ${
                      activeTab === value
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-brand-dark hover:bg-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === 'domestic' ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    District
                  </span>
                  <CustomSelect
                    value={form.district}
                    onChange={(value) => updateForm('district', value)}
                    placeholder="Select district"
                    options={SRI_LANKA_DISTRICTS.map((district) => ({
                      value: district,
                      label: district,
                    }))}
                  />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Country
                  </span>
                  <CustomSelect
                    value={form.countryCode}
                    onChange={selectCountry}
                    options={COUNTRY_OPTIONS}
                    listClassName="max-h-72"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                  Shipping fee (LKR)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={(event) => updateForm('basePrice', event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-accent"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Min days
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.estimatedDaysMin}
                    onChange={(event) => updateForm('estimatedDaysMin', Number(event.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-accent"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Max days
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={form.estimatedDaysMax}
                    onChange={(event) => updateForm('estimatedDaysMax', Number(event.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-accent"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-brand-dark">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateForm('isActive', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                />
                Enable this shipping rate
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                  Save Rate
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-primary transition hover:bg-brand-light"
                >
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                  {activeTab === 'domestic' ? 'Sri Lanka Shipping Rates' : 'International Shipping Rates'}
                </p>
                <h2 className="font-serif text-2xl font-bold text-brand-dark">
                  {activeTab === 'domestic' ? `${domesticCount} districts configured` : `${internationalCount} countries configured`}
                </h2>
              </div>
              <label className="relative block min-w-0 lg:w-80">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={activeTab === 'domestic' ? 'Search districts...' : 'Search countries...'}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-11 pr-4 text-sm text-brand-dark outline-none focus:border-brand-accent"
                />
              </label>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100">
              <div className="hidden grid-cols-[1.3fr_1fr_1fr_0.8fr_1.2fr] gap-4 bg-[#f7f9fc] px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 md:grid">
                <span>{activeTab === 'domestic' ? 'District' : 'Country'}</span>
                <span>Fee</span>
                <span>Delivery</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              {filteredRates.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Truck size={32} className="mx-auto text-brand-accent" />
                  <p className="mt-3 font-serif text-xl font-bold text-brand-dark">No rates found</p>
                  <p className="mt-1 text-sm text-gray-500">Add a shipping rate or adjust your search.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredRates.map((rate) => (
                    <article
                      key={rate._id}
                      className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1.3fr_1fr_1fr_0.8fr_1.2fr] md:items-center"
                    >
                      <div>
                        <p className="font-serif text-lg font-bold text-brand-dark">
                          {activeTab === 'domestic'
                            ? labelForDistrictCode(rate.district || rate.state)
                            : rate.countryName || rate.countryCode}
                        </p>
                        <p className="text-xs uppercase tracking-[0.14em] text-gray-400">
                          {activeTab === 'domestic' ? 'Sri Lanka' : rate.countryCode}
                        </p>
                      </div>
                      <p className="font-bold text-brand-dark">{formatCurrency(rate.basePrice || 0, 'LKR')}</p>
                      <p className="text-gray-600">
                        {rate.estimatedDaysMin || 0}-{rate.estimatedDaysMax || 0} days
                      </p>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                          rate.isActive === false
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-green-50 text-green-700'
                        }`}
                      >
                        {rate.isActive === false ? 'Disabled' : 'Enabled'}
                      </span>
                      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => editRate(rate)}
                          className="inline-flex items-center rounded-full border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-primary hover:bg-brand-light"
                        >
                          <Edit3 size={13} className="mr-1" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRate(rate)}
                          className="inline-flex items-center rounded-full border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-brand-primary hover:bg-brand-light"
                        >
                          <Power size={13} className="mr-1" />
                          {rate.isActive === false ? 'Enable' : 'Disable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRate(rate)}
                          className="inline-flex items-center rounded-full border border-red-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={13} className="mr-1" /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminShippingPage;
