import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('ProductDetails mobile layout regression test', () => {
  const filePath = path.resolve(__dirname, '../src/pages/ProductDetails.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. Ensure sticky positioning is scoped to desktop (md:) and not mobile
  assert.doesNotMatch(
    content,
    /className="[^"]*(?<![:\w])sticky\b[^"]*"/,
    'Gallery container must not have un-prefixed "sticky" class on mobile'
  );
  assert.match(
    content,
    /\bmd:sticky\b/,
    'Gallery container should retain md:sticky for desktop side-by-side view'
  );
  assert.match(
    content,
    /\bmd:top-24\b/,
    'Gallery container should retain md:top-24 for desktop sticky positioning'
  );

  // 2. Ensure main image container has proper mobile aspect ratio and is not flex-1 on mobile
  assert.match(
    content,
    /\bw-full\s+aspect-\[3\/4\]/,
    'Main image container must occupy full width and explicit 3/4 aspect ratio on mobile'
  );
  assert.match(
    content,
    /\bmd:flex-1\b/,
    'Main image container should use flex-1 on desktop (md:flex-1)'
  );
  assert.match(
    content,
    /\boverflow-hidden\b/,
    'Main image container should include overflow-hidden to prevent image overflow'
  );

  // 3. Ensure document flow: gallery container and product info are separate siblings in flex container
  const galleryIndex = content.indexOf('{/* Image Gallery */}');
  const infoIndex = content.indexOf('{/* Product Info */}');
  assert.ok(galleryIndex !== -1, 'Image gallery section must exist');
  assert.ok(infoIndex !== -1, 'Product info section must exist');
  assert.ok(galleryIndex < infoIndex, 'Gallery section must precede product info section in document flow');
});
