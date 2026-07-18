import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let googleScriptPromise;

const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    const script = existingScript || document.createElement('script');

    const handleLoad = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google);
      } else {
        googleScriptPromise = undefined;
        reject(new Error('Google Identity Services did not load correctly.'));
      }
    };

    const handleError = () => {
      googleScriptPromise = undefined;
      reject(new Error('Unable to load Google Sign-In.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.id = GOOGLE_SCRIPT_ID;
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return googleScriptPromise;
};

const GoogleSignInButton = ({
  onCredential,
  onError,
  text = 'continue_with',
  disabled = false,
}) => {
  const containerRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [loadError, setLoadError] = useState('');
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      return undefined;
    }

    let active = true;
    const container = containerRef.current;

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active) {
          return;
        }

        setLoadError('');
        container.replaceChildren();
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (credential) {
              onCredentialRef.current?.(credential);
            } else {
              onErrorRef.current?.('Google did not return a sign-in credential.');
            }
          },
        });
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(400, container.offsetWidth || 400),
        });
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message);
          onErrorRef.current?.(error.message);
        }
      });

    return () => {
      active = false;
      container.replaceChildren();
    };
  }, [clientId, text]);

  if (!clientId) {
    return null;
  }

  return (
    <div>
      <div
        ref={containerRef}
        className={`flex min-h-11 w-full justify-center transition-opacity ${
          disabled ? 'pointer-events-none opacity-60' : ''
        }`}
        aria-busy={disabled}
      />
      {loadError && <p className="mt-2 text-center text-xs font-medium text-red-600">{loadError}</p>}
    </div>
  );
};

export default GoogleSignInButton;
