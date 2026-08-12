import test from 'node:test';
import assert from 'node:assert/strict';
import { getBusinessInfoForDocuments } from '../../controllers/orderController.js';

test('invoice document business info normalizes the legacy Apex Link Group name', () => {
  const originalName = process.env.BUSINESS_NAME;
  process.env.BUSINESS_NAME = 'APEX LINK GROUP';

  try {
    assert.equal(getBusinessInfoForDocuments().name, 'APEX SPICES');
  } finally {
    if (originalName === undefined) {
      delete process.env.BUSINESS_NAME;
    } else {
      process.env.BUSINESS_NAME = originalName;
    }
  }
});
