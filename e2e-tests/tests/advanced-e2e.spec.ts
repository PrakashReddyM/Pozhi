import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Standard test uses our logged-in state!
const authenticatedTest = test.extend({
  storageState: path.resolve(__dirname, '../playwright/.auth/user.json'),
});

// Load configuration
const configPath = path.resolve(__dirname, '../test-data.json');
const testData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

authenticatedTest.describe('Advanced E2E Customer Scenarios', () => {

  authenticatedTest('1. Customer Portal: Verify Order Tracking', async ({ page }) => {
    console.log('🕵️ Checking Customer Portal Order History...');
    await page.goto('http://localhost:8080/account');
    
    // Wait for the account page to load
    await expect(page.getByText('Order History', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    
    // Verify that the orders actually show up (Look for "Pending" status or the Order ID format)
    // The exact text depends on your UI, but "Pending" or "POZHI-" should exist if orders were placed!
    const pendingOrder = page.getByText(/Pending|POZHI-/i).first();
    await expect(pendingOrder).toBeVisible({ timeout: 15000 });
    console.log('✅ Order successfully found in Customer Portal!');
  });

  authenticatedTest('2. Clumsy Customer: Form Validation', async ({ page }) => {
    console.log('🤦‍♂️ Simulating clumsy checkout...');
    
    // 1. Go to a service and click Buy Now
    await page.goto('http://localhost:8080/studio/album');
    await page.getByText('Buy Now', { exact: false }).first().click();
    await page.waitForURL(/.*\/checkout/, { timeout: 10000 });

    // 2. Clear out the fields to simulate missing data
    const nameInput = page.locator('input[type="text"]');
    const mobileInput = page.locator('input[type="tel"]');
    const addressInput = page.locator('textarea');

    await nameInput.fill('');
    await mobileInput.fill('');
    await addressInput.fill('');

    // 3. Verify that the "Place Order" button is disabled!
    const placeOrderBtn = page.getByRole('button', { name: /Place Order/i });
    await expect(placeOrderBtn).toBeDisabled();
    console.log('✅ Form validation successfully blocked the empty order!');
  });

  authenticatedTest('3. Invalid File Attack', async ({ page }) => {
    console.log('💣 Attempting to upload a non-image file...');
    await page.goto('http://localhost:8080/studio/passphoto');

    // Create a fake text file to upload
    const fakeTextFile = Buffer.from('This is a text file, not an image!');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'attack.txt', mimeType: 'text/plain', buffer: fakeTextFile });

    // Your frontend should block it (either by rejecting the file input or showing a toast error)
    // Wait a brief moment to see if an error toast pops up, or if the preview image fails to render
    // If the app correctly blocks non-images, the preview image container won't appear
    await expect(page.locator('.photo-preview-image, img, .rounded-xl').first()).not.toBeVisible({ timeout: 3000 });
    console.log('✅ Invalid file successfully rejected by the frontend!');
  });

  authenticatedTest('4. Gift Wrap Money Check', async ({ page }) => {
    console.log('🎁 Verifying Gift Wrap pricing logic...');
    
    await page.goto('http://localhost:8080/studio/album');
    await page.getByText('Buy Now', { exact: false }).first().click();
    await page.waitForURL(/.*\/checkout/, { timeout: 10000 });

    // Look for the Total Price element
    // This assumes the total price has a ₹ symbol next to it
    const priceTextBefore = await page.getByText(/Total.*₹/i).first().innerText();
    const numericPriceBefore = parseInt(priceTextBefore.replace(/[^0-9]/g, ''));
    console.log(`Original Price: ₹${numericPriceBefore}`);

    // Click the Gift Wrap Checkbox
    // Assuming the checkbox has the id "giftwrap" or label "Gift Wrap"
    await page.locator('button[role="checkbox"]').first().click();

    // Wait for the UI to update the price
    await page.waitForTimeout(500);

    const priceTextAfter = await page.getByText(/Total.*₹/i).first().innerText();
    const numericPriceAfter = parseInt(priceTextAfter.replace(/[^0-9]/g, ''));
    console.log(`New Price: ₹${numericPriceAfter}`);

    // Verify it increased by exactly 30
    expect(numericPriceAfter).toBe(numericPriceBefore + 30);
    console.log('✅ Gift wrap mathematically verified! (Added ₹30)');
  });

  authenticatedTest('5. Full Circle Admin: Order Fulfillment', async ({ page }) => {
    console.log('👑 Admin testing order fulfillment...');
    await page.goto('http://localhost:8080/admin/orders');
    
    await expect(page.getByText('Live Dashboard', { exact: false }).first()).toBeVisible({ timeout: 10000 });

    // Find the first order status dropdown and change it
    // Wait for the rows to load
    const pendingStatus = page.getByText('Pending').first();
    await expect(pendingStatus).toBeVisible({ timeout: 10000 });

    // Click on the status badge/dropdown
    await pendingStatus.click();
    
    // Select 'Completed' from the options
    await page.getByText('Completed', { exact: true }).first().click();

    // Wait for the success toast or UI update
    await expect(page.getByText('Completed').first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Admin successfully changed order status to Completed!');
  });
});

// For this test, we want to simulate a completely anonymous, unauthenticated user
// So we use standard `test` which does NOT inherit the storageState!
test.describe('Security & Edge Cases', () => {
  
  test('6. Direct Link Sneak (Logged Out)', async ({ page }) => {
    console.log('🕵️‍♀️ Testing forced redirect for unauthorized users...');
    
    // Try to visit checkout directly without logging in
    await page.goto('http://localhost:8080/checkout');
    
    // It should instantly kick us out and redirect to the home page or login page!
    // Let's verify the URL changes away from /checkout
    await expect(page).not.toHaveURL(/.*\/checkout/);
    console.log('✅ Unauthorized access successfully blocked!');
  });
});
