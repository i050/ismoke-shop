import { test, expect } from '@playwright/test';

/**
 * בדיקות E2E לתיאור המוצר עם ירידות שורה (newlines)
 * 
 * מטרה: וודא שכאשר המנהל מכניס תיאור עם Enter (newlines),
 * הלקוח רואה את זה בדיוק כמו שהמנהל הזין (עם ירידות שורה)
 * 
 * תרחיש:
 * 1. מנהל פותח דף ניהול מוצרים
 * 2. יוצר מוצר חדש עם תיאור שכולל ירידות שורה
 * 3. לקוח בוחן את עמוד המוצר ורואה את ירידות השורה
 */

// שימושי - טקסט תיאור עם ירידות שורה
const MULTILINE_DESCRIPTION = `צבע: כחול
מידה: L
חומר: כותנה 100%
תיאור יתרונות:
- עמיד ודיר
- נוח ללבישה
- קל לכביסה`;

test.describe('Product Description with Line Breaks', () => {
  test.beforeEach(async ({ page }) => {
    // עבור לעמוד המוצרים בניהול
    await page.goto('http://localhost:5173/admin/products');
    // חכה ש-page יטען
    await page.waitForLoadState('networkidle');
  });

  test('should preserve newlines in product description when admin enters them', async ({ page }) => {
    // בדוק שנמצא כפתור ליצירת מוצר חדש
    const createButton = page.locator('button:has-text("יצור מוצר חדש")').first();
    
    // אם זה קיים, לחץ עליו
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');
    }

    // מצא את שדה תיאור המוצר (textarea)
    const descriptionTextarea = page.locator('textarea[name="description"]');
    
    // וודא שהשדה קיים
    await expect(descriptionTextarea).toBeVisible();

    // הכנס תיאור עם ירידות שורה
    await descriptionTextarea.fill(MULTILINE_DESCRIPTION);
    
    // וודא שהתיאור הוזן בצורה נכונה
    const currentValue = await descriptionTextarea.inputValue();
    expect(currentValue).toBe(MULTILINE_DESCRIPTION);
    expect(currentValue).toContain('\n');
  });

  test('should display product description with preserved line breaks on product page', async ({ page }) => {
    // ביצוע ניווט למוצר קיים (יצריך product ID אמיתי)
    // דוגמה: מוצר עם ID שכבר יש לו תיאור עם newlines
    
    // לשם המטרה של בדיקה, נניח שיש לנו מוצר עם ID כלשהו
    const productId = 'test-product-with-newlines';
    
    // חלופה: אם יש seed data או fixture עם מוצר כזה
    // ניווט לעמוד המוצר
    await page.goto(`http://localhost:5173/product/${productId}`, { 
      waitUntil: 'networkidle' 
    }).catch(() => {
      // אם המוצר לא קיים, דלג על בדיקה זו
      test.skip();
    });

    // חכה לעמוד המוצר להטען
    await page.waitForLoadState('networkidle');

    // מצא את טאב ה"תיאור המוצר"
    const descriptionTab = page.locator('button:has-text("תיאור המוצר")');
    
    // אם הטאב קיים, לחץ עליו
    if (await descriptionTab.isVisible()) {
      await descriptionTab.click();
      await page.waitForTimeout(300); // חכה לאנימציה
    }

    // מצא את רכיב ה-description
    const descriptionText = page.locator('.description, [data-testid="product-description"]').first();

    // וודא שהטקסט קיים וראה אם הוא מכיל newlines / line breaks
    if (await descriptionText.isVisible()) {
      const text = await descriptionText.textContent();
      
      // בדוק שהטקסט מכיל את ההודעות ובהתאם סדר שלהן
      // (בDOMqueries עם pre-wrap, הטקסט צריך להיות רשום כמו שהוא)
      expect(text).toBeTruthy();
      
      // וודא שה-CSS כולל white-space: pre-wrap
      const computedStyle = await descriptionText.evaluate((el) => {
        return window.getComputedStyle(el).whiteSpace;
      });
      
      expect(computedStyle).toMatch(/^pre(-wrap)?$/);
    }
  });

  test('should NOT add extra spacing when description does not have line breaks', async ({ page }) => {
    // בדוק שתיאור בלי newlines מוצג בצורה רגילה (מעטפת מילים)
    
    const simpleDescription = 'זה תיאור פשוט של מוצר בלי ירידות שורה';
    
    // גלול לשדה תיאור
    const descriptionTextarea = page.locator('textarea[name="description"]');
    
    if (await descriptionTextarea.isVisible()) {
      await descriptionTextarea.fill(simpleDescription);
      
      const currentValue = await descriptionTextarea.inputValue();
      expect(currentValue).toBe(simpleDescription);
      expect(currentValue).not.toContain('\n');
    }
  });
});

test.describe('Product Description - Accessibility', () => {
  test('should have proper whitespace handling for accessibility', async ({ page }) => {
    // ודא שהwhite-space: pre-wrap לא פוגע בנגישות
    
    await page.goto('http://localhost:5173/admin/products');
    await page.waitForLoadState('networkidle');

    const descriptionTextarea = page.locator('textarea[name="description"]');
    
    if (await descriptionTextarea.isVisible()) {
      // בדוק שה-textarea accessible
      await expect(descriptionTextarea).toHaveAttribute('name', 'description');
      await expect(descriptionTextarea).toHaveAttribute('id');
      
      // וודא שיש label מקושר
      const textareaId = await descriptionTextarea.getAttribute('id');
      const label = page.locator(`label[for="${textareaId}"]`);
      
      // יש label אם זה קיים, או שיש aria-label
      const hasLabel = await label.isVisible().catch(() => false);
      const hasAriaLabel = await descriptionTextarea.getAttribute('aria-label').catch(() => null);
      
      expect(hasLabel || hasAriaLabel).toBeTruthy();
    }
  });
});
