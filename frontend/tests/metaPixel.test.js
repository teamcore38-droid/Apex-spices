import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Meta Pixel is installed once globally with the provided PageView and noscript fallback', async () => {
  const analyticsSource = await readFile(new URL('../src/utils/analytics.js', import.meta.url), 'utf8');
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(analyticsSource, /2231399167654612/);
  assert.match(analyticsSource, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(analyticsSource, /n\.callMethod \? n\.callMethod\.apply\(n, arguments\) : n\.queue\.push\(arguments\)/);
  assert.match(analyticsSource, /window\.fbq\('init', pixelId\)/);
  assert.match(analyticsSource, /window\.fbq\('track', 'PageView'\)/);
  assert.match(analyticsSource, /metaPixelInitializedId === pixelId/);
  assert.match(indexSource, /https:\/\/www\.facebook\.com\/tr\?id=2231399167654612&ev=PageView&noscript=1/);
});
