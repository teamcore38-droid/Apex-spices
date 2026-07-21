import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, CreditCard, Loader2, MapPin, Phone, Search, Truck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import {
  buildOrderTimeline,
  getDisplayOrderNumber,
  getEstimatedDeliveryLabel,
  getShippingAddressLines,
  normalizeShippingAddress,
} from '../utils/orderUi';
import {
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
} from '../utils/orderStatus';
import OrderTimeline from '../components/OrderTimeline';

const TrackOrderPage = () => {
  const { userInfo } = useAuth();
  const location = useLocation();
  const resultRef = useRef(null);

  const [recentOrders, setRecentOrders] = useState([]);
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(location?.search || '');
    return {
      orderId: params.get('orderId') || '',
      email: userInfo?.email || '',
      phone: userInfo?.phone || '',
    };
  });
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [mobileLookupOpen, setMobileLookupOpen] = useState(false);

  useEffect(() => {
    if (!userInfo?.token) {
      return;
    }

    const loadRecentOrders = async () => {
      setLoadingRecent(true);

      try {
        const { data } = await axios.get('/api/orders/myorders', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        setRecentOrders(data.slice(0, 5));
        setForm((currentForm) => ({
          ...currentForm,
          email: userInfo.email || currentForm.email,
          phone: userInfo.phone || currentForm.phone,
        }));
      } catch {
        // Keep the UI resilient if recent orders fail to load.
      } finally {
        setLoadingRecent(false);
      }
    };

    loadRecentOrders();
  }, [userInfo]);

  const estimatedLabel = useMemo(() => {
    if (!result) {
      return '';
    }

    if (result.estimatedDelivery?.start && result.estimatedDelivery?.end) {
      return `${new Date(result.estimatedDelivery.start).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${new Date(result.estimatedDelivery.end).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }

    return getEstimatedDeliveryLabel(result.createdAt);
  }, [result]);

  const normalizedShippingAddress = useMemo(
    () => normalizeShippingAddress(result?.shippingAddress),
    [result]
  );
  const shippingLines = useMemo(
    () => getShippingAddressLines(result?.shippingAddress),
    [result]
  );
  const timeline = useMemo(() => buildOrderTimeline(result || {}), [result]);
  const resultCurrency = result?.currency || 'LKR';

  useEffect(() => {
    if (!result) {
      return undefined;
    }

    const isMobileLayout = window.matchMedia('(max-width: 1279px)').matches;

    if (!isMobileLayout) {
      return undefined;
    }

    const scrollTimer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [result]);

  const submitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const config = userInfo?.token
        ? {
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          }
        : undefined;

      const { data } = await axios.post('/api/orders/track', form, config);
      setMobileLookupOpen(false);
      setResult(data);
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Unable to locate tracking details.');
    } finally {
      setLoading(false);
    }
  };

  const lookupForm = (
    <>
      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <form className="mt-6 space-y-5" onSubmit={submitHandler}>
        <div>
          <label htmlFor="track-order-id" className="mb-2 block text-sm font-semibold text-brand-dark">Order ID</label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="track-order-id"
              name="orderId"
              type="text"
              required
              value={form.orderId}
              onChange={(event) => setForm((currentForm) => ({ ...currentForm, orderId: event.target.value }))}
              className="w-full min-w-0 rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
              placeholder="Paste your order ID"
            />
          </div>
        </div>

        <div>
          <label htmlFor="track-order-email" className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
          <input
            id="track-order-email"
            name="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((currentForm) => ({ ...currentForm, email: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
            placeholder="Use the email placed on the order"
          />
        </div>

        <div>
          <label htmlFor="track-order-phone" className="mb-2 block text-sm font-semibold text-brand-dark">Phone Number</label>
          <input
            id="track-order-phone"
            name="phone"
            type="text"
            value={form.phone}
            onChange={(event) => setForm((currentForm) => ({ ...currentForm, phone: event.target.value }))}
            className="w-full min-w-0 rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-brand-accent"
            placeholder="Optional alternative to email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
            loading ? 'cursor-not-allowed opacity-70' : ''
          }`}
        >
          {loading ? 'Checking Status...' : 'Track My Order'}
        </button>
      </form>
    </>
  );

  const recentOrdersPanel = userInfo ? (
    <div className="mt-8 rounded-[24px] bg-brand-light p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Recent Orders</p>
      {loadingRecent ? (
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <Loader2 size={16} className="mr-2 animate-spin" /> Loading recent orders...
        </div>
      ) : recentOrders.length === 0 ? (
        <p className="mt-4 text-sm leading-7 text-gray-600">
          Your recent orders will appear here once you place them.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {recentOrders.map((order) => (
            <button
              key={order._id}
              type="button"
              onClick={() =>
                setForm({
                  orderId: getDisplayOrderNumber(order),
                  email: userInfo.email || '',
                  phone: userInfo.phone || '',
                })
              }
              className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left transition-colors duration-200 hover:bg-[#f5f8fc]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-bold text-brand-primary">{getDisplayOrderNumber(order)}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-brand-dark">
                {formatCurrency(order.totalPrice, order.currency || 'LKR')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fc] apex-page-shell">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4">
        <div className="apex-hero-card">
          <p className="apex-hero-eyebrow">Track Order</p>
          <h1 className="apex-hero-title">Follow your shipment with confidence</h1>
          <p className="apex-hero-copy">
            Check order progress, payment status, delivery updates, and tracking details from one polished screen.
          </p>
        </div>

        <div className="apex-section-gap flex min-w-0 flex-col gap-6 xl:grid xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className={`min-w-0 rounded-[28px] bg-white p-4 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-6 ${result ? 'order-2 xl:order-none' : 'order-1 xl:order-none'}`}>
            <div className={result ? 'hidden xl:block' : 'block'}>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Tracking Lookup</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">Find your order</h2>
              {lookupForm}
              {recentOrdersPanel}
            </div>

            {result && (
              <div className="xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileLookupOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 rounded-[22px] border border-brand-accent/20 bg-brand-light px-4 py-4 text-left transition-colors duration-200 hover:border-brand-accent/40"
                  aria-expanded={mobileLookupOpen}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Tracking Lookup</p>
                    <h2 className="mt-1 font-serif text-xl font-bold text-brand-dark">Track Another Order</h2>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-brand-primary transition-transform duration-200 ${
                      mobileLookupOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    mobileLookupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="pt-5">
                      {lookupForm}
                      {recentOrdersPanel}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section
            ref={resultRef}
            className={`min-w-0 scroll-mt-24 rounded-[28px] bg-white p-4 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8 ${result ? 'order-1 xl:order-none' : 'order-2 xl:order-none'}`}
          >
            {!result ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-brand-accent/30 bg-brand-light px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-primary shadow-sm">
                  <Truck size={28} />
                </div>
                <p className="mt-6 font-serif text-3xl font-bold text-brand-dark">Tracking details will appear here</p>
                <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
                  Enter your order ID and matching email address to view fulfillment progress, payment confirmation, and dispatch notes.
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Tracking Result</p>
                    <h2 className="mt-2 break-all font-serif text-2xl font-bold text-brand-dark sm:text-3xl">
                      Order {getDisplayOrderNumber(result)}
                    </h2>
                  </div>
                  <p className="shrink-0 rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
                    Total {formatCurrency(result.totalPrice, resultCurrency)}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusBadgeClass(result.orderStatus)}`}>
                    {result.orderStatus}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(result)}`}>
                    {getPaymentLabel(result)}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(result.isDelivered, result.orderStatus)}`}>
                    {getDeliveryLabel(result.isDelivered, result.orderStatus)}
                  </span>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <div className="rounded-[24px] bg-brand-light p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Tracking Number</p>
                    <p className="mt-3 break-words font-serif text-2xl font-bold text-brand-dark">
                      {result.trackingNumber || 'Pending assignment'}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-brand-light p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Estimated Delivery</p>
                    <p className="mt-3 font-serif text-2xl font-bold text-brand-dark">{estimatedLabel}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-gray-100 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Delivery Note</p>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    {result.deliveryNote || 'No delivery note has been added yet.'}
                  </p>
                </div>

                {(result.courierName || result.trackingUrl || result.shipmentUpdates?.length > 0) && (
                  <div className="mt-5 rounded-[24px] border border-gray-100 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Courier Updates</p>
                    {result.courierName && (
                      <p className="mt-3 text-sm font-semibold text-brand-dark">
                        {result.courierName}
                        {result.trackingUrl && (
                          <a href={result.trackingUrl} target="_blank" rel="noreferrer" className="ml-3 text-brand-primary underline">
                            Track with courier
                          </a>
                        )}
                      </p>
                    )}
                    <div className="mt-4 space-y-3">
                      {(result.shipmentUpdates || []).slice().reverse().map((update, index) => (
                        <div key={`${update.occurredAt}-${index}`} className="rounded-2xl bg-brand-light p-4 text-sm">
                          <p className="font-semibold text-brand-dark">{update.status || 'Shipment update'}</p>
                          <p className="mt-1 text-gray-600">{update.message || update.location || 'Courier update recorded.'}</p>
                          <p className="mt-2 text-xs text-gray-500">
                            {update.courier || result.courierName || 'Courier'} - {new Date(update.occurredAt || update.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.cancellationRequests?.length > 0 && (
                  <div className="mt-5 rounded-[24px] border border-amber-100 bg-amber-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Cancellation Requests</p>
                    <div className="mt-3 space-y-2">
                      {result.cancellationRequests.map((request) => (
                        <div key={request._id || request.createdAt} className="text-sm text-amber-900">
                          <span className="font-semibold">{request.status}</span> - {request.reason}
                          {request.adminNote && <span> ({request.adminNote})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-gray-100 bg-[#fafbfd] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-brand-light p-3 text-brand-primary">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Contact</p>
                        <h3 className="font-serif text-2xl font-bold text-brand-dark">Delivery contact</h3>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <div className="rounded-2xl bg-brand-light p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Full Name</p>
                        <p className="mt-2 font-semibold text-brand-dark">
                          {normalizedShippingAddress.fullName || 'Available after order processing'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-brand-light p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Email</p>
                        <p className="mt-2 break-all font-semibold text-brand-dark">
                          {normalizedShippingAddress.email || 'Hidden for privacy'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-brand-light p-4">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-500" />
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Phone</p>
                        </div>
                        <p className="mt-2 break-words font-semibold text-brand-dark">
                          {normalizedShippingAddress.phone || 'Hidden for privacy'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-gray-100 bg-[#fafbfd] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-brand-light p-3 text-brand-primary">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Shipping Address</p>
                        <h3 className="font-serif text-2xl font-bold text-brand-dark">Destination</h3>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-brand-light p-4 text-sm leading-7 text-gray-600">
                      {shippingLines.length > 0 ? (
                        shippingLines.map((line) => <p key={line}>{line}</p>)
                      ) : (
                        <p>Shipping details are not available for this order yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-brand-accent" />
                    <h3 className="font-serif text-2xl font-bold text-brand-dark">Ordered Items</h3>
                  </div>
                  <div className="mt-5 space-y-4">
                    {result.items.map((item) => (
                      <article
                        key={`${item.name}-${item.image}`}
                        className="flex min-w-0 flex-col gap-4 rounded-[24px] border border-gray-100 bg-[#fafbfd] p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                          <div className="min-w-0">
                            <p className="break-words font-serif text-lg font-bold text-brand-dark sm:text-xl">{item.name}</p>
                            <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-brand-dark">{formatCurrency(item.price, resultCurrency)}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="mt-8 rounded-[24px] border border-gray-100 bg-[#fafbfd] p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-brand-light p-3 text-brand-primary">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Order Summary</p>
                      <h3 className="font-serif text-2xl font-bold text-brand-dark">Totals</h3>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-gray-600">
                    <div className="flex min-w-0 justify-between gap-4">
                      <span>Items subtotal</span>
                      <span className="shrink-0 font-semibold text-brand-dark">{formatCurrency(result.itemsPrice || 0, resultCurrency)}</span>
                    </div>
                    <div className="flex min-w-0 justify-between gap-4">
                      <span>Shipping</span>
                      <span className="shrink-0 font-semibold text-brand-dark">{formatCurrency(result.shippingPrice || 0, resultCurrency)}</span>
                    </div>
                    <div className="flex min-w-0 justify-between gap-4">
                      <span>Tax</span>
                      <span className="shrink-0 font-semibold text-brand-dark">{formatCurrency(result.taxPrice || 0, resultCurrency)}</span>
                    </div>
                    <div className="flex min-w-0 justify-between gap-4">
                      <span>Payment Provider</span>
                      <span className="min-w-0 break-words text-right font-semibold text-brand-dark">{result.paymentProvider || 'Manual'}</span>
                    </div>
                    <div className="flex min-w-0 justify-between gap-4">
                      <span>Payment Method</span>
                      <span className="min-w-0 break-words text-right font-semibold text-brand-dark">{result.paymentMethod || 'Not available'}</span>
                    </div>
                    <div className="flex min-w-0 justify-between gap-4 border-t border-dashed pt-4 font-serif text-xl font-bold text-brand-dark">
                      <span>Total</span>
                      <span className="shrink-0 text-brand-primary">{formatCurrency(result.totalPrice || 0, resultCurrency)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <OrderTimeline timeline={timeline} title="Shipment timeline" />
                </div>

                {result.canViewFullDetails && (
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      to={`/orders/${result._id}`}
                      className="inline-flex justify-center rounded-md bg-brand-primary px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
                    >
                      View Full Order Details
                    </Link>
                    <Link
                      to={`/orders/${result._id}/invoice`}
                      className="inline-flex justify-center rounded-md border border-brand-primary/20 px-5 py-3 text-center text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                    >
                      View Invoice
                    </Link>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default TrackOrderPage;
