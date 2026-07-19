import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SITE_NAME,
  toAbsoluteUrl,
} from '../src/utils/seo.js';
import { staticRouteSeo } from '../src/utils/routeSeo.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(projectDirectory, 'dist');
const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
const apiBaseUrl = String(process.env.VITE_API_URL || 'https://api.apexspices.lk').replace(/\/+$/, '');
const googleSiteVerification = String(process.env.VITE_GOOGLE_SITE_VERIFICATION || '').trim();

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const fetchJson = async (pathname) => {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`SEO build request failed (${response.status}): ${pathname}`);
  }

  return response.json();
};

const headMarkup = ({ title, description, canonicalUrl, ogImage = '/logo.webp', type = 'website', robots = 'index, follow, max-image-preview:large', structuredData }) => {
  const resolvedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const image = toAbsoluteUrl(ogImage);
  const canonical = toAbsoluteUrl(canonicalUrl);
  const safeTitle = escapeHtml(resolvedTitle);
  const safeDescription = escapeHtml(description);

  return [
    `<title>${safeTitle}</title>`,
    '<style data-seo-shell-styles>[data-seo-shell]{max-width:1120px;margin:0 auto;padding:32px 20px;color:#081729;font-family:Arial,sans-serif}[data-seo-shell] nav{margin-bottom:28px}[data-seo-shell] a{color:#3b1f17}[data-seo-shell] h1,[data-seo-shell] h2{font-family:Georgia,serif}[data-seo-shell] h1{font-size:clamp(2rem,5vw,3.5rem)}[data-seo-shell] li{margin:.6rem 0}</style>',
    `<meta name="description" content="${safeDescription}">`,
    `<meta name="robots" content="${escapeHtml(robots)}">`,
    `<meta name="googlebot" content="${escapeHtml(robots)}">`,
    googleSiteVerification
      ? `<meta name="google-site-verification" content="${escapeHtml(googleSiteVerification)}">`
      : '',
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    '<meta property="og:locale" content="en_LK">',
    `<meta property="og:title" content="${safeTitle}">`,
    `<meta property="og:description" content="${safeDescription}">`,
    `<meta property="og:type" content="${escapeHtml(type)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${safeTitle}">`,
    `<meta name="twitter:description" content="${safeDescription}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    structuredData
      ? `<script type="application/ld+json" data-seo-id="primary">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`
      : '',
  ].filter(Boolean).join('\n    ');
};

const removeBaseSeo = (html) =>
  html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|googlebot|keywords|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');

const productLinks = (products = []) =>
  products
    .map(
      (product) =>
        `<li><a href="/product/${encodeURIComponent(product._id)}">${escapeHtml(product.name)}</a></li>`
    )
    .join('');

const categoryLinks = (categories = []) =>
  categories
    .map(
      (category) =>
        `<li><a href="/category/${encodeURIComponent(category.slug)}">${escapeHtml(category.name)}</a></li>`
    )
    .join('');

const staticShell = (pathname, seo, products, categories) => {
  const navigation = '<nav aria-label="Primary"><a href="/">Home</a> <a href="/products">Shop</a> <a href="/categories">Categories</a> <a href="/about">About</a> <a href="/contact">Contact</a></nav>';
  const title = pathname === '/' ? 'Premium Sri Lankan Spices' : seo.title;
  let discovery = '';

  if (pathname === '/' || pathname === '/products') {
    discovery += `<section><h2>Shop Spices Online</h2><ul>${productLinks(products)}</ul></section>`;
  }
  if (pathname === '/' || pathname === '/categories') {
    discovery += `<section><h2>Browse Spice Collections</h2><ul>${categoryLinks(categories)}</ul></section>`;
  }

  return `<div data-seo-shell>${navigation}<main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(seo.description)}</p>${discovery}</main></div>`;
};

const renderHtml = (seo, shell) => {
  const html = removeBaseSeo(template);
  return html
    .replace('</head>', `    ${headMarkup(seo)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${shell}</div>`);
};

const writeSeoPage = async (pathname, seo, shell) => {
  const relativePath = pathname === '/' ? 'index.html' : `seo${pathname}.html`;
  const outputPath = path.join(outputDirectory, ...relativePath.split('/'));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderHtml(seo, shell), 'utf8');
};

const [categoryPayload, productPayload] = await Promise.all([
  fetchJson('/api/categories'),
  fetchJson('/api/products?limit=100'),
]);
const categories = Array.isArray(categoryPayload) ? categoryPayload : categoryPayload.categories || [];
const products = Array.isArray(productPayload) ? productPayload : productPayload.products || [];

for (const [pathname, seo] of Object.entries(staticRouteSeo)) {
  await writeSeoPage(pathname, seo, staticShell(pathname, seo, products, categories));
}

console.log(`Generated SEO HTML for ${Object.keys(staticRouteSeo).length} stable public routes.`);
