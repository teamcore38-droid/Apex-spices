import { BadgeCheck, Database, FileText, Gavel, Lock, PackageSearch, Receipt, RefreshCcw, Scale, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react';

const BUSINESS_CONTACT = {
  email: 'info@apexspices.lk',
  phone: '+94 76 566 9961',
  website: 'https://www.apexspices.lk',
  address: '580/12, Moque Lane, Nawala, Rajagiriya, Sri Lanka',
};

const contactPoints = [
  `Email: ${BUSINESS_CONTACT.email}`,
  `Phone: ${BUSINESS_CONTACT.phone}`,
  `Website: ${BUSINESS_CONTACT.website}`,
  `Address: ${BUSINESS_CONTACT.address}`,
];

export const policyContent = {
  refund: {
    eyebrow: 'Refund Policy',
    title: 'Refund Policy',
    intro:
      'Thank you for shopping at Apex Spices. Operated by Apex Link Import and Export (Pvt) Ltd, we value your satisfaction and strive to provide the best online shopping experience for premium spices, dried meats, herbs, and related food products.',
    seoTitle: 'Refund Policy',
    seoDescription:
      'Read the Apex Spices refund, return, exchange, damaged item, and international order policy.',
    highlights: [
      {
        icon: RefreshCcw,
        title: '7-Day Returns',
        body: 'Eligible unopened and unused items may be returned within 7 days from delivery.',
      },
      {
        icon: BadgeCheck,
        title: 'Damage Support',
        body: 'Damaged, defective, or incorrect items should be reported within 48 hours of delivery.',
      },
      {
        icon: PackageSearch,
        title: 'Inspection First',
        body: 'Refunds are processed after the returned item has been received and inspected.',
      },
      {
        icon: ShieldAlert,
        title: 'Food Safety',
        body: 'Opened or used perishable products are not returnable unless damaged or defective.',
      },
    ],
    sections: [
      {
        title: 'Last Updated',
        paragraphs: ['July 17, 2026'],
      },
      {
        title: 'Refund Policy',
        paragraphs: [
          'Thank you for shopping at Apex Spices (www.apexspices.lk). Operated by Apex Link Import and Export (Pvt) Ltd, we value your satisfaction and strive to provide you with the best online shopping experience for premium spices, dried meats, herbs, and related food products. If, for any reason, you are not completely satisfied with your purchase, we are here to help.',
        ],
      },
      {
        title: 'Returns',
        paragraphs: [
          'We accept returns within 7 days from the date of delivery. To be eligible for a return, the item must be unopened, unused, and in the same condition and original packaging as you received it. Due to the perishable nature of our products, opened or used items cannot be returned unless they arrived damaged or defective.',
          `To initiate a return, please contact our customer support team at ${BUSINESS_CONTACT.email} with your order number and reason for return. We will provide you with further instructions on how to proceed.`,
        ],
      },
      {
        title: 'Refunds',
        paragraphs: [
          'Once we receive your return and inspect the item, we will notify you of the status of your refund via email. If your return is approved, we will initiate a refund to your original method of payment. Please note that the refund amount will exclude any shipping charges incurred during the initial purchase.',
        ],
      },
      {
        title: 'Exchanges',
        paragraphs: [
          `If you would like to exchange your item for a different product, variant, or size, please contact our customer support team at ${BUSINESS_CONTACT.email} within 7 days of receiving your order. We will provide you with further instructions on how to proceed with the exchange, subject to product availability.`,
        ],
      },
      {
        title: 'Non-Returnable Items',
        paragraphs: ['Due to the nature of our products, the following items are non-returnable and non-refundable:'],
        points: [
          'Opened or used spice products, dried meats, herbs, or any perishable food items',
          'Products that have been tampered with or improperly stored after delivery',
          'Gift cards or vouchers',
          'Items purchased during clearance or final sales (unless defective)',
          'Custom or specially blended spice orders',
        ],
      },
      {
        title: 'Damaged or Defective Items',
        paragraphs: [
          `In the unfortunate event that your item arrives damaged, defective, or not as described, please contact us immediately at ${BUSINESS_CONTACT.email} within 48 hours of delivery. Please include photographs of the damaged product and packaging. We will arrange for a replacement or issue a full refund, including shipping charges, depending on your preference and product availability.`,
        ],
      },
      {
        title: 'Return Shipping',
        paragraphs: [
          'You will be responsible for paying the shipping costs for returning your item unless the return is due to our error (e.g., wrong item shipped, defective product, or item not matching the description). In such cases, we will provide you with a prepaid shipping label or reimburse the return shipping cost.',
        ],
      },
      {
        title: 'International Orders',
        paragraphs: [
          'For international orders, the same return policy applies. However, please note that return shipping costs for international orders will be the responsibility of the customer unless the return is due to our error. Customs duties, import taxes, or any other charges incurred during the return process are the responsibility of the customer.',
        ],
      },
      {
        title: 'Processing Time',
        paragraphs: [
          'Refunds and exchanges will be processed within 7-10 business days after we receive your returned item. Please note that it may take additional time for the refund to appear in your account, depending on your payment provider or bank.',
        ],
      },
      {
        title: 'Contact Us',
        paragraphs: ['If you have any questions or concerns regarding our refund policy, please contact our customer support team:'],
        points: contactPoints,
      },
      {
        title: 'Policy Note',
        paragraphs: [
          'This Refund Policy is subject to change without prior notice. Please review this page periodically for updates. This policy is governed by the laws of Sri Lanka.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'Privacy Policy',
    intro:
      "At Apex Spices, operated by Apex Link Import and Export (Pvt) Ltd, we are committed to protecting the privacy and security of our customers' personal information.",
    seoTitle: 'Privacy Policy',
    seoDescription:
      'Read how Apex Spices collects, uses, safeguards, and shares customer information.',
    highlights: [
      {
        icon: UserRound,
        title: 'Information We Collect',
        body: 'We collect customer, order, payment, browsing, and support information needed to operate the store.',
      },
      {
        icon: Database,
        title: 'Purposeful Use',
        body: 'Information is used for orders, support, delivery, personalization, security, and legal compliance.',
      },
      {
        icon: Lock,
        title: 'Secure Payments',
        body: 'Payments are handled through PayHere. Apex Spices does not store full payment details.',
      },
      {
        icon: ShieldCheck,
        title: 'Customer Rights',
        body: 'Customers may request access, corrections, deletion, or marketing opt-out where applicable.',
      },
    ],
    sections: [
      {
        title: 'Last Updated',
        paragraphs: ['July 17, 2026'],
      },
      {
        title: 'Privacy Policy',
        paragraphs: [
          "At Apex Spices (www.apexspices.lk), operated by Apex Link Import and Export (Pvt) Ltd, we are committed to protecting the privacy and security of our customers' personal information. This Privacy Policy outlines how we collect, use, and safeguard your information when you visit or make a purchase on our website. By using our website, you consent to the practices described in this policy.",
        ],
      },
      {
        title: 'Information We Collect',
        paragraphs: ['When you visit our website, we may collect certain information about you, including:'],
        points: [
          'Personal identification information (such as your name, email address, phone number, and shipping/billing address) provided voluntarily by you during the registration or checkout process.',
          'Payment and billing information necessary to process your orders, including credit/debit card details, which are securely handled by our trusted third-party payment processor (PayHere). We do not store your full payment details on our servers.',
          'Order history and transaction details related to your purchases.',
          'Browsing information, such as your IP address, browser type, device information, and pages visited, collected automatically using cookies and similar technologies.',
          'Communication records, including emails, chat messages, and feedback you send to our customer support team.',
        ],
      },
      {
        title: 'Use of Information',
        paragraphs: ['We may use the collected information for the following purposes:'],
        points: [
          'To process and fulfill your orders, including shipping and delivery to local and international destinations.',
          'To communicate with you regarding your purchases, provide customer support, and respond to inquiries or requests.',
          'To personalize your shopping experience and present relevant product recommendations and promotions.',
          'To improve our website, products, and services based on your feedback and browsing patterns.',
          'To detect and prevent fraud, unauthorized activities, and abuse of our website.',
          'To comply with legal obligations and applicable Sri Lankan laws and regulations.',
        ],
      },
      {
        title: 'Information Sharing',
        paragraphs: [
          'We respect your privacy and do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:',
        ],
        points: [
          'Trusted service providers: We may share your information with third-party service providers who assist us in operating our website, processing payments (PayHere), shipping and delivering products (courier and logistics partners), and performing marketing activities. These providers are contractually obligated to handle your data securely and confidentially.',
          'Legal requirements: We may disclose your information if required to do so by law or in response to valid legal requests, court orders, or regulatory requirements under Sri Lankan law.',
        ],
      },
      {
        title: 'Data Security',
        paragraphs: [
          "We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. All payment transactions are processed through PayHere's secure payment gateway with SSL encryption. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.",
        ],
      },
      {
        title: 'Cookies and Tracking Technologies',
        paragraphs: [
          'We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and gather information about your preferences and interactions with our website. You have the option to disable cookies through your browser settings, but this may limit certain features and functionality of our website.',
        ],
      },
      {
        title: 'Your Rights',
        paragraphs: ['You have the right to:'],
        points: [
          'Access, correct, or update your personal information by contacting us or through your account settings.',
          'Request the deletion of your personal data, subject to our legal obligations to retain certain records.',
          'Opt out of marketing communications by using the unsubscribe link in our emails or contacting us directly.',
        ],
      },
      {
        title: 'Changes to the Privacy Policy',
        paragraphs: [
          'We reserve the right to update or modify this Privacy Policy at any time. Any changes will be posted on this page with a revised "Last Updated" date. We encourage you to review this Privacy Policy periodically to stay informed about how we collect, use, and protect your information.',
        ],
      },
      {
        title: 'Contact Us',
        paragraphs: ['If you have any questions, concerns, or requests regarding our Privacy Policy or the handling of your personal information, please contact us:'],
        points: contactPoints,
      },
      {
        title: 'Policy Note',
        paragraphs: ['This Privacy Policy is governed by the laws of Sri Lanka.'],
      },
    ],
  },
  terms: {
    eyebrow: 'Terms & Conditions',
    title: 'Terms and Conditions',
    intro:
      'These Terms and Conditions govern your use of the Apex Spices website and the purchase and sale of products from our platform.',
    seoTitle: 'Terms and Conditions',
    seoDescription:
      'Read the Apex Spices terms for website use, ordering, payments, shipping, returns, food safety, and liability.',
    highlights: [
      {
        icon: FileText,
        title: 'Website Use',
        body: 'Customers must use the website lawfully and provide accurate account and checkout information.',
      },
      {
        icon: Receipt,
        title: 'Orders & Payments',
        body: 'Orders are subject to acceptance, availability, accurate pricing, and secure PayHere processing.',
      },
      {
        icon: Scale,
        title: 'Customer Responsibility',
        body: 'Customers are responsible for storage, allergen checks, and international duties where applicable.',
      },
      {
        icon: Gavel,
        title: 'Sri Lankan Law',
        body: 'These terms are governed by the laws and courts of Sri Lanka.',
      },
    ],
    sections: [
      {
        title: 'Last Updated',
        paragraphs: ['July 17, 2026'],
      },
      {
        title: 'Terms and Conditions',
        paragraphs: [
          `Welcome to Apex Spices (www.apexspices.lk). These Terms and Conditions govern your use of our website and the purchase and sale of products from our platform. Apex Spices is operated by Apex Link Import and Export (Pvt) Ltd, a company incorporated under the Companies Act No.7 of 2007 of Sri Lanka, with its registered office at ${BUSINESS_CONTACT.address}. By accessing and using our website, you agree to comply with these terms. Please read them carefully before proceeding with any transactions.`,
        ],
      },
      {
        title: 'Use of the Website',
        points: [
          'a. You must be at least 18 years old to use our website or make purchases.',
          'b. You are responsible for maintaining the confidentiality of your account information, including your username and password.',
          'c. You agree to provide accurate and current information during the registration and checkout process.',
          'd. You may not use our website for any unlawful or unauthorized purposes.',
        ],
      },
      {
        title: 'Products and Product Information',
        points: [
          'a. Apex Spices specializes in premium spices, dried meats, herbs, condiments, seasonings, curry powders, and related food products sourced from Sri Lanka and other regions.',
          'b. We strive to provide accurate product descriptions, images, weight specifications, and pricing information. However, we do not guarantee the accuracy or completeness of such information. Actual product colors and packaging may vary slightly from the images displayed.',
          'c. Prices are displayed in Sri Lankan Rupees (LKR) or as otherwise indicated and are subject to change without notice. Any promotions or discounts are valid for a limited time and may be subject to additional terms and conditions.',
        ],
      },
      {
        title: 'Orders and Payments',
        points: [
          'a. By placing an order on our website, you are making an offer to purchase the selected products.',
          'b. We reserve the right to refuse or cancel any order for any reason, including but not limited to product availability, errors in pricing or product information, or suspected fraudulent activity.',
          'c. You agree to provide valid and up-to-date payment information and authorize us to charge the total order amount, including applicable taxes and shipping fees, to your chosen payment method.',
          'd. Payments are processed securely through PayHere, our trusted third-party payment processor. We do not store or have direct access to your full payment details.',
        ],
      },
      {
        title: 'Shipping and Delivery',
        points: [
          'a. We offer both local (within Sri Lanka) and international worldwide shipping.',
          'b. We will make reasonable efforts to ensure timely shipping and delivery of your orders. However, shipping and delivery times provided are estimates and may vary based on your location, customs clearance, and other factors beyond our control.',
          "c. For international orders, the customer is responsible for any customs duties, import taxes, or additional charges levied by their country's authorities.",
          'd. Risk of loss and title for items purchased from Apex Spices pass to you upon delivery to the shipping carrier.',
        ],
      },
      {
        title: 'Perishable Goods',
        points: [
          'a. Many of our products are perishable food items. By placing an order, you acknowledge that spices, dried meats, and food products have limited shelf lives.',
          'b. You agree to store products according to the storage instructions provided on the product packaging or our website.',
          'c. Apex Spices is not responsible for product deterioration caused by improper storage or handling after delivery.',
        ],
      },
      {
        title: 'Returns and Refunds',
        points: [
          'a. Our Returns and Refund Policy governs the process and conditions for returning products and seeking refunds. Please refer to our Refund Policy page on our website for detailed information.',
        ],
      },
      {
        title: 'Intellectual Property',
        points: [
          'a. All content and materials on our website, including but not limited to text, images, logos, graphics, product names, and the "Apex Spices" brand, are protected by intellectual property rights and are the property of Apex Link Import and Export (Pvt) Ltd or its licensors.',
          'b. You may not use, reproduce, distribute, or modify any content from our website without our prior written consent.',
        ],
      },
      {
        title: 'Food Safety and Allergen Disclaimer',
        points: [
          'a. Our products may contain or be processed in facilities that also process common allergens including but not limited to nuts, sesame, mustard, gluten, and dairy.',
          'b. It is your responsibility to check product ingredients and allergen information before consumption. If you have known food allergies, please consult with a healthcare professional before consuming our products.',
          'c. Apex Spices shall not be held liable for any allergic reactions or health issues arising from the consumption of our products where allergen information was provided.',
        ],
      },
      {
        title: 'Limitation of Liability',
        points: [
          'a. In no event shall Apex Link Import and Export (Pvt) Ltd, its directors, employees, or affiliates be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with your use of our website or the purchase and use of our products.',
          'b. We make no warranties or representations, express or implied, regarding the quality, accuracy, or suitability of the products offered on our website beyond those required by applicable Sri Lankan consumer protection laws.',
        ],
      },
      {
        title: 'Governing Law',
        paragraphs: [
          'These Terms and Conditions shall be governed by and construed in accordance with the laws of the Democratic Socialist Republic of Sri Lanka. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.',
        ],
      },
      {
        title: 'Amendments and Termination',
        paragraphs: [
          'We reserve the right to modify, update, or terminate these Terms and Conditions at any time without prior notice. It is your responsibility to review these terms periodically for any changes. Continued use of our website after any modifications constitutes your acceptance of the updated terms.',
        ],
      },
      {
        title: 'Contact Us',
        paragraphs: ['If you have any questions regarding these Terms and Conditions, please contact us:'],
        points: contactPoints,
      },
      {
        title: 'Policy Note',
        paragraphs: [
          'These Terms and Conditions are governed by the laws of Sri Lanka and the Companies Act No.7 of 2007.',
        ],
      },
    ],
  },
};

export const getPolicyRelatedLinks = (currentKey) =>
  [
    { key: 'refund', to: '/pages/refund-policy', label: 'Refund Policy' },
    { key: 'privacy', to: '/pages/privacy-policy', label: 'Privacy Policy' },
    { key: 'terms', to: '/pages/terms-and-conditions', label: 'Terms & Conditions' },
  ].filter((link) => link.key !== currentKey);

export { BUSINESS_CONTACT };
