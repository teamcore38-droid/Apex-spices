import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Admin Products exposes a downloadable catalog export without changing product controls', async () => {
  const source = await readFile(new URL('../src/pages/AdminDashboard.jsx', import.meta.url), 'utf8');

  assert.match(source, /Export Products/);
  assert.match(source, /format=catalog/);
  assert.match(source, /responseType: 'blob'/);
  assert.match(source, /window\.URL\.createObjectURL/);
  assert.match(source, /download = 'apex-spices-product-catalog\.csv'/);
  assert.match(source, /onClick=\{navigateToAddProduct\}/);
  assert.match(source, /onClick=\{exportProductCatalog\}/);
});
