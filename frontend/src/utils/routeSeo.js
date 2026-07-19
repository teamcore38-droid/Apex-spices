import {
  SITE_URL,
  asGraph,
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  canonicalForPath,
} from './seo.js';

const FAQ_ITEMS = [
  {
    question: 'How are products quality-checked?',
    answer:
      'Products are reviewed against category-specific quality standards before dispatch. Supporting certificates and documentation are available on request when applicable.',
  },
  {
    question: 'Do you support business and wholesale orders?',
    answer:
      'Yes. Apex Spices supports wholesale and business orders, including volume pricing and assistance for suitable products.',
  },
  {
    question: 'Can I track my order without logging in?',
    answer:
      'Yes. Use the Track Order page with your order ID and the email address or phone number associated with the order.',
  },
  {
    question: 'Do you offer gifting support?',
    answer:
      'Yes. Contact Apex Spices with your gifting requirements and timing so the team can advise on product suitability and availability.',
  },
  {
    question: 'What if something is wrong with my order?',
    answer:
      'Contact Apex Spices promptly with your order number and a short explanation if an order arrives damaged, incomplete, or below expectation.',
  },
];

const breadcrumbFor = (name, path) =>
  buildBreadcrumbStructuredData([
    { name: 'Home', item: '/' },
    { name, item: path },
  ]);

const staticRouteSeo = {
  '/': {
    title: 'Premium Sri Lankan Spices Online',
    description:
      'Shop premium Sri Lankan spices online, including Ceylon cinnamon, cardamom, black pepper, cloves, turmeric, spice blends, and dried foods.',
    keywords: ['Sri Lankan spices', 'Ceylon spices online', 'premium spices', 'online spice store Sri Lanka'],
    canonicalUrl: `${SITE_URL}/`,
    structuredData: asGraph(buildOrganizationStructuredData(), buildWebsiteStructuredData()),
  },
  '/products': {
    title: 'Shop Premium Sri Lankan Spices Online',
    description:
      'Browse premium whole spices, Ceylon cinnamon, cardamom, black pepper, cloves, turmeric, spice blends, and dried foods from Apex Spices.',
    keywords: ['buy spices online Sri Lanka', 'premium spices online', 'whole spices', 'Ceylon cinnamon'],
    canonicalUrl: canonicalForPath('/products'),
    structuredData: asGraph(
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalForPath('/products')}#collection`,
        name: 'Shop Premium Sri Lankan Spices',
        url: canonicalForPath('/products'),
        description: 'The Apex Spices online product collection.',
      },
      breadcrumbFor('Shop', '/products')
    ),
  },
  '/categories': {
    title: 'Spice and Dried Food Collections',
    description:
      'Explore Apex Spices collections of premium whole spices, ground spices, spice blends, dried foods, and Sri Lankan pantry products.',
    keywords: ['spice categories', 'whole spices', 'ground spices', 'Sri Lankan dried foods'],
    canonicalUrl: canonicalForPath('/categories'),
    structuredData: asGraph(
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalForPath('/categories')}#collection`,
        name: 'Spice and Dried Food Collections',
        url: canonicalForPath('/categories'),
      },
      breadcrumbFor('Categories', '/categories')
    ),
  },
  '/about': {
    title: 'About Apex Spices',
    description:
      'Learn how Apex Spices sources and supplies authentic Sri Lankan spices, dried foods, herbs, and pantry essentials for customers worldwide.',
    keywords: ['about Apex Spices', 'Sri Lankan spice supplier', 'authentic Sri Lankan spices'],
    canonicalUrl: canonicalForPath('/about'),
    structuredData: asGraph(
      buildOrganizationStructuredData(),
      {
        '@type': 'AboutPage',
        '@id': `${canonicalForPath('/about')}#about`,
        name: 'About Apex Spices',
        url: canonicalForPath('/about'),
        about: { '@id': `${SITE_URL}/#organization` },
      },
      breadcrumbFor('About', '/about')
    ),
  },
  '/contact': {
    title: 'Contact Apex Spices',
    description:
      'Contact Apex Spices in Sri Lanka for product questions, order support, wholesale inquiries, gifting, shipping, and WhatsApp assistance.',
    keywords: ['contact Apex Spices', 'Sri Lanka spice supplier contact', 'wholesale spice inquiry'],
    canonicalUrl: canonicalForPath('/contact'),
    structuredData: asGraph(
      buildOrganizationStructuredData(),
      {
        '@type': 'ContactPage',
        '@id': `${canonicalForPath('/contact')}#contact`,
        name: 'Contact Apex Spices',
        url: canonicalForPath('/contact'),
        mainEntity: { '@id': `${SITE_URL}/#organization` },
      },
      breadcrumbFor('Contact', '/contact')
    ),
  },
  '/faq': {
    title: 'Frequently Asked Questions',
    description:
      'Find answers about Apex Spices product quality, wholesale orders, gifting, order tracking, shipping, and customer support.',
    keywords: ['Apex Spices FAQ', 'spice delivery questions', 'wholesale spice orders'],
    canonicalUrl: canonicalForPath('/faq'),
    structuredData: asGraph(
      {
        '@type': 'FAQPage',
        '@id': `${canonicalForPath('/faq')}#faq`,
        mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      breadcrumbFor('FAQ', '/faq')
    ),
  },
  '/shipping': {
    title: 'Shipping and Delivery',
    description:
      'Read Apex Spices shipping, dispatch, tracking, delivery, packaging, and international order information before placing an order.',
    canonicalUrl: canonicalForPath('/shipping'),
    type: 'article',
    structuredData: asGraph(
      {
        '@type': 'WebPage',
        '@id': `${canonicalForPath('/shipping')}#page`,
        name: 'Apex Spices Shipping and Delivery',
        url: canonicalForPath('/shipping'),
      },
      breadcrumbFor('Shipping', '/shipping')
    ),
  },
  '/returns': {
    title: 'Refund and Return Policy',
    description:
      'Read the Apex Spices refund, return, exchange, damaged item, and international order policy.',
    canonicalUrl: canonicalForPath('/returns'),
    type: 'article',
    structuredData: asGraph(breadcrumbFor('Refund and Return Policy', '/returns')),
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'Read how Apex Spices collects, uses, safeguards, and shares customer information.',
    canonicalUrl: canonicalForPath('/privacy'),
    type: 'article',
    structuredData: asGraph(breadcrumbFor('Privacy Policy', '/privacy')),
  },
  '/terms': {
    title: 'Terms and Conditions',
    description:
      'Read the Apex Spices terms for website use, ordering, payments, shipping, returns, food safety, and liability.',
    canonicalUrl: canonicalForPath('/terms'),
    type: 'article',
    structuredData: asGraph(breadcrumbFor('Terms and Conditions', '/terms')),
  },
};

const privateRoutePrefixes = [
  '/admin',
  '/account',
  '/cart',
  '/checkout',
  '/customer-experience',
  '/forgot-password',
  '/login',
  '/order/',
  '/orders/',
  '/privacy-center',
  '/profile',
  '/register',
  '/reset-password',
  '/rfq',
  '/thank-you',
  '/track-order',
  '/vendor',
];

const isPrivateRoute = (pathname) =>
  privateRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));

export { FAQ_ITEMS, isPrivateRoute, staticRouteSeo };
