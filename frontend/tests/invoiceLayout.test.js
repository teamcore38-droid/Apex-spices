import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('invoice view and print layout use Apex Spices branding without duplicate business information', async () => {
  const source = await readFile(new URL('../src/pages/OrderInvoicePage.jsx', import.meta.url), 'utf8');

  assert.match(source, /APEX SPICES/);
  assert.doesNotMatch(source, /APEX LINK GROUP/);
  assert.doesNotMatch(source, /invoice-business-box/);
  assert.doesNotMatch(source, /Business Information/);
  assert.match(source, /@page/);
  assert.match(source, /\.invoice-items-table thead[\s\S]*display: table-header-group/);
  assert.match(source, /\.invoice-items-table tr[\s\S]*page-break-inside: avoid/);
  assert.match(source, /className="flex justify-end"/);
  assert.match(source, /md:max-w-\[320px\]/);
});
