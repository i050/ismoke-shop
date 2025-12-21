# בדיקות E2E למודאל הבאנר

## מטרה
בדיקות End-to-End מקיפות למודאל יצירת/עריכת באנרים, כולל בדיקות נגישות אוטומטיות.

## דרישות מקדימות

### 1. התקנה
כבר הותקן! אם צריך להתקין שוב:
```powershell
npm install -D @playwright/test @axe-core/playwright
npx playwright install
```

### 2. הרצת Servers
לפני הרצת הבדיקות, ודא שה-dev servers רצים:

**Terminal 1 - Backend:**
```powershell
cd c:\react-projects\ecommerce-project\server
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd c:\react-projects\ecommerce-project\client
npm run dev
```

## הרצת הבדיקות

### בדיקות בסיסיות (headless)
```powershell
npm run test:e2e
```

### בדיקות עם UI אינטראקטיבי
```powershell
npm run test:e2e:ui
```

### בדיקות עם דפדפן פתוח (headed mode)
```powershell
npm run test:e2e:headed
```

### בדיקות עם debugging
```powershell
npm run test:e2e:debug
```

### הצגת דוח אחרון
```powershell
npm run test:e2e:report
```

## בדיקות ספציפיות

### הרצת בדיקה אחת בלבד
```powershell
npx playwright test banner-form.spec.ts
```

### הרצה על דפדפן אחד בלבד
```powershell
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### הרצה על מובייל
```powershell
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## מבנה הבדיקות

### `banner-form.spec.ts`
בדיקות מקיפות למודאל:
- ✅ פתיחת מודאל
- ✅ מילוי שדות והצגה בפריוויו
- ✅ בחירת צבעים מ-presets
- ✅ העלאת תמונות
- ✅ שמירת באנר
- ✅ סגירת מודאל
- ✅ ניווט במקלדת
- ✅ Responsive (desktop + mobile)
- ✅ בדיקות נגישות (axe-core)
- ✅ בדיקת ניגודיות צבעים
- ✅ Validation errors

### `helpers.ts`
פונקציות עזר לבדיקות:
- `loginAsAdmin()` - התחברות למערכת
- `openNewBannerModal()` - פתיחת המודאל
- `fillBannerForm()` - מילוי טופס
- `selectColorPreset()` - בחירת צבע
- `checkPreviewAspectRatio()` - בדיקת יחס גובה-רוחב
- `saveBanner()` - שמירה וסגירה
- ועוד...

## התאמות נדרשות

### 1. עדכון credentials להתחברות
ערוך את `helpers.ts` ועדכן:
```typescript
await page.fill('input[type="email"]', 'YOUR_ADMIN_EMAIL');
await page.fill('input[type="password"]', 'YOUR_ADMIN_PASSWORD');
```

### 2. עדכון סלקטורים
אם הטקסטים בכפתורים שונים, עדכן ב-`banner-form.spec.ts`:
```typescript
await page.click('button:has-text("הטקסט שלך")');
```

### 3. הוספת נתיב תמונה לבדיקה
לבדיקת העלאת תמונות, הוסף תמונת בדיקה:
```typescript
await fileInput.setInputFiles('e2e/test-assets/banner-image.jpg');
```

## בדיקות נגישות (Accessibility)

הבדיקות כוללות:
- ✅ ARIA attributes (role, aria-modal, aria-labelledby)
- ✅ Keyboard navigation (Tab, Escape)
- ✅ Focus management
- ✅ Color contrast ratios
- ✅ Screen reader compatibility
- ✅ axe-core automated scans

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd client && npm install
          cd ../server && npm install
      
      - name: Install Playwright
        run: cd client && npx playwright install --with-deps
      
      - name: Start servers
        run: |
          cd server && npm run dev &
          cd client && npm run dev &
          sleep 10
      
      - name: Run E2E tests
        run: cd client && npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: client/playwright-report/
```

## Troubleshooting

### בעיה: "No tests found"
**פתרון:** ודא שהקבצים מסתיימים ב-`.spec.ts` ונמצאים בתיקיית `e2e/`

### בעיה: "Navigation timeout"
**פתרון:** ודא שה-dev servers רצים על הפורטים הנכונים (5173, 5000)

### בעיה: "Element not found"
**פתרון:** עדכן את הסלקטורים בבדיקות להתאמה למבנה האמיתי של הקומפוננטה

### בעיה: "Login failed"
**פתרון:** עדכן את ה-credentials ב-`helpers.ts` או השבת את בדיקת הlogin

## Coverage

להרצת בדיקות עם דוח כיסוי:
```powershell
npm run test:e2e -- --reporter=html
```

הדוח יישמר ב-`playwright-report/index.html`

## Best Practices

1. **הרץ בדיקות לפני commit** - `npm run test:e2e`
2. **שמור screenshots בכשלון** - מוגדר אוטומטית
3. **בדוק על כל הדפדפנים** - לפחות Chrome, Firefox, Safari
4. **בדוק responsive** - desktop + mobile
5. **בדוק נגישות** - axe-core + ידני
6. **עדכן בדיקות עם שינויי UI** - שמור על סינכרון

## זמנים צפויים

- Setup: 30-45 דקות ✅
- כתיבת בדיקות: 45-60 דקות ✅
- Debugging: 30-60 דקות (בהתאם)
- CI/CD: 30-45 דקות (אופציונלי)

**סה"כ:** 2.5-4 שעות (כפי שמצוין בתכנית)
