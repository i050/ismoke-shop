import { test, expect } from '@playwright/test';

test.describe('Color family detection & manual override', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    // TODO: login flow - add real credentials or mock auth
    await page.waitForLoadState('networkidle');
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');
  });

  test('Auto-detect color family for HEX and allow manual override', async ({ page }) => {
    // open product creation
    await page.click('button:has-text("צור מוצר חדש")');
    await page.waitForSelector('[role="dialog"]');
    // open Add SKU modal
    await page.click('button:has-text("הוסף SKU")');
    await page.waitForSelector('[role="dialog"]');
    const modal = page.locator('[role="dialog"]');

    // set SKU color to dark charcoal - should map to black family
    await modal.locator('input[name="color"]').fill('#2C2C2C');
    // wait for detection result
    await expect(modal.locator('.colorFamilies .selectedFamily strong')).toContainText('שחור');

    // change color to blue hex - should update auto family
    await modal.locator('input[name="color"]').fill('#0000FF');
    await expect(modal.locator('.colorFamilies .selectedFamily strong')).toContainText('כחול');

    // now set manual override to 'אפור' (gray)
    await modal.locator('.familyControl select').selectOption({ label: 'אפור' });
    // verify source changed and family remains gray after changing color
    await modal.locator('input[name="color"]').fill('#00FF00'); // green
    await expect(modal.locator('.colorFamilies .selectedFamily strong')).toContainText('אפור');

    // set back to auto
    await modal.locator('.familyControl select').selectOption({ value: 'auto' });
    await modal.locator('input[name="color"]').fill('#00FF00'); // green
    await expect(modal.locator('.colorFamilies .selectedFamily strong')).toContainText('ירוק');
  });
});
