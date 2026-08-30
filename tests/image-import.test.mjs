import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageFile, MAX_IMAGE_BYTES } from '../src/lib/image-import.ts';
test('photo import accepts supported types and rejects oversized, empty, and unsupported files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.doesNotThrow(() => validateImageFile({ type, size: 100 }));
  for (const type of ['image/heic', 'image/svg+xml', 'application/pdf', '']) assert.throws(() => validateImageFile({ type, size: 100 }), /JPG/);
  for (const size of [0, MAX_IMAGE_BYTES + 1]) assert.throws(() => validateImageFile({ type: 'image/jpeg', size }), /10 MB/);
});
