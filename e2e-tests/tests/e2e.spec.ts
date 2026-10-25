import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('End to End Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Optionally login if required for checkout
    // Or we can let checkout handle the redirect
  });

  test('PassPhoto Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/studio/passphoto`);
    await expect(page.locator('text=Select Size')).toBeVisible({ timeout: 10000 });
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
    });

    await expect(page.locator('.photo-preview-image, img, .rounded-xl').first()).toBeVisible();
    await page.getByText('Buy Now', { exact: false }).first().click();
    await expect(page).toHaveURL(/.*(\/checkout|\/account\?redirectTo)/);
  });

  test('PhotoCopies Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/studio/photocopies`);
    await expect(page.getByText('Photo Copies', { exact: false })).toBeVisible({ timeout: 10000 });
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
    });

    await page.getByText('Buy Now', { exact: false }).first().click();
    await expect(page).toHaveURL(/.*(\/checkout|\/account\?redirectTo)/);
  });

  test('Frames Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/studio/frames`);
    await expect(page.locator('text=Premium Wall Frames')).toBeVisible({ timeout: 10000 });
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
    });

    await page.getByText('Buy Now', { exact: false }).first().click();
    await expect(page).toHaveURL(/.*(\/checkout|\/account\?redirectTo)/);
  });

  test('SnapnPrint Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/studio/snapnprint`);
    await expect(page.getByText('Snap n\' Print', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Album Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/studio/album`);
    await expect(page.getByText('Album', { exact: false }).first()).toBeVisible({ timeout: 10000 });
    
    // Album defaults to "Basic" cover which does not require uploading a file
    await page.getByText('Buy Now', { exact: false }).first().click();
    await expect(page).toHaveURL(/.*(\/checkout|\/account\?redirectTo)/);
  });

});
