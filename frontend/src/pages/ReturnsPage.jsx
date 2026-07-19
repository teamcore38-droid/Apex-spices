import PolicyPageLayout from '../components/PolicyPageLayout';
import { getPolicyRelatedLinks, policyContent } from '../utils/policyContent';

const ReturnsPage = () => {
  const policy = policyContent.refund;

  return (
    <PolicyPageLayout
      {...policy}
      relatedLinks={getPolicyRelatedLinks('refund')}
      cta={{
        eyebrow: 'Need return support?',
        title: 'Contact customer care with your order number',
        body: 'If your order arrived damaged, defective, or incorrect, contact us promptly with your order number and supporting photos where relevant.',
        to: '/contact',
        label: 'Request Support',
      }}
    />
  );
};

export default ReturnsPage;
