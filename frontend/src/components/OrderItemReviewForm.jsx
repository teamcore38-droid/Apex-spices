import { useState } from 'react';
import axios from 'axios';
import { BadgeCheck, Loader2, MessageSquare, Star } from 'lucide-react';

const getProductId = (item = {}) => item.product?._id || item.product || '';

const OrderItemReviewForm = ({ item, orderId, token, onSubmitted }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: '', comment: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const productId = getProductId(item);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!token) {
      setMessage('Please sign in to submit a review.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { data } = await axios.post(
        `/api/reviews/product/${productId}`,
        {
          ...form,
          orderId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setForm({ rating: 5, title: '', comment: '' });
      setOpen(false);
      setMessage('Review submitted for moderation.');
      onSubmitted?.(orderId, productId, data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to submit review right now.');
    } finally {
      setSaving(false);
    }
  };

  if (!productId) {
    return null;
  }

  if (item.review) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">
          <BadgeCheck size={14} className="mr-1.5" />
          Verified Purchase
        </span>
        <span className="rounded-full border border-brand-primary/15 bg-white px-3 py-1 text-brand-primary">
          Review {item.review.status}
        </span>
      </div>
    );
  }

  if (!item.reviewEligible) {
    return null;
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setMessage('');
        }}
        className="inline-flex items-center rounded-md border border-brand-primary/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
      >
        <MessageSquare size={14} className="mr-2" />
        Write a Review
      </button>

      {message && (
        <p className="mt-3 rounded-2xl border border-brand-accent/20 bg-white px-4 py-3 text-sm font-semibold text-brand-primary">
          {message}
        </p>
      )}

      {open && (
        <form onSubmit={submitReview} className="mt-4 rounded-[22px] border border-gray-100 bg-white/80 p-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-brand-dark">Rating</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, rating }))}
                  className="rounded-full p-1 text-brand-accent transition hover:bg-brand-light"
                  aria-label={`${rating} star rating`}
                >
                  <Star
                    size={20}
                    fill={rating <= form.rating ? 'currentColor' : 'none'}
                    className={rating <= form.rating ? 'text-brand-accent' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-brand-dark">Review Title (Optional)</span>
            <input
              type="text"
              maxLength="120"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm outline-none transition focus:border-brand-accent"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-brand-dark">Written Review</span>
            <textarea
              required
              rows="4"
              value={form.comment}
              onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm outline-none transition focus:border-brand-accent"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 inline-flex items-center rounded-xl bg-brand-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <MessageSquare size={16} className="mr-2" />}
            Submit Review
          </button>
        </form>
      )}
    </div>
  );
};

export default OrderItemReviewForm;
