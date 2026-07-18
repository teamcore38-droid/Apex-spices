import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BadgeCheck, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import Product from '../components/Product';
import CustomSelect from '../components/CustomSelect';
import {
  PRODUCT_PAGE_SIZE,
  PRODUCT_PRICE_SORT_OPTIONS,
  SHOP_STOCK_FILTER_OPTIONS,
  normalizeProductPayload,
} from '../utils/productUi';
import { applySeo } from '../utils/seo';

const INITIAL_FILTERS = {
  keyword: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  stock: '',
  brand: '',
  rating: '',
  sort: '',
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [mobileFilters, setMobileFilters] = useState(INITIAL_FILTERS);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [facets, setFacets] = useState({ categories: [], brands: [], origins: [], availability: [], priceRange: {} });

  useEffect(() => {
    if (!mobileFilterOpen) {
      return undefined;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFilterOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((currentFilters) => {
        if (currentFilters.keyword === searchInput.trim()) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          keyword: searchInput.trim(),
        };
      });
      setPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    applySeo({
      title: 'Shop Premium Products',
      description: 'Browse Apex Link Group products across textiles, food, technology, industrial equipment, and more.',
      keywords: ['global marketplace', 'premium products', 'Apex Link Group'],
      canonicalUrl: `${window.location.origin}/products`,
      type: 'website',
    });

    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(data);
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get('/api/customer/search', {
          params: {
            ...filters,
            page,
            limit: PRODUCT_PAGE_SIZE,
          },
        });

        const payload = normalizeProductPayload(data);
        setProducts(payload.products);
        setFacets(data.facets || { categories: [], brands: [], origins: [], availability: [], priceRange: {} });
        setMeta({
          currentPage: payload.currentPage,
          totalPages: payload.totalPages,
          totalProducts: payload.totalProducts,
          hasNextPage: payload.hasNextPage,
          hasPrevPage: payload.hasPrevPage,
        });

        if (payload.currentPage !== page) {
          setPage(payload.currentPage);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load products right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters, page]);

  const updateFilter = (key, value) => {
    setError('');
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilters(INITIAL_FILTERS);
    setMobileFilters(INITIAL_FILTERS);
    setMobileFilterOpen(false);
    setMobileSearchOpen(false);
    setMobileSortOpen(false);
    setPage(1);
    setError('');
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(facets.categories?.length
      ? facets.categories.filter((facet) => facet._id).map((facet) => ({
          value: facet._id,
          label: `${facet._id} (${facet.count})`,
        }))
      : !categoriesLoading
        ? categories.map((category) => ({
            value: category.name,
            label: category.name,
          }))
        : []),
  ];
  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(facets.brands || []).filter((facet) => facet._id).map((facet) => ({
      value: facet._id,
      label: `${facet._id} (${facet.count})`,
    })),
  ];
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'keyword' && key !== 'sort' && value
  ).length;

  const openMobileFilters = () => {
    setMobileFilters(filters);
    setMobileFilterOpen(true);
  };

  const updateMobileFilter = (key, value) => {
    setMobileFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const applyMobileFilters = () => {
    setFilters((currentFilters) => ({
      ...mobileFilters,
      keyword: currentFilters.keyword,
      sort: currentFilters.sort,
    }));
    setMobileFilterOpen(false);
    setPage(1);
    setError('');
  };

  const resetMobileFilters = () => {
    setMobileFilters((currentFilters) => ({
      ...INITIAL_FILTERS,
      keyword: currentFilters.keyword,
      sort: currentFilters.sort,
    }));
  };

  const renderFilterControls = ({ values, onChange, includeSort = true, resetSlot = null }) => (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_auto] lg:items-end">
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
          Category
        </span>
        <CustomSelect
          value={values.category}
          onChange={(nextValue) => onChange('category', nextValue)}
          options={categoryOptions}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Min Price
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.minPrice}
            onChange={(event) => onChange('minPrice', event.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Max Price
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.maxPrice}
            onChange={(event) => onChange('maxPrice', event.target.value)}
            placeholder="50"
            className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
          Brand
        </span>
        <CustomSelect
          value={values.brand}
          onChange={(nextValue) => onChange('brand', nextValue)}
          options={brandOptions}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
          Availability
        </span>
        <CustomSelect
          value={values.stock}
          onChange={(nextValue) => onChange('stock', nextValue)}
          options={SHOP_STOCK_FILTER_OPTIONS}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
          Minimum Rating
        </span>
        <CustomSelect
          value={values.rating}
          onChange={(nextValue) => onChange('rating', nextValue)}
          options={[
            { value: '', label: 'Any Rating' },
            { value: '4', label: '4+ Stars' },
            { value: '3', label: '3+ Stars' },
          ]}
        />
      </label>

      {includeSort && (
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Sort
          </span>
          <CustomSelect
            value={values.sort}
            onChange={(nextValue) => onChange('sort', nextValue)}
            options={PRODUCT_PRICE_SORT_OPTIONS}
            leftIcon={<SlidersHorizontal size={18} />}
          />
        </label>
      )}

      {resetSlot}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb] pt-3 pb-16 sm:pt-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#e2e9f3] to-transparent opacity-70" />
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-multiply" />

      <div className="relative z-10 container mx-auto max-w-7xl px-4">
        <div className="rounded-[30px] bg-white p-4 shadow-[0_20px_60px_rgba(11,31,58,0.08)] sm:p-6">
          <div className="hidden flex-col gap-6 lg:flex lg:flex-row lg:items-end lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Search Products
              </span>
              <Search className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products, brands, or SKU..."
                className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-gray-600 shadow-sm outline-none transition focus:border-brand-accent"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <div className="rounded-full bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark">
              {meta.totalProducts} products found
            </div>
          </div>

          <div className="lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Shop Controls</p>
                <p className="mt-1 text-sm font-semibold text-brand-dark">{meta.totalProducts} products found</p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-brand-primary transition hover:bg-brand-light"
                aria-label="Reset filters"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((current) => !current)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] transition ${
                  mobileSearchOpen || filters.keyword
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-gray-200 bg-[#f7f9fc] text-brand-dark'
                }`}
              >
                <Search size={15} /> Search
              </button>
              <button
                type="button"
                onClick={openMobileFilters}
                className={`relative inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] transition ${
                  activeFilterCount
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-gray-200 bg-[#f7f9fc] text-brand-dark'
                }`}
              >
                <SlidersHorizontal size={15} /> Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-brand-dark">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileSortOpen((current) => !current)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] transition ${
                  mobileSortOpen || filters.sort
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-gray-200 bg-[#f7f9fc] text-brand-dark'
                }`}
              >
                Sort <ChevronDown size={15} className={mobileSortOpen ? 'rotate-180 transition' : 'transition'} />
              </button>
            </div>

            {mobileSearchOpen && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-[#f7f9fc] p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search products, brands, or SKU..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                  />
                </div>
              </div>
            )}

            {mobileSortOpen && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-[#f7f9fc] p-3">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Sort Products
                </span>
                <CustomSelect
                  value={filters.sort}
                  onChange={(nextValue) => updateFilter('sort', nextValue)}
                  options={PRODUCT_PRICE_SORT_OPTIONS}
                  leftIcon={<SlidersHorizontal size={18} />}
                />
              </div>
            )}
          </div>

          <div className="mt-6 hidden lg:block">
            {renderFilterControls({
              values: filters,
              onChange: updateFilter,
              resetSlot: (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-sm font-semibold text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  <RotateCcw size={16} className="mr-2" /> Reset
                </button>
              ),
            })}
          </div>

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
              {error}
            </div>
          ) : loading ? (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-8 lg:grid-cols-3">
              {[...Array(PRODUCT_PAGE_SIZE)].map((_, index) => (
                <div key={index} className="h-[390px] animate-pulse rounded-[18px] bg-[#f4f7fb] sm:h-[470px] sm:rounded-[28px]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-brand-accent/30 bg-[#f4f7fb] px-6 py-12 text-center">
              <p className="font-serif text-3xl font-bold text-brand-dark">No products match your filters</p>
              <p className="mt-3 text-sm text-gray-500">
                Try widening your price range, changing categories, or resetting the shop controls.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
                >
                  <RotateCcw size={16} className="mr-2" /> Reset Filters
                </button>
                <Link
                  to="/categories"
                  className="inline-flex items-center rounded-md border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  Browse Categories
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-8 lg:grid-cols-3">
                {products.map((product) => (
                  <Product key={product._id} product={product} compactOnMobile />
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-4 border-t border-[#e1e8f2] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Page <span className="font-semibold text-brand-dark">{meta.currentPage}</span> of{' '}
                  <span className="font-semibold text-brand-dark">{meta.totalPages}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!meta.hasPrevPage}
                    onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!meta.hasNextPage}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                    className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next Page
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {mobileFilterOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-brand-dark/45 backdrop-blur-[2px]"
            onClick={() => setMobileFilterOpen(false)}
            aria-label="Close filters"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-hidden rounded-t-[28px] bg-white shadow-[0_-20px_60px_rgba(11,31,58,0.22)]">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-gray-200" />
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Filter Products</p>
                <p className="mt-1 text-sm text-gray-500">Refine the shop without leaving the list.</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f9fc] text-brand-dark"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(86vh-154px)] overflow-y-auto px-5 py-5">
              {renderFilterControls({
                values: mobileFilters,
                onChange: updateMobileFilter,
                includeSort: false,
              })}
            </div>

            <div className="grid grid-cols-[0.8fr_1.2fr] gap-3 border-t border-gray-100 bg-white px-5 py-4">
              <button
                type="button"
                onClick={resetMobileFilters}
                className="rounded-xl border border-brand-primary/20 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-brand-primary"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyMobileFilters}
                className="rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto mt-20 max-w-6xl px-4">
        <div className="grid gap-6 border-t border-gray-300/50 pt-10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['100% Pure & Natural', 'No fillers, no compromise.'],
            ['Ethically Sourced', 'Relationships built directly with growers.'],
            ['Securely Packed', 'Protective, category-appropriate packaging on every order.'],
            ['Fast Delivery', 'Premium products shipped with care worldwide.'],
          ].map(([title, subtitle]) => (
            <div key={title} className="flex items-start gap-4 rounded-[24px] bg-white/70 p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-accent/30 bg-[#edf1f8]">
                <BadgeCheck className="text-brand-primary" size={20} />
              </div>
              <div>
                <h4 className="mb-1 text-sm font-bold text-[#081729]">{title}</h4>
                <p className="text-xs leading-6 text-gray-500">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
