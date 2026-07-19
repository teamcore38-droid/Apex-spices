import { HelpCircle, Globe, PackageCheck, ShoppingBag } from 'lucide-react';
import PolicyPageLayout from '../components/PolicyPageLayout';
import { FAQ_ITEMS } from '../utils/routeSeo';

const FAQPage = () => {
  return (
    <PolicyPageLayout
      eyebrow="Frequently Asked Questions"
      title="Helpful answers for shopping, sourcing, and delivery"
      intro="From product quality to wholesale interest, these are the questions customers ask most often when shopping with Apex Spices."
      highlights={[
        {
          icon: Globe,
          title: 'Ingredient Quality',
          body: 'We focus on carefully selected spices and food products, quality checks, and protective packaging designed for delivery.',
        },
        {
          icon: PackageCheck,
          title: 'Order Confidence',
          body: 'You can review order progress through your account dashboard, confirmation page, or the Track Order page.',
        },
        {
          icon: ShoppingBag,
          title: 'Premium Shopping',
          body: 'Our goal is to make discovering, ordering, and reordering spices feel simple, reliable, and polished.',
        },
        {
          icon: HelpCircle,
          title: 'Still Need Help?',
          body: 'If your question is not answered here, our support team is ready to help with orders, products, or policy clarifications.',
        },
      ]}
      sections={FAQ_ITEMS.map(({ question, answer }) => ({ title: question, body: answer }))}
      relatedLinks={[
        { to: '/shipping', label: 'Shipping Policy' },
        { to: '/returns', label: 'Refund Policy' },
        { to: '/contact', label: 'Contact Support' },
      ]}
      cta={{
        eyebrow: 'Need a more specific answer?',
        title: 'Our team can help with product or order questions',
        body: 'If you have a sourcing, ingredient, gifting, or delivery question that is not covered here, send us a message and we will point you in the right direction.',
        to: '/contact',
        label: 'Contact Us',
      }}
    />
  );
};

export default FAQPage;
