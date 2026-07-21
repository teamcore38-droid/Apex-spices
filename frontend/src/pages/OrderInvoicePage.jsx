import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Download, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/productUi';
import { getDisplayOrderNumber } from '../utils/orderUi';
import {
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
  getRefundBadgeClass,
} from '../utils/orderStatus';

const formatInvoiceDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not available';

const formatInvoiceDateTime = (value) => (value ? new Date(value).toLocaleString('en-US') : 'Not paid yet');

const OrderInvoicePage = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { userInfo } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdminInvoice = pathname.startsWith('/admin/');
  const backLink = isAdminInvoice ? `/admin/orders/${id}` : `/orders/${id}`;

  useEffect(() => {
    if (!userInfo?.token) {
      navigate(`/login?redirect=${pathname}`);
      return;
    }

    const fetchInvoice = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/orders/${id}/invoice`, {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });

        setInvoice(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load invoice right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, navigate, pathname, userInfo]);

  const customerLines = useMemo(() => {
    if (!invoice?.shippingAddress) {
      return [];
    }

    return [
      invoice.shippingAddress.fullName,
      invoice.shippingAddress.email,
      invoice.shippingAddress.phone,
      invoice.shippingAddress.addressLine1,
      invoice.shippingAddress.addressLine2,
      [invoice.shippingAddress.city, invoice.shippingAddress.state].filter(Boolean).join(', '),
      [invoice.shippingAddress.postalCode, invoice.shippingAddress.country].filter(Boolean).join(' '),
    ].filter(Boolean);
  }, [invoice]);

  const hasRefundInfo = Boolean(
    invoice?.refund &&
      (Number(invoice.refund.refundedAmount || 0) > 0 ||
        (invoice.refund.status && invoice.refund.status !== 'Not Refunded') ||
        invoice.refund.history?.length)
  );
  const invoiceCurrency = invoice?.currency || invoice?.totals?.currency || 'LKR';
  const displayOrderNumber = getDisplayOrderNumber(invoice);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f7f9fc]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent" />
        <p className="mt-4 font-serif text-lg text-brand-dark">Preparing invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[28px] border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">Unable to load invoice</p>
          <p className="mt-3 text-sm text-red-700">{error || 'Invoice data is unavailable.'}</p>
          <Link
            to={backLink}
            className="mt-6 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
          >
            Back to Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-print-root min-h-screen bg-[#f7f9fc] px-4 py-6 sm:py-8">
      <style>{`
        @page {
          size: A4;
          margin: 8mm;
        }

        @media print {
          html,
          body,
          #root {
            background: #ffffff !important;
            min-height: auto !important;
            width: 100% !important;
          }

          body * {
            visibility: hidden !important;
          }

          .invoice-print-root,
          .invoice-print-root * {
            visibility: visible !important;
          }

          .invoice-print-root {
            background: #ffffff !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            position: absolute !important;
            top: 0 !important;
            width: 100% !important;
          }

          .print-hidden {
            display: none !important;
          }

          .invoice-document {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-section,
          .invoice-summary-box,
          .invoice-business-box {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .invoice-items-table thead {
            display: table-header-group;
          }

          .invoice-items-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="mx-auto w-full max-w-[840px]">
        <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backLink}
            className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
          >
            &larr; Back to Order
          </Link>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-xl border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              <Printer size={14} className="mr-2" /> Print
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              <Download size={14} className="mr-2" /> Download PDF
            </button>
          </div>
        </div>

        <div className="invoice-document overflow-hidden rounded-2xl border border-gray-200 bg-white text-[13px] text-[#172033] shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
          <div className="grid gap-4 border-b border-gray-200 bg-[#fffaf2] px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-7">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-accent">Invoice / Receipt</p>
              <h1 className="mt-2 font-serif text-2xl font-bold text-brand-dark sm:text-3xl">
                {invoice.business?.name || 'APEX LINK GROUP'}
              </h1>
              <div className="mt-2 space-y-0.5 text-xs leading-5 text-gray-600">
                <p>{invoice.business?.address}</p>
                <p>{invoice.business?.email}</p>
                <p>{invoice.business?.phone}</p>
              </div>
            </div>
            <div className="rounded-xl border border-brand-accent/25 bg-white px-4 py-3 text-left sm:min-w-64 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Order Number</p>
              <p className="mt-1 break-all text-sm font-bold text-brand-dark">{displayOrderNumber}</p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Invoice Date</p>
              <p className="mt-1 text-sm font-semibold text-brand-dark">{formatInvoiceDate(invoice.createdAt)}</p>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-7">
            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <section className="invoice-section rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent">Billed To</p>
                <div className="mt-2 space-y-0.5 text-sm leading-5 text-brand-dark">
                  {customerLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </section>

              <section className="invoice-section rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent">Payment Details</p>
                <div className="mt-2 grid gap-2 text-sm text-gray-600">
                  <div className="flex justify-between gap-4">
                    <span>Method</span>
                    <span className="text-right font-semibold text-brand-dark">{invoice.payment?.method || 'Not available'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Provider</span>
                    <span className="text-right font-semibold text-brand-dark">{invoice.payment?.provider || 'Manual'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Payment Status</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${getPaymentBadgeClass(invoice.payment?.status)}`}>
                      {getPaymentLabel(invoice.payment?.status)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Paid At</span>
                    <span className="text-right font-semibold text-brand-dark">{formatInvoiceDateTime(invoice.paidAt)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Order Status</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${getOrderStatusBadgeClass(invoice.orderStatus)}`}>
                      {invoice.orderStatus}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <section className="invoice-section overflow-x-auto rounded-xl border border-gray-200">
              <table className="invoice-items-table w-full min-w-[560px] border-collapse sm:min-w-0">
                <thead>
                  <tr className="bg-[#f7f2e8] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-gray-600">
                    <th className="px-3 py-2.5">Item</th>
                    <th className="w-16 px-3 py-2.5 text-center">Qty</th>
                    <th className="w-28 px-3 py-2.5 text-right">Price</th>
                    <th className="w-32 px-3 py-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-brand-dark">
                  {(invoice.items || []).map((item) => (
                    <tr key={`${item.name}-${item.product}`}>
                      <td className="px-3 py-2.5 font-semibold">{item.name}</td>
                      <td className="px-3 py-2.5 text-center">{item.qty}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(item.price, invoiceCurrency)}</td>
                      <td className="px-3 py-2.5 text-right font-bold">{formatCurrency(item.lineTotal, invoiceCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="grid gap-4 md:grid-cols-[1fr_320px]">
              <section className="invoice-business-box rounded-xl bg-[#fffaf2] p-4 text-sm leading-6 text-gray-600">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent">Business Information</p>
                <p className="mt-2 font-bold text-brand-dark">{invoice.business?.name || 'APEX LINK GROUP'}</p>
                <p>{invoice.business?.address}</p>
                <p>{invoice.business?.email}</p>
                <p>{invoice.business?.phone}</p>
                {hasRefundInfo && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">Refund Information</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${getRefundBadgeClass(invoice.refund?.status)}`}>
                        {invoice.refund?.status || 'Not Refunded'}
                      </span>
                      <span className="font-semibold text-brand-dark">
                        {formatCurrency(invoice.refund?.refundedAmount || 0, invoiceCurrency)}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              <section className="invoice-summary-box rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-accent">Totals</p>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between gap-4">
                    <span>Items subtotal</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.totals?.subtotal || 0, invoiceCurrency)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Shipping</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.totals?.shipping || 0, invoiceCurrency)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Tax</span>
                    <span className="font-semibold text-brand-dark">{formatCurrency(invoice.totals?.tax || 0, invoiceCurrency)}</span>
                  </div>
                  {Number(invoice.totals?.discount || 0) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Discount</span>
                      <span className="font-semibold text-brand-dark">-{formatCurrency(invoice.totals.discount, invoiceCurrency)}</span>
                    </div>
                  )}
                  {Number(invoice.totals?.giftCard || 0) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Gift card</span>
                      <span className="font-semibold text-brand-dark">-{formatCurrency(invoice.totals.giftCard, invoiceCurrency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 border-t border-dashed border-gray-300 pt-3 font-serif text-xl font-bold text-brand-dark">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.totals?.total || 0, invoiceCurrency)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderInvoicePage;
