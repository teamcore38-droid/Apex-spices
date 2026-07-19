const SITE_NAME = 'Apex Spices';
const SITE_URL = 'https://www.apexspices.lk';
const API_URL = String(globalThis.process?.env?.VITE_API_URL || 'https://api.apexspices.lk').replace(/\/+$/, '');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const removeBaseSeo = (html) =>
  html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|googlebot|keywords|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace(/\s*<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');

const absoluteUrl = (value = '') => {
  try {
    return new URL(value || '/', SITE_URL).href;
  } catch {
    return `${SITE_URL}/`;
  }
};

const headMarkup = (seo) => {
  const title = String(seo.title || SITE_NAME).includes(SITE_NAME)
    ? String(seo.title || SITE_NAME)
    : `${seo.title} | ${SITE_NAME}`;
  const description = String(seo.description || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const canonical = absoluteUrl(seo.canonicalUrl);
  const image = absoluteUrl(seo.ogImage || '/logo.webp');

  return [
    `<title>${escapeHtml(title)}</title>`,
    '<style data-seo-shell-styles>[data-seo-shell]{max-width:1120px;margin:0 auto;padding:32px 20px;color:#081729;font-family:Arial,sans-serif}[data-seo-shell] nav{margin-bottom:28px}[data-seo-shell] a{color:#3b1f17}[data-seo-shell] article{max-width:820px}[data-seo-shell] h1{font:700 clamp(2rem,5vw,3.5rem) Georgia,serif}[data-seo-shell] img{display:block;width:100%;height:auto;margin:24px 0}</style>',
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large">',
    '<meta name="googlebot" content="index, follow, max-image-preview:large">',
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    '<meta property="og:locale" content="en_LK">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:type" content="${escapeHtml(seo.type || 'website')}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    seo.structuredData
      ? `<script type="application/ld+json" data-seo-id="primary">${JSON.stringify(seo.structuredData).replace(/</g, '\\u003c')}</script>`
      : '',
  ].filter(Boolean).join('\n    ');
};

const buildShell = (type, record, relatedProducts = []) => {
  const breadcrumbParent = type === 'product'
    ? '<a href="/products">Shop</a>'
    : '<a href="/categories">Categories</a>';
  const description = record.description || record.shortDescription || '';
  const image = record.image
    ? `<img src="${escapeHtml(absoluteUrl(record.image))}" alt="${escapeHtml(record.name)}" width="800" height="800">`
    : '';
  const commerce = type === 'product'
    ? `<p>LKR ${Number(record.price || 0).toFixed(2)}</p><p>${Number(record.countInStock || 0) > 0 ? 'In stock' : 'Out of stock'}</p>`
    : relatedProducts.length
      ? `<h2>Products in ${escapeHtml(record.name)}</h2><ul>${relatedProducts.map((product) => `<li><a href="/product/${encodeURIComponent(product._id)}">${escapeHtml(product.name)}</a></li>`).join('')}</ul>`
      : '';

  return `<div data-seo-shell><nav aria-label="Breadcrumb"><a href="/">Home</a> / ${breadcrumbParent} / ${escapeHtml(record.name)}</nav><main><article><h1>${escapeHtml(record.name)}</h1>${image}<p>${escapeHtml(description)}</p>${commerce}</article></main></div>`;
};

const renderPage = (template, seo, shell) =>
  removeBaseSeo(template)
    .replace('</head>', `    ${headMarkup(seo)}\n  </head>`)
    .replace(/<div id="root">[\s\S]*?(?=\s*<\/body>)/, `<div id="root">${shell}</div>`);

const sendFallback = (response, html) => {
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).send(html);
};

export default async function handler(request, response) {
  const type = request.query.type === 'category' ? 'category' : 'product';
  const id = String(request.query.id || '').trim();
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const origin = `${protocol}://${host}`;

  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    return response.status(404).send('Not found');
  }

  const seoPath = type === 'product' ? `/api/seo/product/${id}` : `/api/seo/category/${id}`;
  const dataPath = type === 'product' ? `/api/products/${id}` : `/api/categories/${id}`;

  try {
    const [templateResponse, seoResponse, dataResponse, listingResponse] = await Promise.all([
      fetch(`${origin}/index.html`),
      fetch(`${API_URL}${seoPath}`, { headers: { Accept: 'application/json' } }),
      fetch(`${API_URL}${dataPath}`, { headers: { Accept: 'application/json' } }),
      type === 'category'
        ? fetch(`${API_URL}/api/products?category=${encodeURIComponent(id)}&limit=100`, {
            headers: { Accept: 'application/json' },
          })
        : Promise.resolve(null),
    ]);
    const template = await templateResponse.text();

    if (seoResponse.status === 404 || dataResponse.status === 404) {
      const notFoundResponse = await fetch(`${origin}/404.html`);
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.setHeader('X-Robots-Tag', 'noindex, follow, noarchive');
      return response.status(404).send(await notFoundResponse.text());
    }

    if (!templateResponse.ok || !seoResponse.ok || !dataResponse.ok) {
      return sendFallback(response, template);
    }

    const [seo, record, listingPayload] = await Promise.all([
      seoResponse.json(),
      dataResponse.json(),
      listingResponse?.ok ? listingResponse.json() : Promise.resolve({ products: [] }),
    ]);
    const relatedProducts = Array.isArray(listingPayload)
      ? listingPayload
      : listingPayload?.products || [];

    if (type === 'category' && relatedProducts.length && Array.isArray(seo.structuredData?.['@graph'])) {
      const collection = seo.structuredData['@graph'].find((node) => node['@type'] === 'CollectionPage');
      if (collection) {
        collection.mainEntity = {
          '@type': 'ItemList',
          numberOfItems: relatedProducts.length,
          itemListElement: relatedProducts.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: product.name,
            url: `${SITE_URL}/product/${product._id}`,
          })),
        };
      }
    }

    const html = renderPage(template, seo, buildShell(type, record, relatedProducts));
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    return response.status(200).send(html);
  } catch {
    try {
      const fallbackResponse = await fetch(`${origin}/index.html`);
      return sendFallback(response, await fallbackResponse.text());
    } catch {
      return response.status(503).send('Temporarily unavailable');
    }
  }
}
