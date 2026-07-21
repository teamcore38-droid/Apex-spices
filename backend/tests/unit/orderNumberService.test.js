import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderNumber } from '../../utils/orderNumberService.js';

test('order numbers use the Apex sequence format', () => {
  assert.equal(formatOrderNumber(100), 'AXS-000100');
  assert.equal(formatOrderNumber(101), 'AXS-000101');
  assert.equal(formatOrderNumber(102), 'AXS-000102');
  assert.equal(formatOrderNumber(1000000), 'AXS-1000000');
});
