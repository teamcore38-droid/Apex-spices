import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  delay,
  markRoutePreloaded,
  normalizeRoutePreloadKey,
  shouldPreloadRoute,
  waitForAnimationFrames,
  waitForApiIdle,
  waitForCriticalMedia,
  waitForWindowLoad,
} from '../utils/routePreloader';

const MINIMUM_VISIBLE_MS = 650;
const MAXIMUM_WAIT_MS = 10000;
const EXIT_DURATION_MS = 420;

const RoutePreloaderContext = createContext(() => {});

const RoutePreloaderOverlay = ({ exiting }) => (
  <div
    className={`apex-route-preloader${exiting ? ' apex-route-preloader--exiting' : ''}`}
    role="status"
    aria-live="polite"
    aria-label="Loading Apex Spices page"
    data-testid="route-preloader"
  >
    <div className="apex-route-preloader__content">
      <div className="apex-route-preloader__logo-stage" aria-hidden="true">
        <span className="apex-route-preloader__ring" />
        <img
          src="/logo-96.webp?v=20260719"
          alt=""
          width="96"
          height="96"
          decoding="sync"
          fetchPriority="high"
          className="apex-route-preloader__logo"
        />
      </div>
      <p className="apex-route-preloader__brand">Apex Spices</p>
      <p className="apex-route-preloader__caption">Premium Spices &amp; Herbs</p>
      <span className="apex-route-preloader__progress" aria-hidden="true">
        <span />
      </span>
      <span className="sr-only">Preparing page content</span>
    </div>
  </div>
);

const RoutePreloaderCycle = ({ routeKey, routeRendered, visibleInitially }) => {
  const startedAtRef = useRef(0);
  const [overlay, setOverlay] = useState({ visible: visibleInitially, exiting: false });

  useLayoutEffect(() => {
    document.getElementById('apex-boot-preloader')?.remove();
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!overlay.visible) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlay.visible]);

  const finishRoutePreload = useCallback(() => {
    markRoutePreloaded(routeKey);
    setOverlay((current) =>
      current.visible && !current.exiting
        ? { ...current, exiting: true }
        : current
    );
  }, [routeKey]);

  useEffect(() => {
    if (!overlay.visible || overlay.exiting) {
      return undefined;
    }

    const timeoutId = window.setTimeout(
      finishRoutePreload,
      MAXIMUM_WAIT_MS
    );
    return () => window.clearTimeout(timeoutId);
  }, [finishRoutePreload, overlay]);

  useEffect(() => {
    if (!overlay.visible || overlay.exiting || !routeRendered) {
      return undefined;
    }

    const controller = new AbortController();
    const completeWhenReady = async () => {
      await waitForWindowLoad(controller.signal);
      await waitForAnimationFrames(2, controller.signal);
      await waitForApiIdle({ signal: controller.signal });
      await waitForAnimationFrames(2, controller.signal);
      await waitForCriticalMedia(document.querySelector('main'), { signal: controller.signal });

      const remainingMinimum = Math.max(
        0,
        MINIMUM_VISIBLE_MS - (Date.now() - startedAtRef.current)
      );
      await delay(remainingMinimum, controller.signal);

      if (!controller.signal.aborted) {
        finishRoutePreload();
      }
    };

    completeWhenReady();
    return () => controller.abort();
  }, [finishRoutePreload, overlay, routeRendered]);

  useEffect(() => {
    if (!overlay.exiting) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setOverlay((current) => ({ ...current, visible: false, exiting: false }));
    }, EXIT_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [overlay.exiting]);

  return overlay.visible ? <RoutePreloaderOverlay exiting={overlay.exiting} /> : null;
};

const RoutePreloader = ({ children }) => {
  const { pathname } = useLocation();
  const routeKey = normalizeRoutePreloadKey(pathname);
  const [renderedRouteKey, setRenderedRouteKey] = useState('');

  const notifyRouteRendered = useCallback((renderedKey) => {
    setRenderedRouteKey(renderedKey);
  }, []);

  return (
    <RoutePreloaderContext.Provider value={notifyRouteRendered}>
      {children}
      <RoutePreloaderCycle
        key={routeKey}
        routeKey={routeKey}
        routeRendered={renderedRouteKey === routeKey}
        visibleInitially={shouldPreloadRoute(routeKey)}
      />
    </RoutePreloaderContext.Provider>
  );
};

const RouteReadyBoundary = ({ routeKey, children }) => {
  const notifyRouteRendered = useContext(RoutePreloaderContext);

  useEffect(() => {
    notifyRouteRendered(routeKey);
  }, [notifyRouteRendered, routeKey]);

  return children;
};

export { RoutePreloaderOverlay, RouteReadyBoundary };
export default RoutePreloader;
