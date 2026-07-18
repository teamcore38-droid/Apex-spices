import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Mail, Menu, ShoppingBag, User, LogOut, MapPinned } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const PRIMARY_NAV_LINKS = [
  ['HOME', '/'],
  ['SHOP', '/products'],
  ['CATEGORIES', '/categories'],
  ['TRACK ORDER', '/track-order'],
  ['ABOUT', '/about'],
  ['CONTACT', '/contact'],
];

const NAV_FONT_CLASS = "[font-family:'Times_New_Roman',Times,serif]";
const SHOW_EXPERIENCE_NAV_ITEMS = false;

const CurrencySelect = ({ currency, changeCurrency, supportedCurrencies, mobile = false }) => (
  <CurrencyDropdown
    currency={currency}
    changeCurrency={changeCurrency}
    supportedCurrencies={supportedCurrencies}
    mobile={mobile}
  />
);

const CurrencyDropdown = ({ currency, changeCurrency, supportedCurrencies, mobile = false }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef(null);
  const selectedIndex = Math.max(
    supportedCurrencies.findIndex((option) => option.code === currency),
    0
  );
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), Math.max(supportedCurrencies.length - 1, 0));
  const visibleActiveIndex = open ? safeActiveIndex : selectedIndex;
  const selectedCurrency = supportedCurrencies[selectedIndex] || { code: currency, label: currency };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const chooseCurrency = (nextCurrency) => {
    changeCurrency(nextCurrency);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (open ? current + 1 : selectedIndex + 1) % supportedCurrencies.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        (open ? current - 1 + supportedCurrencies.length : selectedIndex - 1 + supportedCurrencies.length) %
        supportedCurrencies.length
      );
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) {
        chooseCurrency(supportedCurrencies[visibleActiveIndex]?.code || selectedCurrency.code);
      } else {
        setActiveIndex(selectedIndex);
        setOpen(true);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative shrink-0 ${mobile ? 'w-full' : 'hidden sm:block'}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select currency"
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        className={`group inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-2xl border border-brand-accent/35 bg-[#2b150d] px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-accent shadow-[0_10px_28px_rgba(0,0,0,0.22)] outline-none transition duration-200 hover:border-brand-accent hover:bg-[#3a1f15] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 xl:min-h-11 xl:gap-3 xl:px-4 xl:py-2.5 xl:text-sm xl:tracking-[0.14em] ${
          mobile ? 'w-full' : 'sm:w-[82px] xl:w-[92px] 2xl:w-[96px]'
        } ${NAV_FONT_CLASS}`}
      >
        <span>{selectedCurrency.label}</span>
        <ChevronDown
          size={15}
          className={`text-brand-accent transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.55rem)] z-50 w-full min-w-[128px] overflow-hidden rounded-2xl border border-brand-accent/25 bg-[#1f0e08] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.38)] transition duration-200 ${
          open
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-1 scale-95 opacity-0'
        } ${mobile ? 'left-0 right-auto' : ''}`}
      >
        <div
          role="listbox"
          aria-label="Currency options"
          aria-activedescendant={`currency-option-${supportedCurrencies[visibleActiveIndex]?.code || selectedCurrency.code}`}
          className="grid gap-1"
        >
          {supportedCurrencies.map((option, index) => {
            const selected = option.code === currency;
            const active = index === visibleActiveIndex;

            return (
              <button
                id={`currency-option-${option.code}`}
                key={option.code}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseCurrency(option.code)}
                className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold uppercase tracking-[0.14em] transition duration-150 ${NAV_FONT_CLASS} ${
                  selected
                    ? 'bg-brand-accent text-brand-dark shadow-sm'
                    : active
                    ? 'bg-white/10 text-brand-accent'
                    : 'text-brand-light hover:bg-white/10 hover:text-brand-accent'
                }`}
              >
                <span>{option.label}</span>
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Header = () => {
  const { cartItems } = useCart();
  const { userInfo, logout } = useAuth();
  const { currency, changeCurrency, supportedCurrencies } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const canAccessAdmin = Boolean(
    userInfo?.isAdmin || userInfo?.isStaff || userInfo?.permissions?.length
  );

  const handleLogout = () => {
    setAccountMenuOpen(false);
    logout();
    navigate('/');
  };

  const isActiveLink = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-dark py-3 text-brand-light shadow-md lg:py-3 xl:py-4">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-4 lg:px-4 xl:gap-4 xl:px-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 xl:gap-3">
          <img
            src="/logo.webp?v=20260716"
            alt="Apex Spices logo"
            decoding="async"
            fetchPriority="high"
            className="h-12 w-auto shrink-0 object-contain sm:h-16 lg:h-11 xl:h-12 2xl:h-16"
          />
          <div className="flex min-w-0 flex-col items-start justify-center">
            <span className="whitespace-nowrap font-serif text-lg font-bold uppercase leading-none tracking-[0.14em] text-brand-accent sm:text-xl sm:tracking-[0.18em] lg:text-lg lg:tracking-[0.1em] xl:text-xl xl:tracking-[0.16em] 2xl:text-2xl 2xl:tracking-widest">
              APEX SPICES
            </span>
            <span className="mt-1 whitespace-nowrap text-[9px] font-medium leading-none tracking-[0.18em] text-brand-accent/85 sm:text-[10px] lg:hidden xl:block">
              PREMIUM SPICES & HERBS
            </span>
          </div>
        </Link>

        <nav className={`hidden min-w-0 flex-1 items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] lg:flex xl:gap-5 xl:text-xs xl:tracking-[0.14em] 2xl:gap-7 2xl:text-sm 2xl:tracking-[0.2em] ${NAV_FONT_CLASS}`}>
          {PRIMARY_NAV_LINKS.map(([label, path]) => (
            <Link
              key={path}
              to={path}
              className={`shrink-0 whitespace-nowrap border-b-2 pb-1 transition-colors ${
                isActiveLink(path)
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent hover:text-brand-accent'
              }`}
            >
              {label}
            </Link>
          ))}
          {canAccessAdmin && (
            <Link
              to="/admin"
              className={`hidden shrink-0 whitespace-nowrap border-b-2 pb-1 transition-colors 2xl:inline-block ${
                isActiveLink('/admin')
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent hover:text-brand-accent'
              }`}
            >
              ADMIN
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-2 xl:gap-3 2xl:gap-5">
          <CurrencySelect
            currency={currency}
            changeCurrency={changeCurrency}
            supportedCurrencies={supportedCurrencies}
          />

          <Link to="/cart" className="relative inline-flex shrink-0 items-center transition-colors hover:text-brand-accent">
            <div className="relative">
              <ShoppingBag size={22} className="text-brand-accent" />
              {cartItems.length > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-brand-dark">
                  {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                </span>
              )}
            </div>
            <span className={`ml-2 hidden text-sm font-semibold uppercase tracking-wider xl:inline ${NAV_FONT_CLASS}`}>Cart</span>
          </Link>

          {userInfo ? (
            <div className="relative hidden shrink-0 lg:block">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                className={`inline-flex max-w-[150px] items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-200 hover:border-brand-accent hover:text-brand-accent xl:max-w-[180px] xl:px-4 xl:text-sm xl:tracking-[0.16em] ${NAV_FONT_CLASS}`}
              >
                <User size={18} className="mr-1.5 shrink-0 text-brand-accent xl:mr-2" />
                <span className="truncate">{userInfo.name?.split(' ')[0] || 'Account'}</span>
                <ChevronDown size={16} className="ml-1.5 shrink-0 xl:ml-2" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[24px] border border-gray-100 bg-white p-3 text-brand-dark shadow-[0_18px_40px_rgba(11,31,58,0.18)]">
                  <Link
                    to="/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> My Account
                  </Link>
                  <Link
                    to="/profile?tab=orders"
                    onClick={() => setAccountMenuOpen(false)}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                  >
                    <ShoppingBag size={16} className="mr-3 text-brand-accent" /> My Orders
                  </Link>
                  {SHOW_EXPERIENCE_NAV_ITEMS && (
                    <Link
                      to="/vendor/onboarding"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Vendor Onboarding
                    </Link>
                  )}
                  {(userInfo.isVendor || userInfo.isAdmin) && (
                    <Link
                      to="/vendor/dashboard"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Vendor Dashboard
                    </Link>
                  )}
                  {SHOW_EXPERIENCE_NAV_ITEMS && (
                    <Link
                      to="/customer-experience"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <User size={16} className="mr-3 text-brand-accent" /> Customer Experience
                    </Link>
                  )}
                  <Link
                    to="/privacy-center"
                    onClick={() => setAccountMenuOpen(false)}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                  >
                    <User size={16} className="mr-3 text-brand-accent" /> Privacy Center
                  </Link>
                  <Link
                    to="/track-order"
                    onClick={() => setAccountMenuOpen(false)}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                  >
                    <MapPinned size={16} className="mr-3 text-brand-accent" /> Track Order
                  </Link>
                  {canAccessAdmin && (
                    <Link
                      to="/admin/professional"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Professional Admin
                    </Link>
                  )}
                  {canAccessAdmin && (
                    <Link
                      to="/admin/mobile"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Mobile Admin
                    </Link>
                  )}
                  {canAccessAdmin && (
                    <Link
                      to="/admin/shipping"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Shipping Rates
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/messages"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <Mail size={16} className="mr-3 text-brand-accent" /> Messages
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/vendors"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Marketplace Ops
                    </Link>
                  )}
                  {userInfo.isAdmin && (
                    <Link
                      to="/admin/commerce"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:bg-brand-light ${NAV_FONT_CLASS}`}
                    >
                      <ShoppingBag size={16} className="mr-3 text-brand-accent" /> Commerce Ops
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`mt-2 flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-700 transition-colors duration-200 hover:bg-red-50 ${NAV_FONT_CLASS}`}
                  >
                    <LogOut size={16} className="mr-3" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
              <Link
                to="/login"
                className={`text-xs font-semibold uppercase tracking-[0.1em] transition-colors duration-200 hover:text-brand-accent xl:text-sm xl:tracking-[0.16em] ${NAV_FONT_CLASS}`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`rounded-full border border-brand-accent/30 px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand-accent transition-colors duration-200 hover:bg-brand-accent hover:text-[#081729] xl:px-3 xl:text-sm xl:tracking-[0.16em] 2xl:px-4 ${NAV_FONT_CLASS}`}
              >
                Register
              </Link>
            </div>
          )}

          <button
            className="rounded-md p-1.5 transition-colors hover:bg-white/10 lg:hidden"
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {accountMenuOpen && (
        <div className="border-t border-white/10 bg-[#060f1d] px-4 py-4 lg:hidden">
          <div className="container mx-auto space-y-3">
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
              <CurrencySelect
                mobile
                currency={currency}
                changeCurrency={changeCurrency}
                supportedCurrencies={supportedCurrencies}
              />

              {PRIMARY_NAV_LINKS.map(([label, path]) => (
                <Link
                  key={`mobile-nav-${path}`}
                  to={path}
                  onClick={() => setAccountMenuOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] transition-colors ${NAV_FONT_CLASS} ${
                    isActiveLink(path) ? 'bg-brand-accent/20 text-brand-accent' : 'hover:bg-white/10'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>

            {userInfo ? (
              <>
                <Link to="/profile" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                  My Account
                </Link>
                <Link to="/profile?tab=orders" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                  My Orders
                </Link>
                <Link to="/track-order" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                  Track Order
                </Link>
                {SHOW_EXPERIENCE_NAV_ITEMS && (
                  <Link to="/customer-experience" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Customer Experience
                  </Link>
                )}
                <Link to="/privacy-center" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                  Privacy Center
                </Link>
                {SHOW_EXPERIENCE_NAV_ITEMS && (
                  <Link to="/vendor/onboarding" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Vendor Onboarding
                  </Link>
                )}
                {(userInfo.isVendor || userInfo.isAdmin) && (
                  <Link to="/vendor/dashboard" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Vendor Dashboard
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Admin
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin/professional" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Professional Admin
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin/mobile" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Mobile Admin
                  </Link>
                )}
                {canAccessAdmin && (
                  <Link to="/admin/shipping" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Shipping Rates
                  </Link>
                )}
                {userInfo.isAdmin && (
                  <Link to="/admin/vendors" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Marketplace Ops
                  </Link>
                )}
                {userInfo.isAdmin && (
                  <Link to="/admin/messages" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                    Messages
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`block w-full rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.14em] text-red-700 ${NAV_FONT_CLASS}`}
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="grid gap-3">
                <Link to="/login" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] ${NAV_FONT_CLASS}`}>
                  Login
                </Link>
                <Link to="/register" onClick={() => setAccountMenuOpen(false)} className={`block rounded-xl border border-brand-accent/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-brand-accent ${NAV_FONT_CLASS}`}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
