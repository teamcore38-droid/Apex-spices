# Apex Spices SEO Deployment Checklist

## Deployment order

1. Deploy the backend first so the corrected SEO endpoints, sitemap, robots rules, and LKR Product schema are live.
2. Deploy the frontend second so public-route HTML rendering and Vercel route rules use the updated backend responses.
3. Verify these production URLs return HTTP 200:
   - `https://www.apexspices.lk/robots.txt`
   - `https://www.apexspices.lk/sitemap.xml`
   - `https://www.apexspices.lk/products`
   - One active category and product URL
4. Verify a made-up page and made-up product ID return HTTP 404.

## Vercel environment variables

Frontend project:

- `VITE_API_URL=https://api.apexspices.lk`
- `VITE_GA_MEASUREMENT_ID=G-...` when GA4 is ready
- `VITE_GOOGLE_SITE_VERIFICATION=...` when Search Console provides the verification token

Backend project:

- `SEO_SITE_URL=https://www.apexspices.lk` (optional explicit override)
- `STOREFRONT_CURRENCY=LKR` (optional; LKR is the secure default)

Do not put Google account passwords, API secrets, or Search Console credentials in source control.

## Google Search Console

1. Add and verify the Domain property for `apexspices.lk` using the DNS TXT method where possible.
2. Submit `https://www.apexspices.lk/sitemap.xml`.
3. Inspect the homepage, shop, each category, and each product URL.
4. Request indexing after the deployment is confirmed.
5. Monitor Page Indexing, Product snippets, Merchant listings, Core Web Vitals, and HTTPS reports.

## Google Analytics 4

1. Create or select the Apex Spices GA4 web data stream.
2. Add its Measurement ID to the frontend Vercel project.
3. Redeploy the frontend.
4. Accept analytics cookies during a test session and confirm `page_view` events in GA4 Realtime.
5. Confirm product, cart, checkout, and purchase events before relying on ecommerce reports.

Analytics and advertising scripts now load only after the matching consent choice.

## Google Merchant Center

Create the account only after the following commercial facts are confirmed in production:

- Supported delivery countries
- Shipping rates and delivery windows
- Return policy and return window
- Product availability and price consistency
- Business identity and customer support details

Product structured data is ready, but a Merchant Center feed and shipping settings should not be published with guessed information.

## Ongoing checks

- Keep product names, descriptions, origins, SKUs, images, stock, and LKR prices accurate.
- Use descriptive source filenames when uploading new product images. Cloudinary now preserves the source filename and delivers responsive optimized variants.
- Review Search Console monthly for broken links, excluded URLs, rich-result errors, and search queries gaining impressions.
- Update page copy from real Search Console query data instead of keyword stuffing.
- Run Lighthouse on the homepage, shop, one category, and one product after major design or catalog changes.
