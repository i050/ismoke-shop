import { Page, expect } from '@playwright/test';

/**
 * פונקציות עזר לבדיקות E2E של מודאל הבאנר
 */

/**
 * התחברות כמנהל למערכת
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  
  // התאם את הסלקטורים בהתאם למבנה הטופס שלך
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  // המתן עד שה-URL משתנה (אינדיקציה להתחברות מוצלחת)
  await page.waitForURL('**/admin**', { timeout: 10000 });
}

/**
 * פתיחת מודאל יצירת באנר חדש
 */
export async function openNewBannerModal(page: Page) {
  // ניווט לדף ניהול באנרים
  await page.goto('/admin/banners');
  await page.waitForLoadState('networkidle');
  
  // לחיצה על כפתור יצירה (התאם את הטקסט)
  await page.click('button:has-text("צור באנר"), button:has-text("הוסף באנר"), button:has-text("באנר חדש")');
  
  // המתן עד שהמודאל יופיע
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  
  return modal;
}

/**
 * מילוי טופס באנר בסיסי
 */
export async function fillBannerForm(
  page: Page,
  data: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  }
) {
  const modal = page.locator('[role="dialog"]');
  
  await modal.locator('input[name="title"]').fill(data.title);
  await modal.locator('textarea[name="description"]').fill(data.description);
  await modal.locator('input[name="buttonText"]').fill(data.buttonText);
  await modal.locator('input[name="buttonLink"]').fill(data.buttonLink);
}

/**
 * בחירת צבע מה-presets
 */
export async function selectColorPreset(
  page: Page,
  colorGroupIndex: number,
  swatchIndex: number
) {
  const modal = page.locator('[role="dialog"]');
  const colorGroups = modal.locator('.color-presets');
  const targetGroup = colorGroups.nth(colorGroupIndex);
  const targetSwatch = targetGroup.locator('.color-swatch').nth(swatchIndex);
  
  await targetSwatch.click();
  
  // וידוא שנבחר
  await expect(targetSwatch).toHaveClass(/active/);
}

/**
 * בדיקת aspect-ratio של הפריוויו
 */
export async function checkPreviewAspectRatio(
  page: Page,
  expectedRatio: number,
  tolerance: number = 0.2
) {
  const modal = page.locator('[role="dialog"]');
  const preview = modal.locator('.banner-preview');
  
  const boundingBox = await preview.boundingBox();
  if (!boundingBox) {
    throw new Error('Preview element not found');
  }
  
  const actualRatio = boundingBox.width / boundingBox.height;
  expect(actualRatio).toBeGreaterThan(expectedRatio - tolerance);
  expect(actualRatio).toBeLessThan(expectedRatio + tolerance);
}

/**
 * שמירת באנר וסגירת המודאל
 */
export async function saveBanner(page: Page) {
  const modal = page.locator('[role="dialog"]');
  
  // לחיצה על כפתור שמירה/פרסום
  await modal.locator('button:has-text("פרסם"), button:has-text("שמור"), button:has-text("צור")').click();
  
  // המתן עד שהמודאל ייסגר
  await expect(modal).not.toBeVisible({ timeout: 10000 });
}

/**
 * סגירת המודאל ללא שמירה
 */
export async function closeBannerModal(page: Page) {
  const modal = page.locator('[role="dialog"]');
  
  // לחיצה על X או Escape
  const closeButton = modal.locator('.close-btn, button[aria-label*="סגור"]');
  
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    await page.keyboard.press('Escape');
  }
  
  // וידוא שנסגר
  await expect(modal).not.toBeVisible();
}

/**
 * בדיקת validation errors
 */
export async function expectValidationErrors(page: Page) {
  const modal = page.locator('[role="dialog"]');
  const errorMessages = modal.locator('.error-message');
  
  // וידוא שיש לפחות הודעת שגיאה אחת
  await expect(errorMessages.first()).toBeVisible();
  
  return errorMessages;
}

/**
 * בדיקת הצגת ערכי hex בצד color pickers
 */
export async function checkHexValueDisplay(page: Page, colorGroupIndex: number) {
  const modal = page.locator('[role="dialog"]');
  const hexValue = modal.locator('.color-value').nth(colorGroupIndex);
  
  await expect(hexValue).toBeVisible();
  
  const text = await hexValue.textContent();
  expect(text).toMatch(/^#[0-9A-Fa-f]{6}$/);
  
  return text;
}

/**
 * המתנה עד שהדף נטען במלואו
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * צילום מסך להשוואה
 */
export async function takeModalScreenshot(page: Page, name: string) {
  const modal = page.locator('[role="dialog"]');
  await modal.screenshot({ path: `e2e/screenshots/${name}.png` });
}
