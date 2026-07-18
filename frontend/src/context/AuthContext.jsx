/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();
axios.defaults.withCredentials = true;

const USER_STORAGE_KEY = 'userInfo';
const ACTIVITY_STORAGE_KEY = 'apexLastActivityAt';
const ADMIN_INACTIVITY_MS = 30 * 60 * 1000;
const CUSTOMER_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_WARNING_MS = 2 * 60 * 1000;
const ACCESS_REFRESH_LEEWAY_MS = 60 * 1000;

const getStoredUser = () => {
  try {
    const localData = localStorage.getItem(USER_STORAGE_KEY);
    return localData ? JSON.parse(localData) : null;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const persistActivity = () => {
  localStorage.setItem(ACTIVITY_STORAGE_KEY, `${Date.now()}`);
};

const clearStoredSession = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(ACTIVITY_STORAGE_KEY);
};

const isPrivilegedUser = (user) =>
  Boolean(user?.isAdmin || user?.isStaff || user?.role === 'admin' || user?.role === 'owner');

const getInactivityLimit = (user) => (isPrivilegedUser(user) ? ADMIN_INACTIVITY_MS : CUSTOMER_INACTIVITY_MS);

const redirectToLogin = () => {
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (window.location.pathname === '/login') {
    return;
  }

  window.location.assign(`/login?redirect=${encodeURIComponent(currentPath || '/')}`);
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(getStoredUser);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionWarningMinutes, setSessionWarningMinutes] = useState(2);
  const userInfoRef = useRef(userInfo);
  const refreshPromiseRef = useRef(null);
  const sessionWarningRef = useRef(sessionWarning);

  useEffect(() => {
    userInfoRef.current = userInfo;

    if (userInfo) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
    } else {
      clearStoredSession();
    }
  }, [userInfo]);

  useEffect(() => {
    sessionWarningRef.current = sessionWarning;
  }, [sessionWarning]);

  const markActivity = useCallback(() => {
    if (!userInfoRef.current) {
      return;
    }

    persistActivity();

    if (sessionWarningRef.current) {
      setSessionWarning(false);
      setSessionExpiresAt(null);
      setSessionWarningMinutes(2);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/users/logout', {}, { _skipAuthRefresh: true });
    } catch (error) {
      console.error(error);
    }

    setSessionWarning(false);
    setSessionExpiresAt(null);
    setSessionWarningMinutes(2);
    setUserInfo(null);
  }, []);

  const forceLogout = useCallback(async () => {
    try {
      await axios.post('/api/users/logout', {}, { _skipAuthRefresh: true });
    } catch (error) {
      console.error(error);
    }

    setSessionWarning(false);
    setSessionExpiresAt(null);
    setSessionWarningMinutes(2);
    setUserInfo(null);
    redirectToLogin();
  }, []);

  const refreshSession = useCallback(async ({ redirectOnFailure = false } = {}) => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = axios
      .post('/api/users/refresh', {}, { _skipAuthRefresh: true })
      .then(({ data }) => {
        setUserInfo(data);
        persistActivity();
        return data;
      })
      .catch((error) => {
        setSessionWarning(false);
        setSessionExpiresAt(null);
        setSessionWarningMinutes(2);
        setUserInfo(null);

        if (redirectOnFailure) {
          redirectToLogin();
        }

        throw error.response?.data?.message || error.message;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    return refreshPromiseRef.current;
  }, []);

  const login = useCallback(async (email, password, rememberMe = false) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/users/login', { email, password, rememberMe }, {
        ...config,
        _skipAuthRefresh: true,
      });

      if (data.requiresTwoFactor) {
        return data;
      }

      setUserInfo(data);
      persistActivity();
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential, rememberMe = false) => {
    try {
      const { data } = await axios.post(
        '/api/users/google',
        { credential, rememberMe },
        {
          headers: { 'Content-Type': 'application/json' },
          _skipAuthRefresh: true,
        }
      );

      if (data.requiresTwoFactor) {
        return data;
      }

      setUserInfo(data);
      persistActivity();
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  }, []);

  const verifyTwoFactorLogin = useCallback(async ({ challengeId, code, rememberMe = false }) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post('/api/users/login/2fa', { challengeId, code, rememberMe }, {
        ...config,
        _skipAuthRefresh: true,
      });
      setUserInfo(data);
      persistActivity();
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  }, []);

  const register = useCallback(async ({
    name,
    email,
    password,
    confirmPassword,
    phone = '',
    countryCode = 'LK',
    countryName = 'Sri Lanka',
  }) => {
    try {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const { data } = await axios.post(
        '/api/users',
        { name, email, password, confirmPassword, phone, countryCode, countryName },
        {
          ...config,
          _skipAuthRefresh: true,
        }
      );
      setUserInfo(data);
      persistActivity();
      return data;
    } catch (error) {
      throw error.response?.data?.message || error.message;
    }
  }, []);

  const syncUserInfo = useCallback((nextUserInfo) => {
    if (!nextUserInfo) {
      setSessionWarning(false);
      setSessionExpiresAt(null);
      setSessionWarningMinutes(2);
    }

    setUserInfo(nextUserInfo);
  }, []);

  const continueSession = useCallback(async () => {
    persistActivity();
    setSessionWarning(false);
    setSessionExpiresAt(null);
    setSessionWarningMinutes(2);
    await refreshSession({ redirectOnFailure: true });
  }, [refreshSession]);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const token = userInfoRef.current?.token;
      const headers = config.headers || {};

      if (token && !headers.Authorization && !config._skipAuthHeader) {
        headers.Authorization = `Bearer ${token}`;
        config.headers = headers;
      }

      if (userInfoRef.current && !config._skipActivity) {
        persistActivity();
      }

      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};

        if (
          error.response?.status === 401 &&
          userInfoRef.current &&
          !originalRequest._retry &&
          !originalRequest._skipAuthRefresh
        ) {
          originalRequest._retry = true;

          const refreshedUser = await refreshSession({ redirectOnFailure: true });
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${refreshedUser.token}`,
          };

          return axios(originalRequest);
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (!userInfo?.token) {
      return undefined;
    }

    const expiresAt = Date.parse(userInfo.tokenExpiresAt || '');
    const delay = Number.isFinite(expiresAt)
      ? Math.max(1000, expiresAt - Date.now() - ACCESS_REFRESH_LEEWAY_MS)
      : 1000;

    const refreshTimer = window.setTimeout(() => {
      refreshSession({ redirectOnFailure: true }).catch(() => {});
    }, delay);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshSession, userInfo?.token, userInfo?.tokenExpiresAt]);

  useEffect(() => {
    if (!userInfo) {
      return undefined;
    }

    if (!localStorage.getItem(ACTIVITY_STORAGE_KEY)) {
      persistActivity();
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart', 'pointerdown'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
    };
  }, [markActivity, userInfo]);

  useEffect(() => {
    if (!userInfo) {
      return undefined;
    }

    const checkInactivity = () => {
      const currentUser = userInfoRef.current;

      if (!currentUser) {
        return;
      }

      const lastActivity = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY) || Date.now());
      const expiresAt = lastActivity + getInactivityLimit(currentUser);
      const remainingMs = expiresAt - Date.now();

      if (remainingMs <= 0) {
        forceLogout();
        return;
      }

      if (remainingMs <= SESSION_WARNING_MS) {
        setSessionWarning(true);
        setSessionExpiresAt(expiresAt);
        setSessionWarningMinutes(Math.max(1, Math.ceil(remainingMs / 60000)));
      } else if (sessionWarningRef.current) {
        setSessionWarning(false);
        setSessionExpiresAt(null);
        setSessionWarningMinutes(2);
      }
    };

    checkInactivity();
    const interval = window.setInterval(checkInactivity, 15000);

    return () => window.clearInterval(interval);
  }, [forceLogout, userInfo]);

  const contextValue = useMemo(
    () => ({
      userInfo,
      login,
      loginWithGoogle,
      verifyTwoFactorLogin,
      register,
      refreshSession,
      syncUserInfo,
      logout,
    }),
    [login, loginWithGoogle, logout, refreshSession, register, syncUserInfo, userInfo, verifyTwoFactorLogin]
  );

  const warningLabel = sessionExpiresAt
    ? `${sessionWarningMinutes} minute${sessionWarningMinutes === 1 ? '' : 's'}`
    : 'soon';

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {sessionWarning && (
        <div
          className="fixed inset-x-4 bottom-4 z-[1000] mx-auto max-w-md rounded-2xl border border-brand-accent/40 bg-white p-5 shadow-[0_24px_60px_rgba(48,20,10,0.22)]"
          role="alertdialog"
          aria-live="assertive"
          aria-labelledby="session-timeout-title"
        >
          <h2 id="session-timeout-title" className="font-serif text-xl font-bold text-brand-dark">
            Session expiring
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Your session will end in {warningLabel}. Continue to stay signed in.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={continueSession}
              className="rounded-xl bg-brand-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-brand-dark"
            >
              Continue Session
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-brand-primary/20 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary transition hover:border-brand-primary"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
