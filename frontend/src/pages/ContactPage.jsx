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

const getRequiredError = (value) => (value.trim() ? '' : REQUIRED_FIELD_MESSAGE);

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
        title: 'Studio & Dispatch',
        body: '580/12, Moque Lane\nNawala, Rajagiriya\nSri Lanka',
      },
      {
        icon: Phone,
        title: 'Customer Care',
        body: '+94 76 566 9961\nMonday to Friday\n9:00 AM - 6:00 PM',
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
    <div className="min-h-screen bg-[#fcfaf7] pt-6 pb-16">
      <div className="container mx-auto max-w-6xl px-4">
        <section className="rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Contact Apex Spices</p>
          <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Let’s make your next order effortless</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
            Reach out for order support, wholesale inquiries, gifting help, or product questions. We aim to respond with the same care we bring to every product in our collection.
          </p>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-6">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Customer Care</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-brand-dark">How we can help</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Use the form for order issues, shipping questions, gifting requests, and wholesale conversations. If your request is time-sensitive, include your order number in the message.
              </p>
            </div>

            <div className="grid gap-5">
              {contactCards.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 font-serif text-2xl font-bold text-brand-dark">{title}</h3>
                  <div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">{body}</div>
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
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
