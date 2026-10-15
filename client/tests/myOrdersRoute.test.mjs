import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('My Orders routing and navigation integrity', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Verify App.tsx has MyOrders component imported and mounted
  assert.match(appContent, /import\s+\{\s*MyOrders\s*\}\s+from\s+['"]\.\/pages\/MyOrders['"]/);
  assert.match(appContent, /<Route\s+path=["']orders["']\s+element=\{<MyOrders\s*\/>\}/);
  assert.match(appContent, /<Route\s+path=["']my-orders["']\s+element=\{<MyOrders\s*\/>\}/);

  const navbarPath = path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx');
  const navbarContent = fs.readFileSync(navbarPath, 'utf8');

  // Verify Navbar has My Orders link in desktop and mobile menus
  assert.match(navbarContent, /to=["']\/orders["'][\s\S]*?>\s*My Orders\s*<\/Link>/);

  const myOrdersPath = path.resolve(process.cwd(), 'src/pages/MyOrders.tsx');
  const myOrdersContent = fs.readFileSync(myOrdersPath, 'utf8');

  // Verify page handles authentication protection and empty states
  assert.match(myOrdersContent, /useAuthStore/);
  assert.match(myOrdersContent, /<Navigate\s+to=["']\/login["']/);
  assert.match(myOrdersContent, /No Orders Yet/);
  assert.match(myOrdersContent, /Start Shopping/);
});
