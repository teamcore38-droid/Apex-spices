import { useMemo, useState } from 'react';
import axios from 'axios';
import { Loader2, Mail, MapPin, MessageSquareText, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const createInitialForm = (userInfo) => ({
  name: userInfo?.name || '',
  email: userInfo?.email || '',
  phone: userInfo?.phone || '',
  subject: '',
  message: '',
});

const REQUIRED_FIELD_MESSAGE = 'This field is required';
const requiredFields = ['name', 'email', 'subject', 'message'];
const fieldErrorClass = 'mt-2 text-xs font-medium text-red-600';
const customerCarePhone = '+94 76 566 9961';
const whatsappUrl = `https://wa.me/94765669961?text=${encodeURIComponent(
  'Hello Apex Spices, I would like to inquire about your products/services.'
)}`;

const getRequiredError = (value) => (value.trim() ? '' : REQUIRED_FIELD_MESSAGE);

const WhatsAppIcon = ({ className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
    <path
      fill="currentColor"
      d="M16.02 3.2A12.7 12.7 0 0 0 5.11 22.4L3.5 28.8l6.55-1.55A12.66 12.66 0 0 0 16 28.8h.02A12.8 12.8 0 0 0 28.8 16 12.79 12.79 0 0 0 16.02 3.2Zm0 23.45h-.02a10.58 10.58 0 0 1-5.39-1.48l-.39-.23-3.88.92.95-3.78-.25-.4A10.54 10.54 0 1 1 16.02 26.65Zm5.79-7.9c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.19-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.7-.97-2.33-.25-.61-.51-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.06 1.3 3.27c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"
    />
  </svg>
);

const ContactPage = () => {
  const { userInfo } = useAuth();

  const [formData, setFormData] = useState(() => createInitialForm(userInfo));
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const contactCards = useMemo(
    () => [
      {
        icon: MapPin,
        title: 'Warehouse & Dispatch',
        body: '580/12, Moque Lane\nNawala, Rajagiriya\nSri Lanka',
      },
      {
        icon: Phone,
        title: 'Customer Care',
        body: `${customerCarePhone}\nMonday to Friday\n9:00 AM - 6:00 PM`,
      },
      {
        icon: Mail,
        title: 'Email Support',
        body: 'apexlinkimportandexport@gmail.com',
      },
    ],
    []
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setError('');
    setSuccessMessage('');
    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextError = getRequiredError(value);
      if (nextError) {
        return { ...currentErrors, [name]: nextError };
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    const nextFieldErrors = requiredFields.reduce((errors, fieldName) => {
      const fieldError = getRequiredError(formData[fieldName]);
      return fieldError ? { ...errors, [fieldName]: fieldError } : errors;
    }, {});

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError('');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data } = await axios.post('/api/contact', formData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSuccessMessage(
        data.message || 'Thank you for reaching out. Our team will reply shortly.'
      );
      setFormData(createInitialForm(userInfo));
      setFieldErrors({});
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError.response?.data?.message ||
          'We could not send your message right now. Please try again shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf7] apex-page-shell">
      <div className="container mx-auto max-w-6xl px-4">
        <section className="apex-hero-card">
          <p className="apex-hero-eyebrow">Contact Apex Spices</p>
          <h1 className="apex-hero-title">Let’s make your next order effortless</h1>
          <p className="apex-hero-copy">
            Reach out for order support, wholesale inquiries, gifting help, or product questions. We aim to respond with the same care we bring to every product in our collection.
          </p>
        </section>

        <div className="apex-section-gap grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-6">
            <div className="rounded-[24px] bg-white p-5 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:rounded-[28px] sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Customer Care</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark sm:text-3xl">How we can help</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600 sm:leading-7">
                Use the form for order issues, shipping questions, gifting requests, and wholesale conversations. If your request is time-sensitive, include your order number in the message.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {contactCards.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-[24px] bg-white p-5 shadow-[0_14px_32px_rgba(11,31,58,0.07)] sm:p-4 xl:p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-3 font-serif text-xl font-bold text-brand-dark xl:text-2xl">{title}</h3>
                  <div className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-600">{body}</div>
                </article>
              ))}
            </div>
          </aside>

          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                <MessageSquareText size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Send a Message</p>
                <h2 className="font-serif text-3xl font-bold text-brand-dark">Tell us what you need</h2>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {successMessage}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={submitHandler} noValidate>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-2 block text-sm font-semibold text-brand-dark">Your Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent ${
                      fieldErrors.name ? 'border-red-300' : 'border-gray-200'
                    }`}
                    aria-invalid={fieldErrors.name ? 'true' : 'false'}
                    aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                  />
                  {fieldErrors.name && (
                    <p id="contact-name-error" className={fieldErrorClass}>
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent ${
                      fieldErrors.email ? 'border-red-300' : 'border-gray-200'
                    }`}
                    aria-invalid={fieldErrors.email ? 'true' : 'false'}
                    aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                  />
                  {fieldErrors.email && (
                    <p id="contact-email-error" className={fieldErrorClass}>
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
                <div>
                  <label htmlFor="contact-phone" className="mb-2 block text-sm font-semibold text-brand-dark">Phone Number</label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="text"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-2 block text-sm font-semibold text-brand-dark">Subject</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className={`w-full rounded-xl border bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent ${
                      fieldErrors.subject ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="Order support, wholesale, gifting, product question..."
                    aria-invalid={fieldErrors.subject ? 'true' : 'false'}
                    aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
                  />
                  {fieldErrors.subject && (
                    <p id="contact-subject-error" className={fieldErrorClass}>
                      {fieldErrors.subject}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-2 block text-sm font-semibold text-brand-dark">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows="7"
                  value={formData.message}
                  onChange={handleChange}
                  className={`w-full rounded-xl border bg-[#f7f9fc] px-4 py-3 text-sm leading-7 text-brand-dark outline-none transition focus:border-brand-accent ${
                    fieldErrors.message ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Tell us about your question, order number, or what kind of help you need."
                  aria-invalid={fieldErrors.message ? 'true' : 'false'}
                  aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                />
                {fieldErrors.message && (
                  <p id="contact-message-error" className={fieldErrorClass}>
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              <div className="rounded-[24px] border border-brand-accent/15 bg-[#f5f8fc] px-5 py-4 text-sm leading-7 text-gray-600">
                We review every message manually. For the fastest order support, include your order ID and the email address used during checkout.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" /> Sending Message...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>

              <div className="rounded-[24px] border border-[#25d366]/25 bg-[#f4fbf7] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white shadow-sm">
                      <WhatsAppIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif text-xl font-bold text-brand-dark">Prefer to chat with us?</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        Contact our Customer Care team on WhatsApp for quick assistance.
                      </p>
                    </div>
                  </div>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#25d366] px-5 py-3 text-sm font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#1faa53]"
                  >
                    <WhatsAppIcon className="mr-2 h-5 w-5" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
