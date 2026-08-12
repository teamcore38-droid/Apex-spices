import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('desktop header keeps the Admin link visible and compacts at laptop widths', async () => {
  const source = await readFile(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');

  assert.match(source, /\{canAccessAdmin && \([\s\S]*?ADMIN/);
  assert.doesNotMatch(source, /hidden shrink-0 whitespace-nowrap border-b-2 pb-1 transition-colors 2xl:inline-block/);
  assert.match(source, /items-center justify-center gap-1 text-\[10px\][^`]*lg:flex/);
  assert.match(source, /flex shrink-0 items-center gap-1 sm:gap-4 lg:gap-1/);
  assert.match(source, /max-w-\[120px\][^`]*px-2 py-2 text-\[10px\]/);
});
