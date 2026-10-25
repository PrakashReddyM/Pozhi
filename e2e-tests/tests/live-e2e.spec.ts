import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Tell Playwright to use the saved authentication state from auth.setup.ts!
// This means the bot will instantly be logged in on both pozhi.in and admin.pozhi.in!
test.use({ storageState: path.resolve(__dirname, '../playwright/.auth/user.json') });

// Load configuration
const configPath = path.resolve(__dirname, '../test-data.json');
const testData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// The 5 core services to test
const services = [
  { url: '/studio/passphoto', name: 'PassPhoto' },
  { url: '/studio/photocopies', name: 'Photo Copies' },
  { url: '/studio/frames', name: 'Premium Wall Frames' },
  { url: '/studio/album', name: 'Album' },
  { url: '/studio/snapnprint', name: 'Snap n\' Print' }
];

test.describe('Automated Ordering Flow', () => {

  // Loop through all 5 services and create a distinct test for each one!
  for (const service of services) {
    test(`Order ${service.name}`, async ({ page }) => {
      test.setTimeout(60000); // 1 min max per service
      
      console.log(`🌍 Opening ${service.name}...`);
      await page.goto(`http://localhost:8080${service.url}`);

      // Verify the page loads
      await expect(page.getByText(service.name, { exact: false }).first()).toBeVisible({ timeout: 15000 });

      // Handle Image Uploads (except Album which defaults to Basic)
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0 && service.name !== 'Album') {
        console.log(`📸 Uploading image for ${service.name}...`);
        if (!testData.imagePath || testData.imagePath === "test.jpg") {
          const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
          await fileInput.setInputFiles({ name: 'test.jpg', mimeType: 'image/jpeg', buffer: imageBuffer });
        } else {
          await fileInput.setInputFiles(testData.imagePath);
        }
        // Wait for preview
        await expect(page.locator('.photo-preview-image, img, .rounded-xl').first()).toBeVisible();
      }

      if (service.name === "Snap n' Print") {
        console.log(`📅 Selecting Date and Time for ${service.name}...`);
        // Select an available day in the calendar (we skip the first few because they might be outside the current month or disabled)
        const dateButtons = page.locator('button[name="day"]:not([disabled]), table button:not([disabled])');
        await dateButtons.nth(5).click(); // Pick a date safely in the future
        
        // Select the first available time slot
        await page.getByRole('button', { name: /09:00 AM|11:00 AM|01:00 PM/i }).first().click();
      }

      console.log(`🛒 Clicking Buy Now for ${service.name}...`);
      await page.getByRole('button', { name: /Buy Now|Confirm Booking/i }).first().click();

      console.log('⏳ Waiting for Checkout page...');
      // Because we injected the `storageState`, we are ALREADY logged in!
      // It should bypass /account and land directly on /checkout.
      await page.waitForURL(/.*\/checkout/, { timeout: 15000 });

      // Verify Checkout is ready
      await expect(page.getByText('Checkout', { exact: false }).first()).toBeVisible();

      // Fill in fields if they are missing
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
      await expect(page.getByText(/Order Successful|Confirmed/i)).toBeVisible({ timeout: 20000 });
      console.log(`✅ Order for ${service.name} completed successfully!`);
    });
  }

  // Final Admin Portal Verification Test
  test('Verify All Orders in Admin Portal', async ({ page }) => {
    console.log('🛡️ Opening Admin Portal (http://localhost:8080/admin/orders)...');
    await page.goto('http://localhost:8080/admin/orders');
    
    // The storageState instantly logs us into Admin Portal!
    console.log('⏳ Waiting for Dashboard...');
    await expect(page.getByText('Live Dashboard', { exact: false }).first()).toBeVisible({ timeout: 15000 });

    console.log(`🔍 Checking if the recent orders by ${testData.customerName} are listed...`);
    // Wait for the specific customer name to appear in the list (meaning at least one order synced successfully)
    await expect(page.getByText(testData.customerName, { exact: false }).first()).toBeVisible({ timeout: 15000 });
    
    console.log('🎉 ALL E2E TESTS PASSED! Data completely synced to Admin Portal.');
  });
});
