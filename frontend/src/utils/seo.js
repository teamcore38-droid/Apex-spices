const SITE_NAME = 'Apex Spices';
const SITE_URL = 'https://www.apexspices.lk';
const DEFAULT_DESCRIPTION =
  'Shop premium Sri Lankan whole spices, Ceylon cinnamon, cardamom, black pepper, cloves, turmeric, and dried foods online.';
const DEFAULT_IMAGE = '/logo.webp';
const GOOGLE_SITE_VERIFICATION = import.meta.env?.VITE_GOOGLE_SITE_VERIFICATION || '';

const BUSINESS = {
  legalName: 'Apex Link Import and Export (Pvt) Ltd',
  email: 'info@apexspices.lk',
  telephone: '+94 76 566 9961',
  address: {
    streetAddress: '580/12, Moque Lane',
    addressLocality: 'Nawala, Rajagiriya',
    addressCountry: 'LK',
  },
};

const toAbsoluteUrl = (value = '', baseUrl = SITE_URL) => {
  try {
    return new URL(value || '/', baseUrl).href;
  } catch {
    return new URL('/', SITE_URL).href;
  }
};

const canonicalForPath = (pathname = '/') => {
  const normalizedPath = `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
};

const ensureMeta = (selector, create) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  return element;
};

const setMetaTag = ({ name, property, content }) => {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  const element = ensureMeta(selector, () => {
    const meta = document.createElement('meta');
    if (name) meta.setAttribute('name', name);
    if (property) meta.setAttribute('property', property);
    return meta;
  });
  element.setAttribute('content', content || '');
};

const setLinkTag = ({ rel, href }) => {
  const element = ensureMeta(`link[rel="${rel}"]`, () => {
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    return link;
  });
  element.setAttribute('href', href);
};

const setStructuredData = (id, data) => {
  const selector = `script[type="application/ld+json"][data-seo-id="${id}"]`;
  const existing = document.head.querySelector(selector);

  if (!data) {
    existing?.remove();
    return;
  }

  const element = existing || (() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoId = id;
    document.head.appendChild(script);
    return script;
  })();
  element.textContent = JSON.stringify(data);
};

const applySeo = ({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  type = 'website',
  robots = 'index, follow, max-image-preview:large',
  structuredData = null,
} = {}) => {
  const resolvedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const absoluteUrl = toAbsoluteUrl(canonicalUrl || window.location.pathname);
  const absoluteImage = toAbsoluteUrl(ogImage || DEFAULT_IMAGE);

  document.title = resolvedTitle;
  document.documentElement.lang = 'en';
  setMetaTag({ name: 'description', content: description });
  setMetaTag({ name: 'robots', content: robots });
  setMetaTag({ name: 'googlebot', content: robots });
  if (GOOGLE_SITE_VERIFICATION) {
    setMetaTag({ name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION });
  }
  setMetaTag({ name: 'keywords', content: Array.isArray(keywords) ? keywords.join(', ') : keywords });
  setMetaTag({ property: 'og:site_name', content: SITE_NAME });
  setMetaTag({ property: 'og:locale', content: 'en_LK' });
  setMetaTag({ property: 'og:title', content: resolvedTitle });
  setMetaTag({ property: 'og:description', content: description });
  setMetaTag({ property: 'og:type', content: type });
  setMetaTag({ property: 'og:url', content: absoluteUrl });
  setMetaTag({ property: 'og:image', content: absoluteImage });
  setMetaTag({ property: 'og:image:alt', content: `${SITE_NAME} - ${title}` });
  setMetaTag({ name: 'twitter:card', content: 'summary_large_image' });
  setMetaTag({ name: 'twitter:title', content: resolvedTitle });
  setMetaTag({ name: 'twitter:description', content: description });
  setMetaTag({ name: 'twitter:image', content: absoluteImage });
  setLinkTag({ rel: 'canonical', href: absoluteUrl });
  setStructuredData('primary', structuredData);
};

const buildBreadcrumbStructuredData = (items = []) => ({
  '@type': 'BreadcrumbList',
  '@id': `${items.at(-1)?.item || SITE_URL}#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: toAbsoluteUrl(item.item),
  })),
});

const buildOrganizationStructuredData = () => ({
  '@type': 'OnlineStore',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  legalName: BUSINESS.legalName,
  url: `${SITE_URL}/`,
  logo: toAbsoluteUrl(DEFAULT_IMAGE),
  image: toAbsoluteUrl(DEFAULT_IMAGE),
  email: BUSINESS.email,
  telephone: BUSINESS.telephone,
  address: {
    '@type': 'PostalAddress',
    ...BUSINESS.address,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: BUSINESS.email,
    telephone: BUSINESS.telephone,
    availableLanguage: ['English', 'Sinhala'],
  },
});

const buildWebsiteStructuredData = () => ({
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en',
});

const asGraph = (...nodes) => ({
  '@context': 'https://schema.org',
  '@graph': nodes.flat().filter(Boolean),
});

const buildProductStructuredData = (product, url = canonicalForPath(`/product/${product._id}`)) => {
  const productUrl = toAbsoluteUrl(url);
  const categorySlug = String(product.category || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const images = [...new Set([product.image, ...(product.images || [])].filter(Boolean))].map((image) =>
    toAbsoluteUrl(image)
  );
  const productNode = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: product.name,
    url: productUrl,
    image: images,
    description: product.description || product.shortDescription || '',
    sku: product.sku || product._id,
    category: product.category || undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME,
    },
    aggregateRating:
      Number(product.numReviews || 0) > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating || 0),
            reviewCount: Number(product.numReviews || 0),
          }
        : undefined,
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: product.currency || 'LKR',
      price: Number(product.price || 0).toFixed(2),
      availability:
        Number(product.countInStock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };

  return asGraph(
    productNode,
    buildBreadcrumbStructuredData([
      { name: 'Home', item: '/' },
      { name: 'Shop', item: '/products' },
      ...(categorySlug
        ? [{ name: product.category, item: `/category/${categorySlug}` }]
        : []),
      { name: product.name, item: productUrl },
    ])
  );
};

const buildCategoryStructuredData = (category, products = [], url = canonicalForPath(`/category/${category.slug}`)) => {
  const categoryUrl = toAbsoluteUrl(url);

  return asGraph(
    {
      '@type': 'CollectionPage',
      '@id': `${categoryUrl}#collection`,
      name: category.name,
      description: category.description || '',
      image: toAbsoluteUrl(category.image || DEFAULT_IMAGE),
      url: categoryUrl,
      mainEntity: products.length
        ? {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: canonicalForPath(`/product/${product._id}`),
              name: product.name,
            })),
          }
        : undefined,
    },
    buildBreadcrumbStructuredData([
      { name: 'Home', item: '/' },
      { name: 'Categories', item: '/categories' },
      { name: category.name, item: categoryUrl },
    ])
  );
};

export {
  BUSINESS,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SITE_NAME,
  SITE_URL,
  applySeo,
  asGraph,
  buildBreadcrumbStructuredData,
  buildCategoryStructuredData,
  buildOrganizationStructuredData,
  buildProductStructuredData,
  buildWebsiteStructuredData,
  canonicalForPath,
  toAbsoluteUrl,
};
