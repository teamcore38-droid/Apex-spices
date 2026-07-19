import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import OrderItemReviewForm from '../components/OrderItemReviewForm';
import {
  getCustomerContactDetails,
  getShippingAddressLines,
} from '../utils/orderUi';
import {
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
} from '../utils/orderStatus';

const OrderSuccessPage = () => {
  const { id: routeOrderId } = useParams();
  const [searchParams] = useSearchParams();
  const { state, pathname, search } = useLocation();
  const { userInfo, logout } = useAuth();
  const navigate = useNavigate();
  const id = routeOrderId || searchParams.get('orderId') || state?.order?._id || '';
  const missingOrderId = !id;

  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order && !missingOrderId);
  const [error, setError] = useState('');

  useEffect(() => {
    const hasReviewMetadata = order?.orderItems?.some(
      (item) => item.review || item.reviewEligible !== undefined
    );

    if (order && order.isPaid && hasReviewMetadata) {
      return;
    }

    if (missingOrderId) {
      return;
    }

    if (!userInfo?.token) {
      navigate(`/login?redirect=${pathname}${search}`);
      return;
    }

    let isMounted = true;
    let pollTimer = null;

    const fetchOrder = async () => {
      try {
        const { data } = await axios.get(`/api/orders/${id}`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        if (isMounted) {
          setOrder(data);
          setLoading(false);
          
          // Poll again in 2.5 seconds if still pending verification
          if (!data.isPaid) {
            pollTimer = setTimeout(fetchOrder, 2500);
          }
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (fetchError.response?.status === 401) {
          const msg = fetchError.response?.data?.message || '';
          if (msg.toLowerCase().includes('token')) {
            logout();
            navigate(`/login?redirect=${pathname}${search}`);
            return;
          }
        }
        if (isMounted) {
          setError(fetchError.response?.data?.message || fetchError.message);
          setLoading(false);
        }
      }
    };

    if (order) {
      // Give the backend webhook 1.5 seconds to write to the DB before fetching
      pollTimer = setTimeout(fetchOrder, 1500);
    } else {
      fetchOrder();
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [id, missingOrderId, navigate, pathname, search, userInfo, logout, order]);

  const isConfirmation = pathname.includes('confirm') || pathname.includes('thank-you');

  const status = order?.orderStatus || 'Processing';
  const shippingLines = useMemo(
    () => getShippingAddressLines(order?.shippingAddress, order?.user),
    [order]
  );
  const customerContact = useMemo(
    () => getCustomerContactDetails(order || {}, userInfo || {}),
    [order, userInfo]
  );
  const orderCurrency = order?.currency || 'LKR';

  const markOrderItemReviewed = (orderId, productId, review) => {
    setOrder((currentOrder) => {
      if (!currentOrder || String(currentOrder._id) !== String(orderId)) {
        return currentOrder;
      }

      return {
        ...currentOrder,
        orderItems: (currentOrder.orderItems || []).map((item) => {
          const itemProductId = item.product?._id || item.product;

          if (String(itemProductId) !== String(productId)) {
            return item;
          }

          return {
            ...item,
            review,
            reviewEligible: false,
          };
        }),
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f7f9fc]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent"></div>
        <p className="mt-4 font-serif text-lg text-brand-dark">Retrieving your order details...</p>
      </div>
    );
  }

  if (error || missingOrderId || !order) {
    const isAuthError = error === 'Not authorized to view this order';
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 shadow-sm">
          <h2 className="text-2xl font-serif font-bold text-brand-dark">
            {isAuthError ? 'Access Restricted' : 'Unable to Load Order'}
          </h2>
          <p className="mt-4 text-sm leading-7 text-gray-600">
            {isAuthError
              ? 'You are not authorized to view this order. If this was a guest checkout, please use the Track Order page with your email to view it.'
              : error || 'The order confirmation link is missing an order ID.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isAuthError ? (
              <Link
                to={`/track-order?orderId=${id}`}
                className="inline-flex items-center justify-center rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
              >
                Go to Track Order
              </Link>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-md bg-brand-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
              >
                Go to Homepage
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-5xl">
        {!isConfirmation && (
          <div className="mb-6">
            <Link
              to="/profile?tab=orders"
              className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
            >
              &larr; Back to My Orders
            </Link>
          </div>
        )}

        <div className="apex-hero-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="apex-hero-eyebrow">
                {isConfirmation ? 'Order Confirmed' : 'Order Details'}
              </p>
              <h1 className="apex-hero-title">
                {isConfirmation ? 'Your premium order is confirmed' : 'Track your order details'}
              </h1>
              <p className="apex-hero-copy">
                {isConfirmation
                  ? `Thank you for your purchase, ${customerContact.fullName}. Your order is now moving into careful fulfillment.`
                  : 'Review fulfillment progress, payment details, delivery notes, and your complete order summary from one place.'}
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 sm:h-16 sm:w-16">
              {isConfirmation ? <CheckCircle2 size={32} /> : <Package size={32} />}
            </div>
          </div>
        </div>

        <div className="apex-section-gap overflow-hidden rounded-[32px] bg-white shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div className="space-y-8">
              <section className="rounded-[28px] border border-gray-100 bg-[#fafbfd] p-5">
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-gray-200 bg-white px-4 py-2 font-mono text-xs font-bold text-brand-primary">
                    Order ID: {order._id}
                  </span>
                  <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-brand-dark">
                    {new Date(order.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusBadgeClass(status)}`}>
                    {status}
                  </span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(order)}`}>
                    {getPaymentLabel(order)}
                  </span>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(order.isDelivered, status)}`}>
                    {getDeliveryLabel(order.isDelivered, status)}
                  </span>
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="border-b border-gray-100 pb-4 font-serif text-2xl font-bold text-brand-dark">
                  Ordered Items
                </h2>
                <div className="mt-6 space-y-4">
                  {order.orderItems.map((item, index) => (
                    <article
                      key={`${item.product || item.name}-${index}`}
                      className="rounded-[24px] border border-gray-100 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                          <div>
                            <h3 className="font-serif text-xl font-bold text-brand-dark">{item.name}</h3>
                            <p className="text-sm text-gray-500">
                              Qty: {item.qty} | {formatCurrency(item.price, orderCurrency)} each
                            </p>
                          </div>
                        </div>
                        <p className="font-serif text-xl font-bold text-brand-primary">
                          {formatCurrency(item.qty * item.price, orderCurrency)}
                        </p>
                      </div>
                      <OrderItemReviewForm
                        item={item}
                        orderId={order._id}
                        token={userInfo?.token}
                        onSubmitted={markOrderItemReviewed}
                      />
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-light p-3 text-brand-primary">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Customer</p>
                    <h2 className="font-serif text-2xl font-bold text-brand-dark">Contact information</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4 text-sm text-gray-600">
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Full Name</p>
                    <p className="mt-2 font-semibold text-brand-dark">{customerContact.fullName}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Email</p>
                    <p className="mt-2 break-all font-semibold text-brand-dark">{customerContact.email}</p>
                  </div>
                  <div className="rounded-2xl bg-brand-light p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Phone</p>
                    <p className="mt-2 font-semibold text-brand-dark">{customerContact.phone}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-light p-3 text-brand-primary">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Shipping Address</p>
                    <h2 className="font-serif text-2xl font-bold text-brand-dark">Delivery destination</h2>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-brand-light p-4 text-sm leading-7 text-gray-600">
                  {shippingLines.length > 0 ? (
                    shippingLines.map((line) => <p key={line}>{line}</p>)
                  ) : (
                    <p>No shipping address available.</p>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-brand-light p-3 text-brand-primary">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">Payment & Totals</p>
                    <h2 className="font-serif text-2xl font-bold text-brand-dark">Order summary</h2>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Items subtotal</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(order.itemsPrice || 0, orderCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(order.shippingPrice || 0, orderCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(order.taxPrice || 0, orderCurrency)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed pt-4 font-serif text-xl font-bold text-brand-dark">
                    <span>Total</span>
                    <span className="text-brand-primary">{formatCurrency(order.totalPrice || 0, orderCurrency)}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-brand-light p-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2 text-brand-dark">
                    <Calendar size={16} />
                    <span className="font-semibold">Payment Method:</span>
                    <span>{order.paymentMethod || 'Credit Card (Simulated)'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    <span>Provider: {order.paymentProvider || 'Manual'}</span>
                    <span>Status: {getPaymentLabel(order)}</span>
                    {order.paidAt && (
                      <span>
                        Paid:{' '}
                        {new Date(order.paidAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-md bg-brand-primary px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            <ShoppingBag size={18} className="mr-2" /> Continue Shopping
          </Link>
          <Link
            to="/profile?tab=orders"
            className="inline-flex items-center justify-center rounded-md border border-brand-primary/20 px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
          >
            {isConfirmation ? 'View Order History' : 'Back to My Orders'} <ArrowRight size={16} className="ml-2" />
          </Link>
          <Link
            to={`/orders/${order._id}/invoice`}
            className="inline-flex items-center justify-center rounded-md border border-brand-primary/20 px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
          >
            View Invoice
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
