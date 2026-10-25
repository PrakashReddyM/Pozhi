import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Define the authenticated test context (Customer login)
const authStoragePath = path.resolve(__dirname, '../playwright/.auth/user.json');
const authenticatedTest = test.extend({
  storageState: authStoragePath,
});

// Load configuration
const configPath = path.resolve(__dirname, '../test-data.json');
const testData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const services = [
  { url: '/studio/passphoto', name: 'PassPhoto', expectedPrice: 120 },
  { url: '/studio/photocopies', name: 'Photo Copies', expectedPrice: 100 },
  { url: '/studio/frames', name: 'Premium Wall Frames', expectedPrice: 149 },
  { url: '/studio/album', name: 'Album', expectedPrice: 1499 },
  { url: '/studio/snapnprint', name: "Snap n' Print", expectedPrice: 15000 }
];

// =============================================================
// 🏆 PHASE 1: THE GOLDEN PATH — Place an order for all 5 services
// =============================================================
authenticatedTest.describe('🏆 Phase 1: The Golden Path (Core Services)', () => {
  for (const service of services) {
    authenticatedTest(`Order ${service.name}`, async ({ page }) => {
      test.setTimeout(60000);
      console.log(`🌍 Opening ${service.name}...`);
      await page.goto(`http://localhost:8080${service.url}`);

      // Verify page loads
      await expect(page.getByText(service.name, { exact: false }).first()).toBeVisible({ timeout: 15000 });

      // Handle Image Uploads
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0 && service.name !== 'Album') {
        console.log(`📸 Uploading image for ${service.name}...`);
        if (!testData.imagePath || testData.imagePath === "test.jpg") {
          const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
          await fileInput.setInputFiles({ name: 'test.jpg', mimeType: 'image/jpeg', buffer: imageBuffer });
        } else {
          await fileInput.setInputFiles(testData.imagePath);
        }
        await expect(page.locator('.photo-preview-image, img, .rounded-xl').first()).toBeVisible();
      }

      // Snap n' Print specific: Select Date and Time
      if (service.name === "Snap n' Print") {
        console.log(`📅 Selecting Date and Time for ${service.name}...`);
        const dateButtons = page.locator('button[name="day"]:not([disabled]), table button:not([disabled])');
        await dateButtons.nth(5).click();
        await page.getByRole('button', { name: /09:00 AM|11:00 AM|01:00 PM/i }).first().click();
      }

      console.log(`🛒 Clicking Buy Now for ${service.name}...`);
      await page.getByRole('button', { name: /Buy Now|Confirm Booking/i }).first().click();

      console.log('⏳ Waiting for Checkout page...');
      await page.waitForURL(/.*\/checkout/, { timeout: 15000 });
      await expect(page.getByText('Checkout', { exact: false }).first()).toBeVisible();

      // Fill in customer details
      const nameInput = page.locator('input[type="text"]');
      if (await nameInput.count() > 0 && await nameInput.inputValue() === "") {
        await nameInput.fill(testData.customerName);
      }

      const mobileInput = page.locator('input[type="tel"]');
      if (await mobileInput.count() > 0 && await mobileInput.inputValue() === "") {
        await mobileInput.fill(testData.customerPhone);
      }

      const addressInput = page.locator('textarea');
      if (await addressInput.count() > 0 && await addressInput.inputValue() === "") {
        await addressInput.fill(testData.customerAddress);
      }

      console.log(`💳 Placing Order for ${service.name}...`);
      await page.getByRole('button', { name: /Place Order/i }).click();

      console.log(`⏳ Waiting for Success Screen...`);
      await expect(page.getByText(/Order Confirmed|Order Successful/i)).toBeVisible({ timeout: 20000 });
      console.log(`✅ Order for ${service.name} completed successfully!`);
    });
  }
});

// =============================================================
// 🧪 PHASE 2: CUSTOMER EDGE CASES & NEGATIVE TESTING
// =============================================================
authenticatedTest.describe('🧪 Phase 2: Customer Edge Cases & Negative Testing', () => {

  authenticatedTest('1. Clumsy Customer (Empty Form Validation)', async ({ page }) => {
    console.log('🤦‍♂️ Simulating clumsy checkout...');
    await page.goto('http://localhost:8080/studio/album');
    await page.getByRole('button', { name: /Buy Now/i }).first().click();
    await page.waitForURL(/.*\/checkout/);

    // Clear the form
    await page.locator('input[type="text"]').fill('');
    await page.locator('input[type="tel"]').fill('');
    await page.locator('textarea').fill('');

    // Verify "Place Order" button is disabled
    const placeOrderBtn = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderBtn).toBeDisabled();
    console.log('✅ Form validation successfully blocked the empty order!');
  });

  authenticatedTest('2. Invalid File Attack', async ({ page }) => {
    console.log('💣 Attempting to upload a non-image file...');
    await page.goto('http://localhost:8080/studio/passphoto');

    const fakeTextFile = Buffer.from('This is a text file, not an image!');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'attack.txt', mimeType: 'text/plain', buffer: fakeTextFile });

    // Scope to the upload preview area ONLY — not any img on the page (e.g. navbar logo)
    // The upload preview container wraps the photo after a valid image is selected
    // After an invalid file, this container must remain empty/hidden
    const uploadPreview = page.locator('.photo-preview-image, [data-testid="upload-preview"], .upload-zone img').first();
    await expect(uploadPreview).not.toBeVisible({ timeout: 3000 });
    console.log('✅ Invalid file successfully rejected by the frontend!');
  });

  authenticatedTest('3. Gift Wrap Money Math Validation', async ({ page }) => {
    console.log('🎁 Verifying Gift Wrap pricing logic...');
    await page.goto('http://localhost:8080/studio/album');
    await page.getByRole('button', { name: /Buy Now/i }).first().click();
    await page.waitForURL(/.*\/checkout/);

    const priceTextBefore = await page.getByText(/Total.*₹/i).first().innerText();
    const numericPriceBefore = parseInt(priceTextBefore.replace(/[^0-9]/g, ''));

    // Check gift wrap checkbox
    await page.locator('button[role="checkbox"]').first().click();
    await page.waitForTimeout(500);

    const priceTextAfter = await page.getByText(/Total.*₹/i).first().innerText();
    const numericPriceAfter = parseInt(priceTextAfter.replace(/[^0-9]/g, ''));

    expect(numericPriceAfter).toBe(numericPriceBefore + 30);
    console.log('✅ Gift wrap mathematically verified! (Added ₹30)');
  });

  authenticatedTest('4. Customer Portal: Order History Sync', async ({ page }) => {
    console.log('🕵️ Checking Customer Portal Order History...');
    await page.goto('http://localhost:8080/account');

    // Look for recent orders placed in Phase 1
    const pendingOrder = page.getByText(/Pending|POZHI-|Completed/i).first();
    await expect(pendingOrder).toBeVisible({ timeout: 15000 });
    console.log('✅ Order history successfully found in Customer Portal!');
  });
});

// =============================================================
// 🔒 PHASE 3: SECURITY — Customer Frontend Only (port 8080)
// =============================================================
test.describe('🔒 Phase 3: Security & Unauthorized Access (Customer Frontend)', () => {
  // Standard `test` = NO auth context = anonymous user

  test('1. Direct Link Sneak: Visiting /checkout while logged out', async ({ page }) => {
    console.log('🕵️‍♀️ Testing forced redirect from /checkout...');
    await page.goto('http://localhost:8080/checkout');
    await expect(page).not.toHaveURL(/.*\/checkout/);
    console.log('✅ Unauthorized access to checkout blocked!');
  });
});
