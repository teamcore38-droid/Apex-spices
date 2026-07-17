import PolicyPageLayout from '../components/PolicyPageLayout';
import { getPolicyRelatedLinks, policyContent } from '../utils/policyContent';

const PrivacyPage = () => {
  const policy = policyContent.privacy;

  return (
    <PolicyPageLayout
      {...policy}
      relatedLinks={getPolicyRelatedLinks('privacy')}
      seo={{
        title: policy.seoTitle,
        description: policy.seoDescription,
        keywords: ['Apex Spices privacy policy', 'PayHere privacy policy', 'customer data Sri Lanka'],
        type: 'article',
      }}
      cta={{
        eyebrow: 'Privacy questions?',
        title: 'Contact Apex Spices customer care',
        body: 'For privacy requests or questions about account and order information, contact our team using the official company details listed on this page.',
        to: '/contact',
        label: 'Contact Us',
      }}
    />
  );
};

export default PrivacyPage;
