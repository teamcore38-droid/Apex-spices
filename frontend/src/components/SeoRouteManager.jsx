import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applySeo, canonicalForPath } from '../utils/seo';
import { isPrivateRoute, staticRouteSeo } from '../utils/routeSeo';

const SeoRouteManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const routeSeo = staticRouteSeo[pathname];

    if (routeSeo) {
      applySeo(routeSeo);
      return;
    }

    if (pathname.startsWith('/product/') || pathname.startsWith('/category/')) {
      return;
    }

    if (isPrivateRoute(pathname)) {
      applySeo({
        title: 'Secure Customer Area',
        description: 'Secure Apex Spices customer and administration area.',
        canonicalUrl: canonicalForPath(pathname),
        robots: 'noindex, nofollow, noarchive',
      });
      return;
    }

    applySeo({
      title: 'Page Not Found',
      description: 'The requested page could not be found on Apex Spices.',
      canonicalUrl: canonicalForPath(pathname),
      robots: 'noindex, follow, noarchive',
    });
  }, [pathname]);

  return null;
};

export default SeoRouteManager;
