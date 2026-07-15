const AboutPage = () => {
  return (
    <div>
      <div className="bg-brand-dark text-white pt-8 pb-20 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Our Story</h1>
        <p className="text-xl max-w-2xl mx-auto text-gray-300">Connecting the world's finest organic spice growers with kitchens everywhere.</p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row gap-12 items-center mb-20">
          <div className="md:w-1/2">
            <img
              src="/Top-left.webp"
              alt="Organic culinary spices"
              className="rounded-lg shadow-lg w-full"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-serif font-bold mb-6">Built on Trust, Powered by Quality</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Apex Spices began as a premium spice sourcing house and has grown into a global marketplace for authentic, organic spices and herbs. We saw that consumers and professional chefs struggled to find a single trusted platform offering genuinely premium spices — free of fillers, artificial coloring, or blending compromises.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We partner directly with certified local farmers and single-origin estates across Ceylon, Madagascar, India, and other prime spice-growing regions. These direct relationships ensure fair trade prices for local growers, complete batch traceability, and unmatched freshness for our customers.
            </p>
          </div>
        </div>

        <div className="bg-[#fcfaf7] -mx-4 px-4 py-16 mb-20">
          <div className="container mx-auto">
            <h2 className="text-3xl font-serif font-bold mb-12 text-center">Our Quality Promise</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 mx-auto bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">1</div>
                <h3 className="text-xl font-bold mb-3">Verified Suppliers</h3>
                <p className="text-gray-600">Every farm estate and supplier is audited against international organic standards before joining our marketplace.</p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 mx-auto bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">2</div>
                <h3 className="text-xl font-bold mb-3">Ethically Sourced</h3>
                <p className="text-gray-600">We champion fair trade, organic farming, and sustainable practices across our spice estates.</p>
              </div>
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <div className="w-16 h-16 mx-auto bg-brand-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mb-4">3</div>
                <h3 className="text-xl font-bold mb-3">Quality Guaranteed</h3>
                <p className="text-gray-600">Strict lab checks for purity, protective packaging to lock in essential oils, and a 30-day return promise.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
