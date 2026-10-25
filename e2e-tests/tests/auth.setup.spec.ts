import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const customerAuthFile = path.resolve(__dirname, '../playwright/.auth/user.json');
const adminAuthFile = path.resolve(__dirname, '../playwright/.auth/admin.json');

setup('Authenticate Customer Frontend (port 8080)', async ({ page }) => {
  setup.setTimeout(120000);

  // Create the .auth directory if it doesn't exist
  const authDir = path.dirname(customerAuthFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('🌍 Opening Customer Frontend Login (http://localhost:8080/login)...');
  await page.goto('http://localhost:8080/login');

  console.log('⏳ Please login manually on the Customer Frontend...');
  await expect(page.getByRole('button', { name: /Sign Out|Log Out/i }).first()).toBeVisible({ timeout: 120000 });
  console.log('✅ Customer Frontend Login Successful!');

  await page.context().storageState({ path: customerAuthFile });
  console.log(`💾 Customer session saved to: ${customerAuthFile}`);
});

setup('Authenticate Admin Portal (port 5174)', async ({ page }) => {
  setup.setTimeout(120000);

  // Create the .auth directory if it doesn't exist
  const authDir = path.dirname(adminAuthFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log('🛡️ Opening Admin Portal Login (http://localhost:5174/login)...');
  await page.goto('http://localhost:5174/login');

  console.log('⏳ Please login manually on the Admin Portal (Sign in with Google)...');
  // Wait for the sidebar text "Live Dashboard" which only shows after successful admin login
  await expect(page.getByText('Live Dashboard', { exact: false }).first()).toBeVisible({ timeout: 120000 });
  console.log('✅ Admin Portal Login Successful!');

  await page.context().storageState({ path: adminAuthFile });
  console.log(`💾 Admin session saved to: ${adminAuthFile}`);
});
