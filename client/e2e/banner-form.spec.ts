import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * בדיקות E2E למודאל יצירת/עריכת באנר
 * מטרה: לוודא שהמודאל פועל כראוי בכל השלבים
 */

test.describe('BannerForm Modal - E2E Tests', () => {
  
  // הגדרות כלליות לכל הבדיקות
  test.beforeEach(async ({ page }) => {
    // התחברות כמנהל (התאם את הנתיבים בהתאם למערכת שלך)
    await page.goto('/login');
    
    // מילוי טופס התחברות - התאם credentials בהתאם למערכת
    // לדוגמה:
    // await page.fill('input[name="email"]', 'admin@example.com');
    // await page.fill('input[name="password"]', 'admin123');
    // await page.click('button[type="submit"]');
    
    // המתן לטעינה מלאה
    await page.waitForLoadState('networkidle');
    
    // ניווט לדף ניהול באנרים
    await page.goto('/admin/banners');
    await page.waitForLoadState('networkidle');
  });

  test('פתיחת מודאל יצירת באנר חדש', async ({ page }) => {
    // לחיצה על כפתור יצירת באנר חדש
    await page.click('button:has-text("צור באנר חדש")');
    
    // וידוא שהמודאל נפתח
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // וידוא שהכותרת נכונה
    await expect(modal.locator('h2')).toContainText('יצירת באנר חדש');
    
    // וידוא שהפריוויו מוצג
    const preview = modal.locator('.banner-preview');
    await expect(preview).toBeVisible();
    
    // וידוא aspect-ratio (desktop)
    const boundingBox = await preview.boundingBox();
    if (boundingBox) {
      const ratio = boundingBox.width / boundingBox.height;
      // aspect-ratio: 3/1 = 3.0 (עם טולרנס קטן)
      expect(ratio).toBeGreaterThan(2.8);
      expect(ratio).toBeLessThan(3.2);
    }
  });

  test('מילוי שדות והצגה בפריוויו', async ({ page }) => {
    // פתיחת מודאל
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // מילוי שדות טקסט
    await modal.locator('input[name="title"]').fill('באנר חדש מדהים');
    await modal.locator('textarea[name="description"]').fill('תיאור מעניין לבאנר');
    await modal.locator('input[name="buttonText"]').fill('לחץ כאן');
    await modal.locator('input[name="buttonLink"]').fill('/products');
    
    // וידוא שהטקסט מוצג בפריוויו
    const preview = modal.locator('.banner-preview');
    await expect(preview.locator('.preview-title')).toContainText('באנר חדש מדהים');
    await expect(preview.locator('.preview-desc')).toContainText('תיאור מעניין לבאנר');
    await expect(preview.locator('.preview-cta')).toContainText('לחץ כאן');
  });

  test('בחירת צבעים מה-presets והצגה בפריוויו', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // בחירת preset לכותרת (הראשון ברשימה)
    await modal.locator('.color-presets').first().locator('.color-swatch').first().click();
    
    // וידוא שה-swatch מסומן כ-active
    await expect(
      modal.locator('.color-presets').first().locator('.color-swatch.active')
    ).toBeVisible();
    
    // וידוא שערך ה-hex מוצג
    const hexValue = modal.locator('.color-value').first();
    await expect(hexValue).toBeVisible();
    const hexText = await hexValue.textContent();
    expect(hexText).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('העלאת תמונה ותצוגה מקדימה', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // העלאת תמונה (דורש קובץ מדומה או קובץ אמיתי בנתיב)
    const fileInput = modal.locator('input[type="file"]');
    
    // יצירת קובץ מדומה (במציאות תשתמש בקובץ אמיתי)
    // await fileInput.setInputFiles('path/to/test-image.jpg');
    
    // וידוא שהתמונה הועלתה והתצוגה המקדימה מוצגת
    // await expect(modal.locator('.image-preview')).toBeVisible();
    
    // הערה: בדיקה זו דורשת קובץ תמונה אמיתי או mock
    // ניתן לדלג עליה או לספק קובץ test
  });

  test('שמירת באנר חדש וסגירת המודאל', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // מילוי שדות חובה
    await modal.locator('input[name="title"]').fill('באנר לבדיקה');
    await modal.locator('textarea[name="description"]').fill('תיאור');
    await modal.locator('input[name="buttonText"]').fill('קליק');
    await modal.locator('input[name="buttonLink"]').fill('/test');
    
    // לחיצה על שמירה
    await modal.locator('button:has-text("פרסם")').click();
    
    // וידוא שהמודאל נסגר
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    
    // וידוא שהבאנר החדש מופיע ברשימה (אם יש רשימה)
    // await expect(page.locator('text=באנר לבדיקה')).toBeVisible();
  });

  test('סגירת מודאל בלחיצה על X', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // וידוא שהמודאל פתוח
    await expect(modal).toBeVisible();
    
    // לחיצה על כפתור סגירה
    await modal.locator('.close-btn').click();
    
    // וידוא שהמודאל נסגר
    await expect(modal).not.toBeVisible();
  });

  test('ניווט במקלדת (keyboard navigation)', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // מעבר בין שדות ב-Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // וידוא שהפוקוס עובר בין אלמנטים
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // לחיצה על Escape לסגירה
    await page.keyboard.press('Escape');
    
    // וידוא שהמודאל נסגר
    await expect(modal).not.toBeVisible();
  });

  test('בדיקת responsive - מובייל (aspect-ratio 16:9)', async ({ page, viewport }) => {
    // שינוי viewport למובייל
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // וידוא שהפריוויו עדיין מוצג
    const preview = modal.locator('.banner-preview');
    await expect(preview).toBeVisible();
    
    // וידוא aspect-ratio במובייל (16:9)
    const boundingBox = await preview.boundingBox();
    if (boundingBox) {
      const ratio = boundingBox.width / boundingBox.height;
      // aspect-ratio: 16/9 ≈ 1.78
      expect(ratio).toBeGreaterThan(1.6);
      expect(ratio).toBeLessThan(2.0);
    }
  });

  test('בדיקת נגישות (accessibility) עם axe-core', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // וידוא שהמודאל פתוח
    await expect(modal).toBeVisible();
    
    // הרצת בדיקת נגישות
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    // וידוא שאין בעיות נגישות קריטיות
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('בדיקת ניגודיות צבעים (contrast ratio)', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // מילוי שדות
    await modal.locator('input[name="title"]').fill('כותרת בדיקה');
    
    // בחירת צבעים
    const titleColorInput = modal.locator('input[name="titleColor"]');
    await titleColorInput.fill('#ffffff');
    
    // הערה: בדיקת ניגודיות דורשת גישה לצבע הרקע
    // ניתן להוסיף לוגיקה נוספת לחישוב ניגודיות מול הרקע
    
    // וידוא שהטקסט קריא (בדיקה ויזואלית)
    const previewTitle = modal.locator('.preview-title');
    await expect(previewTitle).toBeVisible();
  });

  test('עריכת באנר קיים', async ({ page }) => {
    // הערה: בדיקה זו דורשת באנר קיים במערכת
    // ניתן ליצור באנר קודם או להשתמש ב-mock data
    
    // לחיצה על כפתור עריכה (אם קיים)
    // await page.click('button:has-text("ערוך")').first();
    
    // וידוא שהמודאל נפתח עם נתונים קיימים
    // const modal = page.locator('[role="dialog"]');
    // await expect(modal.locator('input[name="title"]')).not.toBeEmpty();
  });

  test('בדיקת validation - שדות חובה', async ({ page }) => {
    await page.click('button:has-text("צור באנר חדש")');
    const modal = page.locator('[role="dialog"]');
    
    // לחיצה על שמירה ללא מילוי שדות
    await modal.locator('button:has-text("פרסם")').click();
    
    // וידוא שמוצגות הודעות שגיאה
    const errorMessages = modal.locator('.error-message');
    await expect(errorMessages.first()).toBeVisible();
  });
});
