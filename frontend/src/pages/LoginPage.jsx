import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const REQUIRED_FIELD_MESSAGE = 'This field is required';
const fieldErrorClass = 'mt-2 text-xs font-medium text-red-600';

const getRequiredError = (value) => (value.trim() ? '' : REQUIRED_FIELD_MESSAGE);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const { login, verifyTwoFactorLogin, userInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = new URLSearchParams(location.search).get('redirect') || '/';

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  const updateRequiredField = (fieldName, value, setter) => {
    setter(value);
    setFieldErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors;
      }

      const nextError = getRequiredError(value);
      if (nextError) {
        return { ...currentErrors, [fieldName]: nextError };
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    const nextFieldErrors = twoFactorChallenge
      ? { twoFactorCode: getRequiredError(twoFactorCode) }
      : {
          email: getRequiredError(email),
          password: getRequiredError(password),
        };
    const visibleFieldErrors = Object.fromEntries(
      Object.entries(nextFieldErrors).filter(([, message]) => message)
    );

    setFieldErrors(visibleFieldErrors);

    if (Object.keys(visibleFieldErrors).length > 0) {
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (twoFactorChallenge) {
        await verifyTwoFactorLogin({
          challengeId: twoFactorChallenge.challengeId,
          code: twoFactorCode,
        });
      } else {
        const result = await login(email, password);
        if (result?.requiresTwoFactor) {
          setTwoFactorChallenge(result);
          setFieldErrors({});
          setLoading(false);
          return;
        }
      }
    } catch (loginError) {
      setError(loginError);
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fcfaf7] py-20">
      <div className="container mx-auto flex justify-center px-4">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-[0_18px_40px_rgba(11,31,58,0.08)] border border-gray-100">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Welcome Back</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-brand-dark">Sign in to your account</h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              Review orders, manage addresses, and continue your premium shopping experience.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={submitHandler} className="mt-8 space-y-5" noValidate>
            {!twoFactorChallenge ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand-dark">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => updateRequiredField('email', event.target.value, setEmail)}
                      className={`w-full rounded-xl border bg-[#fcfaf7] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent ${
                        fieldErrors.email ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="you@example.com"
                      aria-invalid={fieldErrors.email ? 'true' : 'false'}
                      aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="login-email-error" className={fieldErrorClass}>
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-brand-dark">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:text-brand-dark"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(event) => updateRequiredField('password', event.target.value, setPassword)}
                      className={`w-full rounded-xl border bg-[#fcfaf7] py-3 pl-12 pr-12 text-sm text-gray-700 outline-none transition focus:border-brand-accent ${
                        fieldErrors.password ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="Enter your password"
                      aria-invalid={fieldErrors.password ? 'true' : 'false'}
                      aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id="login-password-error" className={fieldErrorClass}>
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand-dark">Admin Verification Code</label>
                <div className="relative">
                  <ShieldCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="login-two-factor-code"
                    type="text"
                    required
                    inputMode="numeric"
                    value={twoFactorCode}
                    onChange={(event) => updateRequiredField('twoFactorCode', event.target.value, setTwoFactorCode)}
                    className={`w-full rounded-xl border bg-[#fcfaf7] py-3 pl-12 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-accent ${
                      fieldErrors.twoFactorCode ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="6-digit code"
                    aria-invalid={fieldErrors.twoFactorCode ? 'true' : 'false'}
                    aria-describedby={fieldErrors.twoFactorCode ? 'login-two-factor-code-error' : undefined}
                  />
                </div>
                {fieldErrors.twoFactorCode && (
                  <p id="login-two-factor-code-error" className={fieldErrorClass}>
                    {fieldErrors.twoFactorCode}
                  </p>
                )}
                {twoFactorChallenge.developmentCode && (
                  <p className="mt-3 rounded-xl bg-brand-light px-4 py-3 text-xs font-semibold text-brand-dark">
                    Development code: {twoFactorChallenge.developmentCode}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-brand-primary py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark ${
                loading ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {loading ? 'Signing In...' : twoFactorChallenge ? 'Verify Admin Sign In' : 'Sign In'}
            </button>
            {twoFactorChallenge && (
              <button
                type="button"
                onClick={() => {
                  setTwoFactorChallenge(null);
                  setTwoFactorCode('');
                  setFieldErrors({});
                }}
                className="w-full text-xs font-bold uppercase tracking-[0.16em] text-brand-primary"
              >
                Use a different account
              </button>
            )}
          </form>

          <div className="mt-8 rounded-2xl bg-brand-light px-4 py-3 text-center text-sm text-gray-600">
            New to Apex Link Group?{' '}
            <Link
              to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
              className="font-bold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
            >
              Create your account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
