import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('shop grid and product cards constrain intrinsic widths on mobile', async () => {
  const [shopSource, cardSource] = await Promise.all([
    readSource('../src/pages/ProductsPage.jsx'),
    readSource('../src/components/Product.jsx'),
  ]);

  assert.match(shopSource, /grid min-w-0 grid-cols-2/);
  assert.match(shopSource, /grid-cols-\[repeat\(3,minmax\(0,1fr\)\)\]/);
  assert.match(cardSource, /h-full min-w-0 max-w-full flex-col/);
  assert.match(cardSource, /aspect-\[4\/3\][^']*sm:h-72/);
  assert.match(cardSource, /object-contain/);
  assert.match(cardSource, /max-\[359px\]:grid-cols-1/);
});

test('product detail keeps media, controls, and nested cards inside narrow screens', async () => {
  const source = await readSource('../src/pages/ProductPage.jsx');

  assert.match(source, /overflow-x-clip bg-\[#f7f9fc\]/);
  assert.match(source, /grid min-w-0 gap-6 lg:grid-cols/);
  assert.match(source, /aspect-\[4\/3\] h-auto w-full max-w-full object-contain/);
  assert.match(source, /grid max-w-full grid-cols-4 gap-2 sm:gap-3/);
  assert.match(source, /rounded-\[24px\] border[^\n]*p-3 sm:rounded-\[28px\] sm:p-5/);
  assert.match(source, /grid min-w-0 grid-cols-2 gap-2 min-\[390px\]:grid-cols-4/);
  assert.match(source, /relative min-w-0 flex-1/);
  assert.match(source, /w-full min-w-0 items-center justify-center/);
});
