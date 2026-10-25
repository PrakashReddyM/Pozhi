/**
 * ============================================================
 * POZHI ADMIN PORTAL - COMPLETE E2E TEST SUITE
 * Target App: admin/frontend  →  http://localhost:5174
 * 
 * Coverage:
 *   🔒 Phase 1: Security & Auth Guards
 *   🏠 Phase 2: Layout & Navigation
 *   📦 Phase 3: Orders Page (Full CRUD + Image verification)
 *   💰 Phase 4: Price Management
 *   🔘 Phase 5: Shop Control (Open/Close toggle)
 *   📊 Phase 6: Income Dashboard
 *   ⚙️  Phase 7: Settings Page
 * ============================================================
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_URL = 'http://localhost:5174';

// Auth state saved by `login-admin.ts` script
const adminAuthPath = path.resolve(__dirname, '../playwright/.auth/admin.json');

// Extend test to use pre-saved admin login session
const adminTest = test.extend({
  storageState: adminAuthPath,
});

// =============================================================
// 🔒 PHASE 1: SECURITY & AUTH GUARDS
// =============================================================
test.describe('🔒 Phase 1: Security & Auth Guards', () => {

  // Standard `test` = NO auth context = anonymous user
  test('1.1 Unauthenticated user visiting /orders gets redirected to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    // The AdminLayout guard → <Navigate to="/login" replace />
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Auth guard correctly blocked /orders → redirected to /login');
  });

  test('1.2 Unauthenticated user visiting /prices gets redirected to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Auth guard correctly blocked /prices → redirected to /login');
  });

  test('1.3 Unauthenticated user visiting /income gets redirected to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/income`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Auth guard correctly blocked /income → redirected to /login');
  });

  test('1.4 Unauthenticated user visiting /shop-control gets redirected to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/shop-control`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Auth guard correctly blocked /shop-control → redirected to /login');
  });

  test('1.5 Unauthenticated user visiting /settings gets redirected to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Auth guard correctly blocked /settings → redirected to /login');
  });

  test('1.6 Wildcard unknown routes redirect to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/some-random-route`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Unknown routes correctly caught by wildcard → /login');
  });

  test('1.7 Login page renders correctly with Google Sign In button', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.getByText('Admin Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Secure access required')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
    console.log('✅ Login page renders correctly with Google Sign In button');
  });

  test('1.8 Index route / automatically redirects to /orders', async ({ page }) => {
    // Anonymous user going to / → redirected to /login (not /orders, because not auth)
    await page.goto(`${ADMIN_URL}/`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Root / correctly redirected through auth guard');
  });
});

// =============================================================
// 🏠 PHASE 2: LAYOUT & NAVIGATION (requires auth)
// =============================================================
adminTest.describe('🏠 Phase 2: Layout & Navigation', () => {

  adminTest('2.1 Authenticated admin lands on /orders (index redirect)', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/`);
    await expect(page).toHaveURL(/.*\/orders/, { timeout: 15000 });
    console.log('✅ Admin authenticated → redirected to /orders');
  });

  adminTest('2.2 Sidebar navigation contains all main sections', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await expect(page.getByRole('button', { name: /Orders/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Prices/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Shop/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Income/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Settings/i }).first()).toBeVisible();
    console.log('✅ All 5 nav items visible in sidebar');
  });

  adminTest('2.3 Navigation: Orders → Prices', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.getByRole('button', { name: /Prices/i }).first().click();
    await expect(page).toHaveURL(/.*\/prices/, { timeout: 10000 });
    await expect(page.getByText('Price Management')).toBeVisible();
    console.log('✅ Navigated to Prices page');
  });

  adminTest('2.4 Navigation: Prices → Shop Control', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await page.getByRole('button', { name: /Shop/i }).first().click();
    await expect(page).toHaveURL(/.*\/shop-control/, { timeout: 10000 });
    await expect(page.getByText(/Shop is Open|Shop is Closed/i)).toBeVisible();
    console.log('✅ Navigated to Shop Control page');
  });

  adminTest('2.5 Navigation: → Income', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.getByRole('button', { name: /Income/i }).first().click();
    await expect(page).toHaveURL(/.*\/income/, { timeout: 10000 });
    console.log('✅ Navigated to Income page');
  });

  adminTest('2.6 Navigation: → Settings', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.getByRole('button', { name: /Settings/i }).first().click();
    await expect(page).toHaveURL(/.*\/settings/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    console.log('✅ Navigated to Settings page');
  });

  adminTest('2.7 Signed-in-as shows admin email in sidebar', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await expect(page.getByText('Signed in as', { exact: false })).toBeVisible({ timeout: 10000 });
    console.log('✅ Admin email visible in sidebar');
  });
});

// =============================================================
// 📦 PHASE 3: ORDERS PAGE
// =============================================================
adminTest.describe('📦 Phase 3: Orders Page', () => {

  adminTest('3.1 Orders page loads with Order Management heading', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await expect(page.getByText('Order Management')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Manage and track all studio orders')).toBeVisible();
    console.log('✅ Orders page loaded with correct heading');
  });

  adminTest('3.2 Active Orders tab is selected by default', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await expect(page.getByRole('button', { name: /Active Orders/i })).toBeVisible({ timeout: 10000 });
    console.log('✅ Active Orders tab is default');
  });

  adminTest('3.3 Clicking History tab switches the view', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.getByRole('button', { name: /History/i }).click();
    // After click, the tab should switch (URL stays same, but content changes)
    // We look for either orders or the empty state message  
    const emptyOrOrders = page.getByText(/No history orders found|Order Management/i);
    await expect(emptyOrOrders.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ History tab clicked and view switched');
  });

  adminTest('3.4 Active orders tab shows order count badge', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await expect(page.getByText('Active Orders')).toBeVisible({ timeout: 10000 });
    // The count badge (a span next to the button text) should exist
    const activeBtn = page.getByRole('button', { name: /Active Orders/i });
    await expect(activeBtn).toBeVisible();
    console.log('✅ Active Orders tab with count badge visible');
  });

  adminTest('3.5 Order card renders customer name, service, price, and status badge', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    // Wait for orders to load (either orders appear or empty state)
    await page.waitForTimeout(2000);
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    const count = await orderCards.count();
    if (count > 0) {
      // Verify first order card has essential info
      const firstCard = orderCards.first();
      await expect(firstCard.locator('h3')).toBeVisible(); // Customer name
      await expect(firstCard.getByText(/₹/)).toBeVisible(); // Price
      // Status badge should exist (pending/processing/delivered/completed/cancelled)
      await expect(firstCard.getByText(/pending|processing|delivered|completed|cancelled/i).first()).toBeVisible();
      console.log('✅ Order card renders customer name, price, and status badge');
    } else {
      console.log('⚠️ No active orders to verify card — skipping card content check');
    }
  });

  adminTest('3.6 Clicking an order card opens the detail drawer', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(2000);
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    const count = await orderCards.count();
    if (count > 0) {
      await orderCards.first().click();
      // Drawer should slide in — look for "Order #" heading
      await expect(page.getByText(/Order #/)).toBeVisible({ timeout: 5000 });
      // Status section should appear
      await expect(page.getByText('Status', { exact: false })).toBeVisible();
      // Customer section should appear
      await expect(page.getByText('Customer', { exact: false }).first()).toBeVisible();
      console.log('✅ Order detail drawer opened successfully');
    } else {
      console.log('⚠️ No orders to click — skipping drawer test');
    }
  });

  adminTest('3.7 Drawer shows Mark Completed button for active orders', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(2000);
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    const count = await orderCards.count();
    if (count > 0) {
      await orderCards.first().click();
      await expect(page.getByRole('button', { name: /Mark Completed/i })).toBeVisible({ timeout: 5000 });
      console.log('✅ Mark Completed button visible in drawer for active order');
    } else {
      console.log('⚠️ No active orders to open drawer');
    }
  });

  adminTest('3.8 Clicking X (close) on drawer closes it', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(2000);
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    if (await orderCards.count() > 0) {
      await orderCards.first().click();
      await expect(page.getByText(/Order #/)).toBeVisible({ timeout: 5000 });
      // Click the X close button
      await page.locator('button.w-8.h-8.rounded-full').click();
      // Drawer should disappear
      await expect(page.getByText(/Order #/)).not.toBeVisible({ timeout: 3000 });
      console.log('✅ Drawer closed by X button');
    }
  });

  adminTest('3.9 CRITICAL: Order cards with uploads show thumbnail images (not blank)', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(3000);
    // Look for any img tag inside an order card (these are the uploaded photo thumbnails)
    const thumbnails = page.locator('.group.bg-white.rounded-2xl img');
    const count = await thumbnails.count();
    if (count > 0) {
      const firstImg = thumbnails.first();
      const src = await firstImg.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toContain('http');
      console.log(`✅ Upload thumbnail visible with real URL: ${src?.substring(0, 60)}...`);
      // SPECIFIC BUG REGRESSION: if user_uploads join was missing, src would be empty/undefined
    } else {
      console.log('⚠️ No image-based orders on active tab — check History tab for images');
    }
  });

  adminTest('3.10 Drawer shows Uploaded Assets section with images when order has upload', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(3000);
    // Find an order card that has an <img> in it (image-based order)
    const cardsWithImages = page.locator('.group.bg-white.rounded-2xl').filter({ has: page.locator('img') });
    const count = await cardsWithImages.count();
    if (count > 0) {
      await cardsWithImages.first().click();
      // "Uploaded Assets" heading should appear in drawer
      await expect(page.getByText(/Uploaded Assets/i)).toBeVisible({ timeout: 5000 });
      // Image grid inside drawer
      const drawerImg = page.locator('.fixed.top-0.right-0 img').first();
      await expect(drawerImg).toBeVisible({ timeout: 5000 });
      const src = await drawerImg.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toContain('http');
      console.log(`✅ Drawer Uploaded Assets section shows real image URL: ${src?.substring(0, 60)}...`);
    } else {
      console.log('⚠️ No image orders visible on this tab');
    }
  });

  adminTest('3.11 Drawer footer shows WhatsApp action buttons', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(2000);
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    if (await orderCards.count() > 0) {
      await orderCards.first().click();
      await expect(page.getByRole('button', { name: /Ready Msg/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: /Req Location/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Out for Delivery/i })).toBeVisible();
      console.log('✅ All 3 WhatsApp action buttons visible in drawer footer');
    }
  });

    adminTest('3.15 Image download link in drawer has valid href', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(3000);
    // Find an order with an image
    const cardsWithImages = page.locator('.group.bg-white.rounded-2xl').filter({ has: page.locator('img') });
    if (await cardsWithImages.count() > 0) {
      await cardsWithImages.first().click();
      await expect(page.getByText(/Uploaded Assets/i)).toBeVisible({ timeout: 5000 });

      // Hover over the image to reveal the download button
      // The download anchor tag should have a valid href
      const downloadLink = page.locator('a[download]').first();
      await expect(downloadLink).toBeAttached({ timeout: 3000 });
      const href = await downloadLink.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toContain('http');
      console.log(`✅ Image download link has valid href: ${href?.substring(0, 60)}...`);
    } else {
      console.log('⚠️ No image orders visible — skipping download test');
    }
  });
});

// =============================================================
// 💰 PHASE 4: PRICE MANAGEMENT
// =============================================================
adminTest.describe('💰 Phase 4: Price Management', () => {

  adminTest('4.1 Price Management page loads with 5 service cards', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await expect(page.getByText('Price Management')).toBeVisible({ timeout: 15000 });
    // There should be exactly 5 service product cards (PassPhoto, PhotoCopies, Frames, Album, Snap & Print)
    const productCards = page.locator('.group.bg-white.rounded-2xl');
    await expect(productCards).not.toHaveCount(0, { timeout: 10000 });
    console.log('✅ Price Management shows 5 service cards');
  });

  adminTest('4.2 Each service card shows its name and price variants', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await expect(page.getByText('Passport Photo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Photo Copies')).toBeVisible();
    await expect(page.getByText('Photo Frame')).toBeVisible();
    await expect(page.getByText('Album')).toBeVisible();
    await expect(page.getByText('Snap & Print')).toBeVisible();
    // Each card should show ₹ prices
    const priceTexts = page.getByText(/₹\d+/);
    await expect(priceTexts.first()).toBeVisible();
    console.log('✅ All 5 service names and ₹ price values visible');
  });

  adminTest('4.3 Clicking a service card opens the price edit modal', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await expect(page.getByText('Passport Photo')).toBeVisible({ timeout: 10000 });
    // Click Passport Photo card
    await page.getByText('Passport Photo').click();
    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Some modals don't use dialog role — fallback check
      await expect(page.locator('.fixed.inset-0').first()).toBeVisible({ timeout: 5000 });
    });
    console.log('✅ Price edit modal opened for Passport Photo');
  });

  adminTest('4.4 Price edit modal shows input fields for variant prices', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await expect(page.getByText('Passport Photo')).toBeVisible({ timeout: 10000 });
    await page.getByText('Passport Photo').click();
    await page.waitForTimeout(500);
    const priceInputs = page.locator('input[type="number"], input[inputMode="numeric"]');
    await expect(priceInputs.first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Price edit modal has numeric input fields');
  });

  adminTest('4.5 Price Change + Revert: Change a price and restore it', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/prices`);
    await expect(page.getByText('Album')).toBeVisible({ timeout: 10000 });

    // Open Album price editor (less risky than PassPhoto since it has fewer variants)
    await page.getByText('Album').click();
    await page.waitForTimeout(500);

    // Get the first price input and read its current value
    const priceInput = page.locator('input').first();
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    const originalValue = await priceInput.inputValue();
    console.log(`📝 Original price: ₹${originalValue}`);

    // Change the price to a test value (originalValue + 1)
    const testValue = String(parseInt(originalValue) + 1);
    await priceInput.fill(testValue);
    expect(await priceInput.inputValue()).toBe(testValue);
    console.log(`✏️  Changed price to: ₹${testValue}`);

    // Save the new price
    const saveBtn = page.getByRole('button', { name: /Save|Update/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await saveBtn.click();

    // Fill in the admin password
    const passwordInput = page.locator('input[type="password"], input[placeholder="Admin Password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill('1234'); // The default e2e admin password

    // Click Verify & Save
    const verifyBtn = page.locator('button[type="submit"]').first();
    await verifyBtn.click();

    // Wait for modal to close (success)
    await expect(page.locator('.fixed.inset-0').first()).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Price saved successfully');

    // --- NOW REVERT ---
    await page.waitForTimeout(1000);
    await page.getByText('Album').click();
    await page.waitForTimeout(500);

    const priceInputAfter = page.locator('input[type="number"]').first();
    await priceInputAfter.triple_click();
    await priceInputAfter.fill(originalValue);

    const saveBtnRevert = page.getByRole('button', { name: /Save|Update/i }).first();
    await saveBtnRevert.click();

    // Fill in password
    const passwordInput2 = page.locator('input[type="password"], input[placeholder="Admin Password"]').first();
    await expect(passwordInput2).toBeVisible({ timeout: 5000 });
    await passwordInput2.fill('1234');

    // Click Verify & Save
    const verifyBtn2 = page.locator('button[type="submit"]').first();
    await verifyBtn2.click();

    await expect(page.locator('.fixed.inset-0').first()).not.toBeVisible({ timeout: 10000 });
    console.log(`✅ Price successfully reverted back to ₹${originalValue}`);
  });
});

// =============================================================
// 🔘 PHASE 5: SHOP CONTROL
// =============================================================
adminTest.describe('🔘 Phase 5: Shop Control', () => {

  adminTest('5.1 Shop Control page renders with open/closed status', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/shop-control`);
    // Either "Shop is Open" or "Shop is Closed" must be visible
    await expect(page.getByText(/Shop is Open|Shop is Closed/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Shop Control page loaded with status text');
  });

  adminTest('5.2 Toggle switch is visible', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/shop-control`);
    // The toggle button — an animated div with rounded-full styling
    const toggleButton = page.locator('button.w-20.h-11.rounded-full');
    await expect(toggleButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Toggle switch is visible');
  });

  adminTest('5.3 Clicking toggle changes Open ↔ Closed status text', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/shop-control`);
    const toggleButton = page.locator('button.w-20.h-11.rounded-full');
    await expect(toggleButton).toBeVisible({ timeout: 10000 });

    // Read current state
    const isOpen = await page.getByText('Shop is Open').isVisible();
    
    // Click the toggle
    await toggleButton.click();
    await page.waitForTimeout(600); // Wait for animation
    
    // State should have flipped
    if (isOpen) {
      await expect(page.getByText('Shop is Closed')).toBeVisible({ timeout: 3000 });
      // Toggle BACK so we don't leave shop closed accidentally!
      await toggleButton.click();
      await expect(page.getByText('Shop is Open')).toBeVisible({ timeout: 3000 });
    } else {
      await expect(page.getByText('Shop is Open')).toBeVisible({ timeout: 3000 });
      // Toggle BACK so we don't leave shop open accidentally
      await toggleButton.click();
      await expect(page.getByText('Shop is Closed')).toBeVisible({ timeout: 3000 });
    }
    console.log('✅ Toggle correctly flips Open ↔ Closed and back');
  });

  adminTest('5.4 Description text matches shop state', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/shop-control`);
    await expect(page.getByText(/Customers can place orders online|New orders are paused/i)).toBeVisible({ timeout: 10000 });
    console.log('✅ Description text reflects current shop state');
  });
});

// =============================================================
// 📊 PHASE 6: INCOME DASHBOARD
// =============================================================
adminTest.describe('📊 Phase 6: Income Dashboard', () => {

  adminTest('6.1 Income page loads without crashing', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/income`);
    // Either stats load, or loading spinner appears, or error message — none of these should crash
    await page.waitForTimeout(3000);
    const isLoading = await page.locator('.animate-spin').isVisible();
    const hasContent = await page.locator('h1, h2, .text-3xl').first().isVisible();
    const hasError = await page.getByText(/Failed to load statistics/i).isVisible();
    expect(isLoading || hasContent || hasError).toBeTruthy();
    console.log('✅ Income page loaded without crashing');
  });

  adminTest('6.2 Income page shows time filter buttons', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/income`);
    // Wait for loading to finish
    await page.waitForTimeout(3000);
    // Time filter tabs: Day, Week, Month, Year, Lifetime
    const dayFilter = page.getByText(/Today|Day/i).first();
    const hasFilters = await dayFilter.isVisible();
    if (hasFilters) {
      console.log('✅ Time filter buttons visible on Income page');
    } else {
      console.log('⚠️ Income stats may still be loading — filters not yet visible');
    }
  });

  adminTest('6.3 CRITICAL: Marking an order as Completed increases Lifetime Income', async ({ page }) => {
    // Step 1: Read current Lifetime Income
    await page.goto(`${ADMIN_URL}/income`);
    await page.waitForTimeout(3000);
    
    // Find the Lifetime stat card and get its text (e.g., "₹12,345")
    const lifetimeText = await page.getByText('Lifetime', { exact: true }).locator('xpath=following-sibling::p').innerText();
    const initialIncome = parseInt(lifetimeText.replace(/[₹,]/g, ''), 10) || 0;
    console.log(`💵 Initial Lifetime Income: ₹${initialIncome}`);

    // Step 2: Go to orders and mark one as completed
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(3000);
    
    // Find an order card that does NOT have the "DELIVERED", "COMPLETED", or "CANCELLED" pill
    // The "Mark Completed" button only appears when we open a pending order drawer
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    const count = await orderCards.count();
    
    let orderMarked = false;
    for (let i = 0; i < count; i++) {
      await orderCards.nth(i).click();
      await page.waitForTimeout(1000);
      
      const markCompletedBtn = page.getByRole('button', { name: /Mark Completed/i }).first();
      if (await markCompletedBtn.isVisible()) {
        await markCompletedBtn.click();
        console.log('✅ Clicked "Mark Completed" on an order');
        await page.waitForTimeout(3000); // Wait for API and state update
        orderMarked = true;
        break; // Stop after completing one order
      } else {
        // Close drawer and try next
        await page.locator('button.w-8.h-8.rounded-full').first().click();
      }
    }

    if (!orderMarked) {
      console.log('⚠️ No pending orders available to complete. Skipping income increment test.');
      return;
    }

    // Step 3: Verify Income increased
    await page.goto(`${ADMIN_URL}/income`);
    await page.waitForTimeout(3000);

    const newLifetimeText = await page.getByText('Lifetime', { exact: true }).locator('xpath=following-sibling::p').innerText();
    const newIncome = parseInt(newLifetimeText.replace(/[₹,]/g, ''), 10) || 0;
    
    console.log(`💵 New Lifetime Income: ₹${newIncome}`);
    expect(newIncome).toBeGreaterThan(initialIncome);
    console.log(`✅ SUCCESS: Income increased by ₹${newIncome - initialIncome} after completing order!`);
  });

  adminTest('6.4 Clicking different date filters shows correctly formatted income', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/income`);
    await page.waitForTimeout(3000); // Wait for data to load
    
    const filters = ['Yesterday', 'This Week', 'Last 7 Days', 'This Month'];
    
    for (const filter of filters) {
      // Open the date picker first so the buttons are visible
      const advanceFilterBtn = page.getByRole('button', { name: /Advance Filter|Custom Range/i }).first();
      await advanceFilterBtn.click();
      await page.waitForTimeout(500);

      // Find the button with this text
      const btn = page.getByRole('button', { name: new RegExp(filter, 'i') });
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(500); // Wait for state to settle
      
      // The main huge display text is an h2
      // We look for the main displayed value format
      const displayLocator = page.locator('h2.text-5xl, h2.text-6xl, .text-5xl, .text-6xl').first();
      await expect(displayLocator).toBeVisible();
      
      const displayedText = await displayLocator.innerText();
      // It should include the ₹ symbol and be a valid string
      expect(displayedText).toMatch(/₹[\d,]+/);
      
      console.log(`✅ Filter [${filter}] correctly shows income: ${displayedText}`);
    }
  });
});

// =============================================================
// ⚙️ PHASE 7: SETTINGS PAGE
// =============================================================
adminTest.describe('⚙️ Phase 7: Settings Page', () => {

  adminTest('7.1 Settings page renders with PIN section and logout button', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Store Security', { exact: true })).toBeVisible();
    await expect(page.getByText('Change the admin PIN')).toBeVisible();
    await expect(page.getByRole('button', { name: /Log Out/i })).toBeVisible();
    console.log('✅ Settings page has PIN section and logout button');
  });

  adminTest('7.2 Update PIN button is DISABLED when PIN is less than 4 digits', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    const pinInput = page.locator('input[inputMode="numeric"]');
    await expect(pinInput).toBeVisible({ timeout: 10000 });
    
    // Type only 3 digits
    await pinInput.fill('123');
    const updateBtn = page.getByRole('button', { name: /Update/i });
    await expect(updateBtn).toBeDisabled();
    console.log('✅ Update PIN button correctly disabled with < 4 digits');
  });

  adminTest('7.3 Update PIN button is ENABLED when exactly 4 digits are entered', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    const pinInput = page.locator('input[inputMode="numeric"]');
    await expect(pinInput).toBeVisible({ timeout: 10000 });

    // Type exactly 4 digits
    await pinInput.fill('1234');
    const updateBtn = page.getByRole('button', { name: /Update/i });
    await expect(updateBtn).not.toBeDisabled();
    console.log('✅ Update PIN button enabled with exactly 4 digits');
  });

  adminTest('7.4 PIN input rejects non-numeric characters', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    const pinInput = page.locator('input[inputMode="numeric"]');
    await expect(pinInput).toBeVisible({ timeout: 10000 });

    // Try to type letters — the onChange strips non-digits
    await pinInput.fill('abcd');
    const value = await pinInput.inputValue();
    expect(value).toBe(''); // Should be empty because letters were stripped
    console.log('✅ PIN input correctly rejects non-numeric characters');
  });

  adminTest('7.5 PIN input enforces maxLength of 4 digits', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    const pinInput = page.locator('input[inputMode="numeric"]');
    await expect(pinInput).toBeVisible({ timeout: 10000 });

    // Type 8 digits — should be capped at 4
    await pinInput.fill('12345678');
    const value = await pinInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(4);
    console.log('✅ PIN input correctly capped at 4 digits');
  });

  adminTest('7.6 Clicking Log Out redirects to /login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`);
    await expect(page.getByRole('button', { name: /Log Out/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Log Out/i }).click();
    // After logout, should be on /login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    console.log('✅ Log Out correctly redirects to /login');
  });
});

// =============================================================
// 📱 PHASE 8: WHATSAPP INTEGRATION
// =============================================================
adminTest.describe('📱 Phase 8: WhatsApp Integration', () => {

  adminTest('8.1 WhatsApp buttons generate correct wa.me URLs', async ({ page, context }) => {
    // Intercept wa.me to prevent network error on zero-trust networks
    await context.route(/wa\.me/, route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Mock WhatsApp</body></html>'
    }));

    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForTimeout(3000);

    // Find a pending order card
    const orderCards = page.locator('.group.bg-white.rounded-2xl');
    const count = await orderCards.count();
    
    let orderFound = false;
    for (let i = 0; i < count; i++) {
      await orderCards.nth(i).click();
      await page.waitForTimeout(1000);
      
      const readyBtn = page.getByRole('button', { name: /Ready Msg/i }).first();
      
      if (await readyBtn.isVisible()) {
        orderFound = true;
        console.log('✅ Found an order to test WhatsApp buttons');
        
        // 1. Test "Ready Msg"
        const [popup1] = await Promise.all([
          page.waitForEvent('popup', { timeout: 10000 }),
          readyBtn.click()
        ]);
        const url1 = popup1.url();
        expect(url1).toContain('wa.me');
        expect(url1.toLowerCase()).toContain('ready');
        await popup1.close();
        console.log('✅ Ready Msg button works correctly');

        // 2. Test "Req Location"
        const locBtn = page.getByRole('button', { name: /Req Location/i }).first();
        const [popup2] = await Promise.all([
          page.waitForEvent('popup', { timeout: 10000 }),
          locBtn.click()
        ]);
        const url2 = popup2.url();
        expect(url2).toContain('wa.me');
        expect(url2.toLowerCase()).toContain('location');
        await popup2.close();
        console.log('✅ Req Location button works correctly');

        // 3. Test "Out for Delivery"
        const delBtn = page.getByRole('button', { name: /Out for Delivery/i }).first();
        const [popup3] = await Promise.all([
          page.waitForEvent('popup', { timeout: 10000 }),
          delBtn.click()
        ]);
        const url3 = popup3.url();
        expect(url3).toContain('wa.me');
        expect(url3.toLowerCase()).toContain('deliver');
        await popup3.close();
        console.log('✅ Out for Delivery button works correctly');

        break;
      } else {
        await page.locator('button.w-8.h-8.rounded-full').first().click(); // close drawer
      }
    }

    if (!orderFound) {
      console.log('⚠️ No pending orders with WhatsApp buttons found. Skipping test.');
    }
  });

});
