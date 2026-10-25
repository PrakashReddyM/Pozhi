const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'tests/admin-portal-e2e.spec.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix 4.5 Price Change Revert
// Need to handle the password step.
const originalPriceChange = `    // Save the new price
    const saveBtn = page.getByRole('button', { name: /Save|Update/i }).first();
    await saveBtn.click();
    
    // Wait for modal to close (success)
    await expect(page.locator('.fixed.inset-0').first()).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Price saved successfully');`;

const fixedPriceChange = `    // Click Update Prices to proceed to confirm step
    const updateBtn = page.getByRole('button', { name: /Update Prices/i }).first();
    await updateBtn.click();
    
    // Fill in the admin password
    const passwordInput = page.locator('input[type="password"], input[placeholder="Admin Password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill('1234'); // The default e2e admin password

    // Click Verify & Save
    const verifyBtn = page.getByRole('button', { name: /Verify & Save/i }).first();
    await verifyBtn.click();
    
    // Wait for modal to close (success)
    await expect(page.locator('.fixed.inset-0').first()).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Price saved successfully');`;
content = content.replace(originalPriceChange, fixedPriceChange);


// Need to handle the Revert part of 4.5 as well!
const originalRevert = `    // Open Album price editor again
    await page.getByText('Album').click();
    await page.waitForTimeout(500);

    const revertPriceInput = page.locator('input').first();
    await expect(revertPriceInput).toBeVisible({ timeout: 5000 });
    await revertPriceInput.fill(originalValue);
    console.log(\`✏️  Reverted price to: ₹\${originalValue}\`);

    // Save
    const saveBtn2 = page.getByRole('button', { name: /Save|Update/i }).first();
    await saveBtn2.click();

    // Wait for close
    await expect(page.locator('.fixed.inset-0').first()).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Revert saved successfully');`;

const fixedRevert = `    // Open Album price editor again
    await page.getByText('Album').click();
    await page.waitForTimeout(500);

    const revertPriceInput = page.locator('input').first();
    await expect(revertPriceInput).toBeVisible({ timeout: 5000 });
    await revertPriceInput.fill(originalValue);
    console.log(\`✏️  Reverted price to: ₹\${originalValue}\`);

    // Proceed to confirm step
    const updateBtn2 = page.getByRole('button', { name: /Update Prices/i }).first();
    await updateBtn2.click();

    // Fill in password
    const passwordInput2 = page.locator('input[type="password"], input[placeholder="Admin Password"]').first();
    await expect(passwordInput2).toBeVisible({ timeout: 5000 });
    await passwordInput2.fill('1234');

    // Click Verify & Save
    const verifyBtn2 = page.getByRole('button', { name: /Verify & Save/i }).first();
    await verifyBtn2.click();

    // Wait for close
    await expect(page.locator('.fixed.inset-0').first()).not.toBeVisible({ timeout: 10000 });
    console.log('✅ Revert saved successfully');`;
content = content.replace(originalRevert, fixedRevert);


// 2. Fix 6.3 Income Increment
const originalIncomeIncrement1 = `const lifetimeCard = page.locator('.bg-white').filter({ hasText: /Lifetime/i }).first();\n    const lifetimeText = await lifetimeCard.locator('p').nth(1).innerText();`;
const fixedIncomeIncrement1 = `const lifetimeText = await page.getByText('Lifetime', { exact: true }).locator('xpath=following-sibling::p').innerText();`;
content = content.replace(originalIncomeIncrement1, fixedIncomeIncrement1);

const originalIncomeIncrement2 = `const newLifetimeCard = page.locator('.bg-white').filter({ hasText: /Lifetime/i }).first();\n    const newLifetimeText = await newLifetimeCard.locator('p').nth(1).innerText();`;
const fixedIncomeIncrement2 = `const newLifetimeText = await page.getByText('Lifetime', { exact: true }).locator('xpath=following-sibling::p').innerText();`;
content = content.replace(originalIncomeIncrement2, fixedIncomeIncrement2);


// 3. Fix 6.4 Filters
const originalFilters = `const filters = ['Yesterday', 'This Week', 'Last 7 Days', 'This Month'];\n    \n    for (const filter of filters) {\n      // Find the button with this exact text\n      const btn = page.getByRole('button', { name: new RegExp(filter, 'i') });\n      await expect(btn).toBeVisible();\n      await btn.click();`;
const fixedFilters = `const filters = ['Yesterday', 'This Week', 'Last 7 Days', 'This Month'];\n    \n    for (const filter of filters) {\n      // Open the date picker first so the buttons are visible\n      await page.getByRole('button', { name: /Filter Timeline/i }).click();\n      await page.waitForTimeout(500);\n\n      // Find the button with this text\n      const btn = page.getByRole('button', { name: new RegExp(filter, 'i') });\n      await expect(btn).toBeVisible();\n      await btn.click();`;
content = content.replace(originalFilters, fixedFilters);

fs.writeFileSync(filePath, content);
console.log('Successfully patched admin-portal-e2e.spec.ts round 3');
