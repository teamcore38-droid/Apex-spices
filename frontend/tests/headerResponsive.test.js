import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readHeaderSource = () => readFile(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');

test('desktop header keeps the Admin link visible and compacts at laptop widths', async () => {
  const source = await readHeaderSource();

  assert.match(source, /\{canAccessAdmin && \([\s\S]*?ADMIN/);
  assert.doesNotMatch(source, /hidden shrink-0 whitespace-nowrap border-b-2 pb-1 transition-colors 2xl:inline-block/);
  assert.match(source, /items-center justify-center gap-1 text-\[10px\][^`]*lg:flex/);
  assert.match(source, /flex shrink-0 items-center gap-1 sm:gap-4 lg:gap-1/);
  assert.match(source, /max-w-\[120px\][^`]*px-2 py-2 text-\[10px\]/);
});

test('header stays attached to the viewport scroll container', async () => {
  const [headerSource, cssSource] = await Promise.all([
    readHeaderSource(),
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  ]);

  assert.match(headerSource, /<header className="sticky top-0 z-50/);
  assert.match(cssSource, /html,\s*body,\s*#root\s*\{[^}]*overflow-x: clip;/);
  assert.doesNotMatch(cssSource, /html,\s*body,\s*#root\s*\{[^}]*overflow-x: hidden;/);
});
