import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8');
const carouselSource = readFileSync(
  new URL('../src/components/FeaturedProductCarousel.jsx', import.meta.url),
  'utf8'
);
const revealSource = readFileSync(
  new URL('../src/components/ScrollRevealSection.jsx', import.meta.url),
  'utf8'
);
const cssSource = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('requested homepage commerce sections use the one-time reveal wrapper', () => {
  assert.equal((homeSource.match(/<ScrollRevealSection/g) || []).length, 3);
  assert.match(homeSource, /Shop by Category/);
  assert.match(homeSource, /Featured Collection/);
  assert.match(homeSource, /Best Sellers/);
  assert.match(homeSource, /data-reveal-heading/);
  assert.match(homeSource, /data-reveal-card/);
});

test('featured carousel exposes stagger markers without changing its default behavior', () => {
  assert.match(homeSource, /<FeaturedProductCarousel products=\{featuredProducts\} revealCards \/>/);
  assert.match(carouselSource, /revealCards = false/);
  assert.match(carouselSource, /'data-reveal-card': true/);
});

test('reveal behavior is observed once and respects reduced motion', () => {
  assert.match(revealSource, /IntersectionObserver/);
  assert.match(revealSource, /observer\.disconnect\(\)/);
  assert.match(revealSource, /prefers-reduced-motion: reduce/);
  assert.match(cssSource, /var\(--reveal-index, 0\) \* 100ms/);
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
});

test('desktop featured and best-seller cards match the shop card frame', () => {
  assert.match(
    homeSource,
    /id="featured-collection"[\s\S]*?container mx-auto max-w-7xl px-4[\s\S]*?className="lg:px-6"[\s\S]*?<FeaturedProductCarousel/
  );
  assert.match(
    homeSource,
    /id="best-sellers"[\s\S]*?container mx-auto max-w-7xl px-4[\s\S]*?grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 lg:px-6/
  );
  assert.doesNotMatch(homeSource, /id="best-sellers"[\s\S]*?xl:grid-cols-4/);
});
