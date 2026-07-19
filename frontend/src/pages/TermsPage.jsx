import PolicyPageLayout from '../components/PolicyPageLayout';
import { getPolicyRelatedLinks, policyContent } from '../utils/policyContent';

const TermsPage = () => {
  const policy = policyContent.terms;

  return (
    <PolicyPageLayout
      {...policy}
      relatedLinks={getPolicyRelatedLinks('terms')}
      cta={{
        eyebrow: 'Need clarification?',
        title: 'Ask before placing an order',
        body: 'If you need help understanding ordering, shipping, payments, or food safety terms, our customer care team can help.',
        to: '/contact',
        label: 'Contact Us',
      }}
    />
  );
};

export default TermsPage;
