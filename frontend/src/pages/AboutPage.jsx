import { CheckCircle2, HeartHandshake, Leaf, ShieldCheck, Sprout } from 'lucide-react';

const storyHighlights = [
  {
    title: '100% Sri Lankan',
    text: 'Proudly local, always.',
    icon: CheckCircle2,
  },
  {
    title: 'No Artificial Additives',
    text: 'Pure and natural.',
    icon: Leaf,
  },
  {
    title: 'Supporting Local Farmers',
    text: 'Better for farmers, better for you.',
    icon: HeartHandshake,
  },
];

const qualityPromises = [
  {
    number: '1',
    title: 'Verified Suppliers',
    text: 'We work with trusted local farmers and producers who follow ethical, sustainable, and traceable sourcing practices.',
    icon: Sprout,
  },
  {
    number: '2',
    title: 'Authentic & Ethical',
    text: 'Every product is selected for genuine Sri Lankan character, responsibly sourced and carefully prepared.',
    icon: HeartHandshake,
  },
  {
    number: '3',
    title: 'Quality Guaranteed',
    text: 'Strict quality checks and hygienic packaging help preserve freshness, aroma, and customer satisfaction.',
    icon: ShieldCheck,
  },
];

const AboutPage = () => {
  return (
    <div>
      <div className="bg-brand-dark text-white pt-8 pb-20 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Our Story</h1>
        <p className="text-xl max-w-2xl mx-auto text-gray-300">
          Connecting the world's finest Sri Lankan flavors from our land to kitchens everywhere.
        </p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row gap-12 items-center mb-20">
          <div className="md:w-1/2">
            <picture>
              <source media="(max-width: 767px)" srcSet="/about-home-bottom-mobile.webp" />
              <source media="(min-width: 768px)" srcSet="/about-home-bottom-desktop.webp" />
              <img
                src="/about-home-bottom-desktop.webp"
                alt="Organic culinary spices"
                className="rounded-lg shadow-lg w-full"
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-serif font-bold mb-6">Built on Trust, Powered by Quality</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Apex Spices is a Sri Lankan brand dedicated to delivering authentic, high-quality spices, dried foods,
              and pantry essentials with the care our island's culinary heritage deserves. From the rich soils and
              trusted grower networks of Sri Lanka, we bring true flavor to homes, chefs, and food lovers around the
              world.
            </p>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Our range includes premium whole spices, ground spices, herbs, and carefully selected dried food
              products, all sourced with attention to purity, freshness, and consistency. Every product is prepared
              with traditional knowledge, modern quality standards, and a deep respect for natural ingredients.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We believe better food begins with honest sourcing. That is why we support local farmers, avoid
              unnecessary additives, and keep every batch focused on clean aroma, rich color, and dependable taste.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {storyHighlights.map(({ title, text, icon: Icon }) => (
                <div
                  key={title}
                  className="rounded-lg border border-brand-accent/20 bg-[#fcfaf7] px-4 py-4 text-center shadow-sm"
                >
                  <Icon size={24} className="mx-auto mb-3 text-brand-accent" />
                  <h3 className="text-sm font-bold text-brand-dark">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#fcfaf7] -mx-4 px-4 py-16 mb-20">
          <div className="container mx-auto">
            <h2 className="text-3xl font-serif font-bold mb-12 text-center">Our Quality Promise</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {qualityPromises.map(({ number, title, text, icon: Icon }) => (
                <div
                  key={title}
                  className="relative bg-white p-8 rounded-lg border border-brand-accent/10 shadow-[0_12px_30px_rgba(48,20,10,0.08)]"
                >
                  <div className="absolute left-1/2 top-0 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white shadow-md">
                    {number}
                  </div>
                  <Icon size={34} className="mx-auto mb-5 mt-2 text-brand-primary" />
                  <h3 className="text-xl font-bold mb-3">{title}</h3>
                  <p className="text-gray-600 leading-6">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
