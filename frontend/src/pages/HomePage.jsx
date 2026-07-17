import { useState, useEffect } from 'react';
import axios from 'axios';
import Product from '../components/Product';
import FeaturedProductCarousel from '../components/FeaturedProductCarousel';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, Globe, Award, ChevronRight, ChevronLeft } from 'lucide-react';
import { getCategoryImageCandidates } from '../utils/categoryUi';

const fallbackCategories = [
  {
    _id: 'fallback-whole-spices',
    slug: 'whole-spices',
    name: 'Whole Spices',
    description: 'Premium hand-picked whole spices sourced from the finest global estates.',
    image:
      'https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
  {
    _id: 'fallback-ground-spices',
    slug: 'ground-spices',
    name: 'Ground Spices',
    description: 'Finely ground, aromatic spices processed under strict hygienic standards.',
    image:
      'https://images.pexels.com/photos/6784136/pexels-photo-6784136.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
  {
    _id: 'fallback-spicy-blends',
    slug: 'spicy-blends',
    name: 'Spicy Blends',
    description: 'Artisanal spice blends crafted to elevate your traditional and modern recipes.',
    image:
      'https://images.pexels.com/photos/6157053/pexels-photo-6157053.jpeg?auto=compress&cs=tinysrgb&w=1400',
  },
];

const HOME_DATA_CACHE_MS = 60 * 1000;
let cachedHomeData = null;
let homeDataRequest = null;

const fetchHomeData = async () => {
  if (cachedHomeData && Date.now() - cachedHomeData.cachedAt < HOME_DATA_CACHE_MS) {
    return cachedHomeData.data;
  }

  if (!homeDataRequest) {
    homeDataRequest = axios
      .get('/api/customer/home')
      .then(({ data }) => {
        cachedHomeData = {
          cachedAt: Date.now(),
          data,
        };
        return data;
      })
      .finally(() => {
        homeDataRequest = null;
      });
  }

  return homeDataRequest;
};

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryImageAttempts, setCategoryImageAttempts] = useState({});
  const [categoryImageFailed, setCategoryImageFailed] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isReviewPaused, setIsReviewPaused] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);

  const testimonials = [
    {
      id: 1,
      name: 'Sarah Jenkins',
      role: 'Procurement Director',
      text: 'Apex Link Group has become our single sourcing partner across three product categories. The consistency, documentation, and delivery reliability are unmatched.',
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Restaurant Group Owner',
      text: 'We source both our specialty food ingredients and our kitchen equipment through Apex Link Group. One trusted platform, premium quality across the board.',
    },
    {
      id: 3,
      name: 'Elena Rodriguez',
      role: 'Operations Manager',
      text: 'From office IT hardware to textile supplies, every order arrives exactly as specified. Their quality verification process gives us complete confidence.',
    },
  ];

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (isReviewPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isReviewPaused, testimonials.length]);



  const getCategoryCardKey = (category) =>
    category?._id || category?.slug || String(category?.name || '');

  const getCategoryCardImage = (category) => {
    const key = getCategoryCardKey(category);
    const attempt = categoryImageAttempts[key] || 0;
    const candidates = getCategoryImageCandidates(category);
    return candidates[Math.min(attempt, candidates.length - 1)];
  };

  const onCategoryImageError = (category) => {
    const key = getCategoryCardKey(category);
    const candidates = getCategoryImageCandidates(category);

    const currentAttempt = categoryImageAttempts[key] || 0;

    if (currentAttempt >= candidates.length - 1) {
      setCategoryImageFailed((previousFailed) => ({
        ...previousFailed,
        [key]: true,
      }));
      return;
    }

    setCategoryImageAttempts((previousAttempts) => ({
      ...previousAttempts,
      [key]: currentAttempt + 1,
    }));
  };

  const isCategoryImageFailed = (category) => {
    const key = getCategoryCardKey(category);
    return Boolean(categoryImageFailed[key]);
  };

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const homeData = await fetchHomeData();

        if (!isMounted) {
          return;
        }

        const nextFeaturedProducts = Array.isArray(homeData.featuredProducts)
          ? homeData.featuredProducts
          : [];
        const nextBestSellers = Array.isArray(homeData.bestSellers) ? homeData.bestSellers : [];
        let nextCategories = Array.isArray(homeData.categories) ? homeData.categories : [];

        if (nextCategories.length === 0) {
          nextCategories = fallbackCategories;
        }

        setFeaturedProducts(nextFeaturedProducts);
        setBestSellers(nextBestSellers);
        setCategories(nextCategories);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('[home] Unable to load home data', err);
        if (!isMounted) {
          return;
        }

        setFeaturedProducts([]);
        setBestSellers([]);
        setCategories(fallbackCategories);
        setError(null);
        setLoading(false);
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <div className="relative flex min-h-[88svh] items-center justify-center overflow-hidden bg-brand-dark md:h-[85vh] md:min-h-0">
        {/* Hero Background Slider */}
        {[
          {
            desktop: '/hero-background.webp',
            mobile: '/hero-background-mobile.webp',
          },
          {
            desktop: '/hero-background1.webp',
            mobile: '/hero-background-mobile1.webp',
          },
        ].map((slide, index) => {
          const isActive = activeSlide === index;
          return (
            <div
              key={index}
              className="absolute inset-0"
              style={{
                opacity: isActive ? 1 : 0,
                transition: 'opacity 1500ms ease-in-out',
              }}
            >
              {/* Desktop Background */}
              <div
                className="absolute inset-0 hidden md:block"
                style={{
                  backgroundImage: `url(${slide.desktop})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'fixed',
                  opacity: 0.55,
                }}
              />
              {/* Mobile Background */}
              <div
                className="absolute inset-0 block md:hidden"
                style={{
                  backgroundImage: `url(${slide.mobile})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.55,
                }}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-85"></div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 text-center md:py-0">
          <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.26em] text-brand-accent md:mb-4 md:text-sm md:tracking-[0.3em]">
            Organic · Fresh · Hand-Picked
          </span>
          <h1 className="mb-4 font-serif text-4xl font-bold leading-tight text-brand-light drop-shadow-lg sm:text-5xl md:mb-6 md:text-7xl">
            Elevate Your Culinary Experience
          </h1>
          <p className="mx-auto mb-7 max-w-2xl text-base font-light leading-8 text-gray-100 drop-shadow-md md:mb-10 md:text-xl">
            Sourced directly from the finest farm estates of the globe, our authentic spices bring rich flavor, natural aroma, and unparalleled quality to every dish.
          </p>
          <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:gap-4">
            <Link to="/products" className="btn-primary w-full px-6 py-3.5 text-base font-bold uppercase tracking-wider transition-transform hover:-translate-y-1 sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
              Shop Collection
            </Link>
            <Link to="/about" className="w-full border-2 border-brand-accent/70 px-6 py-3.5 text-base font-bold uppercase tracking-wider text-brand-accent transition-all hover:bg-brand-accent hover:text-brand-dark sm:w-auto sm:px-8 sm:py-4 sm:text-lg">
              Our Story
            </Link>
          </div>
        </div>
      </div>

      <div className="border-y border-brand-accent/45 bg-gradient-to-r from-[#1f0e07] via-[#3d251e] to-[#1f0e07] py-6 text-white md:py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="group rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-[1.5px] transition hover:bg-white/[0.08] md:px-4 md:py-5">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-brand-accent/55 bg-[#23120a] text-brand-accent md:mb-3 md:h-11 md:w-11">
                <Truck size={19} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#f3f6fc] md:text-sm">Free Shipping</h4>
              <p className="mt-1 text-[11px] text-[#c8d5e8] md:text-xs">On orders over $75</p>
            </div>
            <div className="group rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-[1.5px] transition hover:bg-white/[0.08] md:px-4 md:py-5">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-brand-accent/55 bg-[#23120a] text-brand-accent md:mb-3 md:h-11 md:w-11">
                <Globe size={19} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#f3f6fc] md:text-sm">100% Organic</h4>
              <p className="mt-1 text-[11px] text-[#c8d5e8] md:text-xs">Certified farm sources</p>
            </div>
            <div className="group rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-[1.5px] transition hover:bg-white/[0.08] md:px-4 md:py-5">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-brand-accent/55 bg-[#23120a] text-brand-accent md:mb-3 md:h-11 md:w-11">
                <ShieldCheck size={19} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#f3f6fc] md:text-sm">Quality Assured</h4>
              <p className="mt-1 text-[11px] text-[#c8d5e8] md:text-xs">Rigorous lab testing</p>
            </div>
            <div className="group rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center shadow-[0_10px_28px_rgba(0,0,0,0.14)] backdrop-blur-[1.5px] transition hover:bg-white/[0.08] md:px-4 md:py-5">
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-brand-accent/55 bg-[#23120a] text-brand-accent md:mb-3 md:h-11 md:w-11">
                <Award size={19} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#f3f6fc] md:text-sm">Award Winning</h4>
              <p className="mt-1 text-[11px] text-[#c8d5e8] md:text-xs">Selected flavor profiles</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#fcfaf7] py-12 md:py-14">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center md:mb-14">
            <h2 className="mb-4 font-serif text-3xl font-bold text-brand-dark md:text-5xl">Shop by Category</h2>
            <div className="mx-auto h-1 w-24 bg-brand-accent"></div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {categories.slice(0, 3).map((category) => (
              <Link key={category._id} to={`/category/${category.slug}`} className="group relative h-80 cursor-pointer overflow-hidden rounded-lg shadow-lg">
                {isCategoryImageFailed(category) ? (
                  <div className="h-full w-full bg-gradient-to-br from-[#23120a] via-[#3d251e] to-[#1f0e07]" />
                ) : (
                  <img
                    src={getCategoryCardImage(category)}
                    alt={category.name}
                    onError={() => onCategoryImageError(category)}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <div
                  className={`absolute inset-0 transition-all duration-300 ${
                    isCategoryImageFailed(category)
                      ? 'bg-black/25 group-hover:bg-black/20'
                      : 'bg-black/40 group-hover:bg-black/30'
                  }`}
                ></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
                  <h3 className="mb-2 font-serif text-3xl font-bold drop-shadow-md">{category.name}</h3>
                  <p className="max-w-xs text-sm text-white/85">{category.description}</p>
                  <span className="mt-4 translate-y-4 border-b-2 border-brand-accent pb-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Shop Now
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {!loading && categories.length === 0 && (
            <div className="rounded-xl border border-brand-accent/30 bg-white/70 px-6 py-8 text-center text-brand-primary">
              Categories will appear here once they are active in the admin dashboard.
            </div>
          )}
          <div className="mt-6 text-center">
            <Link to="/categories" className="inline-flex items-center rounded-md border-2 border-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white">
              Browse All Categories <ChevronRight size={16} className="ml-2" />
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top,_rgba(197,168,128,0.12),_transparent_58%),#fcfaf7] py-10 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center md:mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-accent">Curated Signature Picks</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-brand-dark md:text-4xl">Featured Collection</h2>
            <div className="mx-auto mt-5 h-px w-28 bg-gradient-to-r from-transparent via-brand-accent to-transparent"></div>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
              A refined rotation of our most celebrated products, chosen for exceptional quality, verified provenance, and outstanding value.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-[460px] animate-pulse rounded-[28px] border border-[#dce4ef] bg-[#eff3f9]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-6 text-center text-red-700">
              <p className="font-semibold">{error}</p>
              <Link
                to="/products"
                className="mt-4 inline-flex items-center rounded-md border border-red-300 px-5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-700 transition-colors hover:bg-red-100"
              >
                Browse All Products
              </Link>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="rounded-xl border border-brand-accent/25 bg-[#f2f5fa] px-6 py-10 text-center text-brand-primary">
              <p className="font-serif text-2xl font-bold text-brand-dark">No featured products yet</p>
              <p className="mt-2 text-sm">Explore the full marketplace while our team curates featured highlights.</p>
              <Link
                to="/products"
                className="mt-5 inline-flex items-center rounded-md border border-brand-primary px-5 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
              >
                Explore Marketplace
              </Link>
            </div>
          ) : (
            <FeaturedProductCarousel products={featuredProducts} />
          )}

          {!loading && !error && featuredProducts.length > 0 && (
            <div className="mt-10 text-center">
              <Link
                to="/products"
                className="inline-flex items-center rounded-md border border-brand-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
              >
                Explore Full Marketplace
              </Link>
            </div>
          )}
        </div>
      </div>

      {!loading && bestSellers.length > 0 && (
        <div className="bg-[#edf1f8] py-20">
          <div className="container mx-auto px-4">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-accent">Customer Favorites</p>
                <h2 className="mt-3 font-serif text-3xl font-bold text-brand-dark md:text-4xl">Best Sellers</h2>
              </div>
              <Link
                to="/products"
                className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                Shop All Products
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {bestSellers.map((product) => (
                <Product key={product._id} product={product} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#fcfaf7] py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-16 md:flex-row">
            <div className="relative md:w-1/2">
              <div className="absolute -inset-4 translate-x-4 translate-y-4 transform rounded-lg border-2 border-brand-accent"></div>
              <picture>
                <source media="(max-width: 767px)" srcSet="/about-home-bottom-mobile.webp" />
                <source media="(min-width: 768px)" srcSet="/about-home-bottom-desktop.webp" />
                <img
                  src="/about-home-bottom-desktop.webp"
                  alt="Flat lay of organic culinary spices"
                  className="relative z-10 h-[500px] w-full rounded-lg object-cover shadow-2xl"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </div>
            <div className="md:w-1/2">
              <h2 className="mb-6 font-serif text-4xl font-bold text-brand-dark md:text-5xl">Our Promise of Quality</h2>
              <div className="mb-8 h-1 w-20 bg-brand-accent"></div>
              <p className="mb-6 text-lg leading-relaxed text-gray-700">
                At Apex Spices, we believe world-class culinary experiences start with authentic ingredients. That&apos;s why every grower in our network is verified, every spice batch is tested, and every delivery meets our uncompromising standards of purity.
              </p>
              <p className="mb-10 text-lg leading-relaxed text-gray-700">
                From hand-picked Ceylon cinnamon and sun-dried black peppercorns to single-origin cardamom pods, we bring you the world&apos;s most aromatic spice collections — directly from the farm to your kitchen.
              </p>
              <Link to="/about" className="btn-outline inline-block border-brand-primary px-8 py-4 font-bold uppercase tracking-wider text-brand-primary hover:bg-brand-primary hover:text-white">
                Discover Our Story
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section
        className="relative overflow-hidden py-16 text-white md:py-20 bg-brand-dark"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/review-section-background.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.16,
          }}
        ></div>
        <div className="container relative z-10 mx-auto px-4">
          <div className="mb-4 flex items-center justify-center gap-3 text-brand-accent/90 md:mb-5">
            <span className="h-px w-10 bg-brand-accent/50 md:w-16"></span>
            <Globe size={16} />
            <span className="h-px w-10 bg-brand-accent/50 md:w-16"></span>
          </div>

          <div
            className="relative mx-auto max-w-4xl rounded-[18px] border border-brand-accent/45 bg-[#23120a]/65 px-4 py-4 shadow-[0_16px_34px_rgba(0,0,0,0.38)] backdrop-blur-[2px] sm:px-5 md:rounded-[22px] md:px-7 md:py-5"
            onMouseEnter={() => setIsReviewPaused(true)}
            onMouseLeave={() => setIsReviewPaused(false)}
          >
            <button
              onClick={prevTestimonial}
              aria-label="Previous review"
              className="absolute -left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brand-accent/70 bg-[#23120a]/85 text-brand-accent shadow-[0_0_14px_rgba(201,162,39,0.24)] transition hover:bg-brand-accent hover:text-brand-dark md:-left-5 md:h-10 md:w-10"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={nextTestimonial}
              aria-label="Next review"
              className="absolute -right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brand-accent/70 bg-[#23120a]/85 text-brand-accent shadow-[0_0_14px_rgba(201,162,39,0.24)] transition hover:bg-brand-accent hover:text-brand-dark md:-right-5 md:h-10 md:w-10"
            >
              <ChevronRight size={18} />
            </button>

            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="w-full shrink-0 px-1 text-center md:px-2">
                    <div className="mb-1 text-3xl font-serif leading-none text-brand-accent md:mb-2 md:text-4xl">
                      &ldquo;
                    </div>
                    <p className="mx-auto max-w-2xl font-serif text-base italic leading-relaxed text-[#eef2f8] md:text-xl md:leading-[1.45]">
                      {testimonial.text}
                    </p>
                    <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent md:mt-4 md:w-24"></div>

                    <div className="mt-3 flex flex-col items-center justify-center gap-2 md:mt-4 md:flex-row md:gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-accent/70 bg-[#3d251e]/70 font-serif text-sm font-bold text-brand-accent md:h-12 md:w-12 md:text-base">
                        {testimonial.name
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div className="text-center md:text-left">
                        <h4 className="font-serif text-lg font-bold text-brand-accent md:text-xl">
                          {testimonial.name}
                        </h4>
                        <p className="mt-0.5 text-xs text-brand-accent/80">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2.5 md:mt-5">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                aria-label={`Go to review ${idx + 1}`}
                className={`h-3.5 w-3.5 rounded-full border transition-all ${
                  activeTestimonial === idx
                    ? 'scale-110 border-brand-accent bg-brand-accent'
                    : 'border-white/40 bg-white/30 hover:border-brand-accent/80'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 text-brand-accent/90 md:mt-5">
            <span className="h-px w-10 bg-brand-accent/50 md:w-16"></span>
            <Globe size={16} />
            <span className="h-px w-10 bg-brand-accent/50 md:w-16"></span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
