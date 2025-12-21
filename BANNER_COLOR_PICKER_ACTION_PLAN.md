**תוכנית פעולה מעודכנת: שימוש בקומפוננטת צבעי הוריאנטים (`ColorSelect`) לעריכת באנר**

מטרת המסמך: להגדיר שלב-אחר-שלב איך לייבא, להתאים ולהטמיע את קומפוננטת בחירת הצבעים שמשרתת את הוריאנטים (`ColorSelect` + `HexColorPicker`) בתוך `BannerForm`, כולל עדכוני UX, נגישות, בדיקות ורגרסיות.

**הנחות מקדימות**
- הקוד הרלוונטי: `client/src/components/ui/ColorSelect/ColorSelect.tsx`, `client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKURow.tsx`, `client/src/components/features/admin/BannerManagement/BannerForm/BannerForm.tsx`.
- `client/src/lib/colorUtils.ts` כבר קיים ומשמש את `BannerForm` ל־`normalizeHex` ו־`contrastRatio`.
- סכימת הבאנר כבר תומכת בצבעים ו־`overlayOpacity` בצד השרת (`server/src/models/Banner.ts`, `server/src/controllers/bannerController.ts`).

**תקציר**
- ממחזרים את `ColorSelect` (וה־popup שמוגדר ב־`SKURow`) לבחירת צבעי טקסט/CTA בבאנר.
- מוסיפים יכולות חסרות לקומפוננטה (presets, showConfirmButtons, ariaLabel וכו') כדי שתתאים לשני שימושים.
- מרחיבים את `colorUtils` הקיים בפונקציות contrast/pickBestContrast במקום ליצור קובץ חדש.
- מעדכנים את `BannerForm` לשימוש בקומפוננטה החדשה, מפעילים הצעת צבע אופטימלי ובודקים optimistic locking וה־cache.
- מריצים סט מלא של בדיקות (TS, יחידה, נגישות, E2E, visual regression) לפני merge.

---

## שלבים מפורטים

### 1. ניתוח הקומפוננטות הקיימות
- לקרוא את `ColorSelect.tsx` ולמפות בדיוק את ה־props וההתנהגות הנוכחית.
- לקרוא את `SKURow.tsx` כדי להבין איך `ColorSelect` משולב עם `HexColorPicker` ועם כפתורי אישור/ביטול.
- לתעד אילו חלקים יש לשחזר בבאנר (dropdown, presets, popup) ומה ניתן להסיר.

### 2. הרחבת `ColorSelect`
- להוסיף ל־`ColorSelectProps`:
  - `presets?: string[]`
  - `showConfirmButtons?: boolean`
  - `allowCustomHex?: boolean`
  - `ariaLabel?: string`
  - `popperPlacement?: 'top' | 'bottom' | 'auto'`
- להבטיח שהקומפוננטה תומכת ב־controlled mode ללא החזקת state סותר.
- להוסיף אפשרות להציג picker inline או כ-popup, מבלי לפגוע בשימוש הקיים ב־`SKURow`.
- לכתוב הערות קוד קצרות בעברית כדי להסביר את הזרימה.

### 3. התאמה ל־UX של BannerForm
- BannerForm צריך preview חי ולכן `showConfirmButtons=false`.
- להוסיף handling של focus: בעת פתיחת popup הפוקוס עובר לפנים, ו־ESC/קליק בחוץ מחזירים לפתח.
- להגדיר aria תואם (`role="listbox"`, `aria-expanded`, `aria-controls`).
- להשתמש ב־`presets` מותאמים (אפשר `AVAILABLE_COLORS` או סט ממותג).

### 4. לוגיקת contrast משותפת
- להוסיף ל־`client/src/lib/colorUtils.ts` פונקציה `pickBestContrast(candidates: string[], backgroundHex: string | null)`.
- לכתוב בדיקות יחידה לפונקציה (מקרי שחור/לבן, רקע כהה/בהיר, רקע חסר).
- לוודא שמי שמייבא את הפונקציה (BannerForm) משתמש בקלט מגובה (אם רקע null -> חזור לברירת מחדל).

### 5. עדכון `BannerForm`
- להחליף את בלוקי בחירת הצבע בטאבים "עיצוב" ו־"CTA" ב־`ColorSelect`.
- לקחת בחשבון:
  - `value={formData.xxxColor ?? ''}`.
  - `onChange={(hex) => setFormData(prev => ({ ...prev, xxxColor: normalizeHex(hex) }))}`.
  - `presets={bannerPresets}` או `AVAILABLE_COLORS`.
  - `showConfirmButtons={false}`, `allowCustomHex={true}`.
  - לשקול להציג כפתור "איפוס" ליד הקומפוננטה.
- כפתור "💡" יקרא `pickBestContrast([...presets, '#000000', '#ffffff'], formData.ctaBackgroundColor)`.
- לשמור על overlay slider כפי שהוא.

### 6. Optimistic locking ו־API
- לוודא ש־`Banner` מכיל `version` ומועבר ב־`BannerForm` כחלק מה־state.
- בעת קריאה ל־`updateBanner` לשלוח `expectedVersion=version` כדי להימנע מקונפליקטים (HTTP 409).
- לעדכן את ה־service/handler שמזין את `BannerForm` כדי שיאחסן את הגרסה.

### 7. בדיקות סטטיות ויחידה
- `cd client && npm run build && npm run lint`.
- `cd client && npm run test -- colorUtils` (לבדיקות הפונקציה החדשה).
- לבדוק שאין שגיאות TypeScript בשינויים.

### 8. בדיקות נגישות
- להריץ axe-core/Lighthouse על מודל הבאנר.
- לבדוק:
  - ניווט עם Tab/Shift+Tab במוד modal.
  - פתיחה/סגירה של הפופ־אפ עם מקלדת.
  - הקריינות של Screen Reader בעת בחירת צבע.
- לוודא שיש aria-live המעדכן את סטטוס contrast.

### 9. בדיקות E2E ו־cache
- לכתוב תרחיש Playwright/Cypress:
  1. כניסה לממשק ניהול.
  2. פתיחת באנר, בחירת צבעים, לחיצה על כפתור ההצעה.
  3. שמירה ובדיקת toast/סטטוס הצלחה.
  4. מעבר לעמוד החזית ובדיקה שה־carousel מציג את הצבעים החדשים.
- לוודא שה־`clearBannersCache()` נקרא ושלא נשאר נתון ישן ב־localStorage.

### 10. Storybook ו־visual regression (מומלץ)
- להוסיף story עבור `ColorSelect` בשני מצבים: Banner (preview חי) ו־SKU (confirm).
- להריץ visual regression (Percy/Chromatic) כדי לוודא שאין שבירות UI.

### 11. PR ופריסה
- להכין branch עם commitים מסודרים.
- לכתוב PR הכולל:
  - פירוט שינויים (ColorSelect מורחב, BannerForm משתמש ב־ColorSelect, colorUtils).
  - בדיקות שבוצעו (build, tests, E2E, axe, visual).
  - Screenshots/GIF.
- לקבל review מצוות UI/UX ומפתח backend.
- לאחר merge: deploy ל־staging, לבצע smoke tests ואז לפרודקשן לפי הנהלים.

---

## Checklist לפני Merge
- [ ] build ו־typecheck עברו (client + server).
- [ ] Jest/RTL/Playwright עברו ללא כשל.
- [ ] axe/Lighthouse נקיים משגיאות.
- [ ] ה־cache מתנקה לאחר עדכון באנר.
- [ ] אין קוד legacy (inputs ישנים) שנשאר.
- [ ] הנגישות של הקומפוננטה החדשה מאומתת ידנית.

---

## המלצות UX ואבולוציה עתידית
- להוסיף tooltip קצר שמסביר מה עושה כפתור "💡".
- לשקול שכבת "Saved Presets" אישית למנהלים.
- בעתיד: חישוב צבע אופטימלי על בסיס דגימת תמונה (canvas) ואינטגרציה עם AI.

---

## סטטוס

✅ **הושלם**:
1. ניתוח הקומפוננטות הקיימות (ColorSelect, SKURow, colorConstants)
2. הרחבת ColorSelect עם HexColorPicker popup מלא (props חדשים, state, handlers, JSX, CSS)
3. התאמה ל-UX של BannerForm (showConfirmButtons=false, preview חי)
4. לוגיקת contrast משותפת - הוספת `pickBestContrast` ל-colorUtils.ts
5. עדכון BannerForm להשתמש ב-ColorSelect עם Props החדשים (4 שדות צבע)
6. בדיקות סטטיות - build + TypeScript עברו בהצלחה ✓

⏳ **ממתינים**:
7. בדיקות יחידה (Jest) ל-pickBestContrast
8. בדיקות נגישות (axe-core/Lighthouse)
9. בדיקות E2E (Playwright/Cypress) - flow מלא של עריכת באנר
10. Storybook + visual regression (אופציונלי)
11. PR + deploy

**הערות**:
- הקוד מתקמפל נכון ללא שגיאות TypeScript
- ColorSelect תומך בשני מצבים: Banner (live preview) ו-SKU (confirm)
- כל שדות הצבע מנורמלים לפני שמירה
- הפונקציה suggestOptimalTextColor משתמשת ב-pickBestContrast החדשה

**עודכן**: 09/01/2025