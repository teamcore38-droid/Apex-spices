import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';

const SITE_NAME = 'Apex Spices';
const PRODUCTION_SITE_URL = 'https://www.apexspices.lk';
const STOREFRONT_CURRENCY = process.env.STOREFRONT_CURRENCY || 'LKR';

const getSiteUrl = () => {
  const configuredUrl = String(
    process.env.SEO_SITE_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL || ''
  ).replace(/\/+$/, '');

  if (configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1')) {
    return configuredUrl;
  }

  return PRODUCTION_SITE_URL;
};

const absoluteUrl = (value = '', siteUrl = getSiteUrl()) => {
  try {
    return new URL(value || '/', siteUrl).href;
  } catch {
    return `${siteUrl}/`;
  }
};

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildBreadcrumbs = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

const buildProductSeo = (product) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/product/${product._id}`;
  const categorySlug = String(product.category || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const images = [...new Set([product.image, ...(product.images || [])].filter(Boolean))].map((image) =>
    absoluteUrl(image, siteUrl)
  );
  const productNode = {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    url,
    image: images,
    description: product.description || product.shortDescription || '',
    sku: product.sku || product._id.toString(),
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
      url,
      priceCurrency: STOREFRONT_CURRENCY,
      price: Number(product.price || 0).toFixed(2),
      availability:
        Number(product.countInStock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: SITE_NAME,
      },
    },
  };

  return {
    title: product.seo?.title || `${product.name} | ${SITE_NAME}`,
    description:
      product.seo?.description ||
      product.shortDescription ||
      product.description?.slice(0, 160) ||
      `Shop ${product.name} from ${SITE_NAME}.`,
    keywords: product.seo?.keywords?.length
      ? product.seo.keywords
      : [product.name, product.category, product.brand, product.origin, product.sku].filter(Boolean),
    canonicalUrl: url,
    ogImage: absoluteUrl(product.seo?.ogImage || product.image || '/logo.webp', siteUrl),
    url,
    type: 'product',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        productNode,
        buildBreadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/products' },
          ...(categorySlug ? [{ name: product.category, path: `/category/${categorySlug}` }] : []),
          { name: product.name, path: `/product/${product._id}` },
        ]),
      ],
    },
  };
};

const hydrateProductReviewStats = async (product) => {
  const stats = await Review.aggregate([
    {
      $match: {
        product: product._id,
        status: 'Approved',
        verifiedPurchase: true,
      },
    },
    {
      $group: {
        _id: '$product',
        rating: { $avg: '$rating' },
        numReviews: { $sum: 1 },
      },
    },
  ]);
  const ratingStats = stats[0] || {};

  return {
    ...(product.toObject ? product.toObject() : product),
    rating: Number(Number(ratingStats.rating || 0).toFixed(1)),
    numReviews: Number(ratingStats.numReviews || 0),
  };
};

const buildCategorySeo = (category) => {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/category/${category.slug}`;

  return {
    title: category.seo?.title || `${category.name} | ${SITE_NAME}`,
    description:
      category.seo?.description ||
      category.description ||
      `Shop premium ${category.name.toLowerCase()} from ${SITE_NAME}.`,
    keywords: category.seo?.keywords?.length
      ? category.seo.keywords
      : [category.name, 'Sri Lankan spices', SITE_NAME],
    canonicalUrl: url,
    ogImage: absoluteUrl(category.seo?.ogImage || category.image || '/logo.webp', siteUrl),
    url,
    type: 'website',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${url}#collection`,
          name: category.name,
          description: category.description || '',
          image: absoluteUrl(category.image || '/logo.webp', siteUrl),
          url,
        },
        buildBreadcrumbs([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
          { name: category.name, path: `/category/${category.slug}` },
        ]),
      ],
    },
  };
};

const getProductSeo = async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true,
    approvalStatus: 'Approved',
  });

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.json(buildProductSeo(await hydrateProductReviewStats(product)));
};

const getCategorySeo = async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    isActive: true,
  });

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  return res.json(buildCategorySeo(category));
};

const getSitemap = async (_req, res) => {
  const siteUrl = getSiteUrl();
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true, approvalStatus: 'Approved' }).select('_id updatedAt').lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ]);

  const staticUrls = [
    '',
    '/products',
    '/categories',
    '/about',
    '/contact',
    '/faq',
    '/shipping',
    '/returns',
    '/privacy',
    '/terms',
  ];
  const urls = [
    ...staticUrls.map((path) => ({ loc: `${siteUrl}${path}`, priority: path === '' ? '1.0' : '0.7' })),
    ...categories.map((category) => ({
      loc: `${siteUrl}/category/${category.slug}`,
      lastmod: category.updatedAt?.toISOString?.(),
      priority: '0.8',
    })),
    ...products.map((product) => ({
      loc: `${siteUrl}/product/${product._id}`,
      lastmod: product.updatedAt?.toISOString?.(),
      priority: '0.9',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (urlEntry) =>
        `  <url>\n    <loc>${escapeXml(urlEntry.loc)}</loc>${urlEntry.lastmod ? `\n    <lastmod>${urlEntry.lastmod}</lastmod>` : ''}\n    <priority>${urlEntry.priority}</priority>\n  </url>`
    )
    .join('\n')}\n</urlset>`;

  res.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  return res.type('application/xml').send(xml);
};

const getRobots = (_req, res) => {
  const siteUrl = getSiteUrl();
  // Customer routes remain crawlable so their X-Robots-Tag can be read.
  const blockedPaths = ['/admin/', '/api/'];
  const rules = blockedPaths.map((path) => `Disallow: ${path}`).join('\n');

  res.set('Cache-Control', 'public, max-age=0, s-maxage=86400');
  return res
    .type('text/plain')
    .send(`User-agent: *\nAllow: /\n${rules}\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
};

export {
  buildCategorySeo,
  buildProductSeo,
  getCategorySeo,
  getProductSeo,
  getRobots,
  getSitemap,
};
