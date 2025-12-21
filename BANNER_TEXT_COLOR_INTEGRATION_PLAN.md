# תכנית אינטגרציה מלאה: צבעים דינמיים לבאנר (End-to-End)

תאריך עדכון: 2025-11-06

מטרה: לאפשר למנהלי המערכת לשלוט בנפרד בצבעי הכותרת, התיאור, טקסט ה-CTA ורקע ה-CTA עבור כל באנר, תוך שמירה על תאימות לאחור, עמידה בדרישות נגישות ומתן חוויית עריכה עם תצוגה מקדימה בזמן אמת.

עקרונות פעולה
- ערכים נשמרים בפורמט HEX בן 6 תווים (`#rrggbb`) או `null` עבור fallback לערכי המערכת.
- נבצע נרמול (trim + lowercase) בצד השרת והלקוח לפני בדיקות regex.
- אזהרת ניגודיות תוצג למנהלים אך לא תעצור שמירה.
- Fallback בצד הלקוח ימשיך להשתמש ב-token הקיים (`var(--color-text-inverse)` וכו') כאשר ערך אינו קיים.
- נגן על partial updates באמצעות `$set` רק לשדות שסופקו.

קבצים עיקריים להשפעה
- Backend: `server/src/models/Banner.ts`, `server/src/controllers/bannerController.ts`, `server/src/services/bannerService.ts`, `server/scripts/migrate-banner-colors.ts` (חדש).
- Frontend Display: `client/src/components/features/HeroCarousel/HeroCarousel.tsx`, `client/src/components/features/HeroCarousel/HeroCarousel.css`.
- Admin UI: `client/src/components/features/admin/BannerManagement/BannerForm/BannerForm.tsx`, `BannerForm.css`, `client/src/services/bannerService.ts`, `client/src/lib/colorUtils.ts`.
- Tests & Docs: `client/src/lib/__tests__/colorUtils.test.ts`, `server/tests/bannerController.test.ts`, `README`/release notes.

מפת דרכים (High Level)
1. Backend Schema & Validation לארבעת השדות.
2. Controllers/Services – נרמול, בדיקה ותמיכה ב-partial updates.
3. סקריפט מיגרציה לאיפוס ערכים חסרים.
4. Frontend Display – CSS variables לכל שדה + שיפור overlay/z-index.
5. Admin UI – קבוצות צבעים (title/description/cta text/cta background), presets, custom picker, live preview, contrast helper.
6. בדיקות (unit/integration/E2E) + QA checklist.
7. Rollout מדורג ומעקב.

---

**שלב 1 – Backend Schema & Validation**
מטרה: להרחיב את מודל הבאנר לתמיכה בארבעת השדות החדשים תוך שמירה על תאימות לאחור.

צעדים:
1. עדכון `server/src/models/Banner.ts` והוספת ארבעת השדות:
   - `titleColor`, `descriptionColor`, `ctaTextColor`, `ctaBackgroundColor` – כולם `String | null`, עם ברירת-מחדל `null` ולידציה זהה (`^#([0-9a-f]{6})$`).
   - הגדירו helper `normalizeHexColor(value?: string | null)` שמחזיר ערך מנורמל או `null`.

```ts
const colorFields = ['titleColor', 'descriptionColor', 'ctaTextColor', 'ctaBackgroundColor'] as const;

function normalizeHexColor(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^#([0-9a-f]{6})$/.test(normalized) ? normalized : null;
}

const hexColorValidator = {
  validator: (v: string | null) => normalizeHexColor(v) === (v === null ? null : v.trim().toLowerCase()),
  message: 'Color חייב להיות hex בן 6 תווים, לדוגמה #ffffff',
};
```

2. Controllers (`createBanner`, `updateBanner`):
   - נרמול באמצעות helper משותף לפני שמירה.
   - החזרת 400 עם הודעת שגיאה עבור ערכים לא תקינים.
   - התממשקות עם partial updates: רק שדות שסופקו נכנסים ל-`$set`.

3. Services (`bannerService`):
   - הרחבת בניית המסמך/העדכון כך שישתמש בשדות המנורמלים.
   - שמירת fallback ל-null אם הערך ריק, undefined או `''`.

4. בדיקות מהירות:
   - POST עם ערכי hex תקינים לכל ארבעת השדות → מצפה ל-201 והערכים נשמרים lowercase.
   - PATCH שבא רק עם `ctaTextColor` → שאר השדות נשארים ללא שינוי.
   - ניסיון לשמור `#fff` → החזרה של 400 עם פרטי השדה הבעייתי.

---

**שלב 2 – סקריפט מיגרציה**
מטרה: לאפס ערכי צבעים שלא קיימים בבסיס הנתונים ולוודא אחידות.

```js
// server/scripts/migrate-banner-colors.ts
db.banners.updateMany(
  {
    $or: colorFields.map((field) => ({ [field]: { $exists: false } })),
  },
  {
    $set: {
      titleColor: null,
      descriptionColor: null,
      ctaTextColor: null,
      ctaBackgroundColor: null,
    },
  }
);
```

להריץ בסביבות pre-prod/staging ולתעד ב-README את הפקודה המתאימה.

---

**שלב 3 – Frontend Display (HeroCarousel)**
מטרה: להשתמש ב-CSS variables לכל אלמנט ולשמור על קריאות נאותה.

צעדים:
1. `HeroCarousel.tsx` – הוספת inline style עם ארבעה משתנים:

```tsx
style={{
  '--banner-title-color': banner.titleColor || 'var(--color-heading-inverse)',
  '--banner-description-color': banner.descriptionColor || 'var(--color-text-inverse)',
  '--banner-cta-text-color': banner.ctaTextColor || 'var(--color-text-inverse)',
  '--banner-cta-background-color': banner.ctaBackgroundColor || 'var(--color-accent)',
}} as React.CSSProperties}
```

2. `HeroCarousel.css` – שימוש במשתנים החדשים, תיקון z-index והבטחת overlay עדין (linear-gradient) שלא חוסם אינטראקציה.
3. בדיקות:
   - באנרים קיימים ללא ערכים → fallback לערכי token.
   - באנר עם טקסט בהיר ורקע כהה → וידוא שהצבעים מתעדכנים בכל האלמנטים.

---

**שלב 4 – Admin UI (BannerForm)**
מטרה: לספק למנהל שליטה מפורטת בצבעי הטקסט ורקע ה-CTA עם תצוגה מקדימה והנחיות ניגודיות.

צעדים עיקריים:
1. טיפוסים (`client/src/services/bannerService.ts`): הרחבת `Banner` ו-`BannerFormData` עם ארבעת השדות.
2. קומפוננטה (`BannerForm.tsx`):
   - יצירת מבנה UI של "קבוצות צבע": `Headline`, `Body`, `CTA Button` (טקסט) ו-`CTA Background`.
   - Presets משותפים (לבן, שחור, כחול מותג, אפור כהה, אפור בהיר) + preset ייעודי ל-CTA (לדוגמה כחול/ירוק מותגי).
   - Custom picker (`<input type="color">`) לכל שדה עם normalizer.
   - כפתור reset פר שדה + כפתור global reset.
   - הצגת contrast ratio (AA/AAA) מול רקע צפוי, עבור CTA התייחסות לצבע הרקע החדש.
   - Live preview: שימוש באותם CSS variables, מצב desktop/mobile, אפשרויות תמונה בהירה/כהה.
3. `BannerForm.css`: grid/stack עבור swatches, הדגשת מצב בחירה, מצבי disabled, התראה על ניגודיות נמוכה.
4. Utils (`colorUtils.ts`): הרחבת הפונקציות אם נדרש (לדוגמה `contrastAgainstBackground`).

---

**שלב 5 – בדיקות ו-QA**
1. Unit Tests:
   - `normalizeHexColor` (server + client).
   - `contrastRatio` ו-`isContrastAccessible` (client).
2. Integration:
   - יצירת באנר עם כל הארבעה → וידוא API response תקין והצגה ב-HeroCarousel.
   - עדכון באנר קיים עם שינוי שדה יחיד → ערכים אחרים נשארים.
3. E2E (Cypress / Playwright):
   - זרימה מלאה: מנהל בוחר preset לכותרת, צבע מותאם ל-CTA, מקבל אזהרת ניגודיות, שומר, רפרוש, רואה תוצאה.
4. QA ידני:
   - RTL & LTR.
   - Mobile breakpoints.
   - מצב ללא צבעים, מצב עם אחד/יותר.
   - בדיקת קונטרסט (הקטנת מסך/מצבי תאורה שונים).

---

**שלב 6 – Rollout & Monitoring**
- להריץ מיגרציה בכל סביבה לפני deploy הקוד.
- לעדכן release notes ולשלוח הדרכה קצרה למנהלים.
- לעקוב אחרי: שגיאות 400 בבאנרים, אחוז באנרים עם ערכים חלקיים, משוב משתמשים על קריאות.
- Rollback מהיר: ביטול שליחת השדות מה-UI ושמירת הסכמה (הערכים יישארו `null`).

---

**עדיפויות (Sprint Breakdown)**
- Priority 1 (Must): Schema + Controllers + HeroCarousel + BannerForm בסיסי עם presets ו-reset.
- Priority 2 (Should): Contrast helper, custom picker, preview modes, loading states.
- Priority 3 (Nice): המלצת צבע חכמה, אוטומציה ל-overlay intensity, E2E מלא.

זמני פיתוח משוערים
- Backend + מיגרציה: 45–60 דק׳.
- Frontend Display: 20–30 דק׳.
- Admin UI (כולל contrast/helper/preview): ~4 שעות.
- Tests + QA: 1.5–2.5 שעות.
- Total Pass ראשון: 6–7.5 שעות.

---

**Checklist לפריסה**
- [ ] סכמת `Banner` עודכנה ושדות מנורמלים.
- [ ] Controllers/Services מוודאים וכן מטפלים ב-partial updates.
- [ ] סקריפט מיגרציה רץ בכל סביבה רלוונטית.
- [ ] HeroCarousel משתמש ב-CSS variables לכל אחד מהצבעים.
- [ ] BannerForm מספק שליטה בארבעת השדות עם presets/reset ו-preview.
- [ ] ניגודיות נבדקה (unit + QA ידני).
- [ ] בדיקות אוטומטיות ירוקות (server/client).
- [ ] Release notes ותיעוד מנהלים מעודכנים.

---

עם השלמת המסמך – נוכל להתחיל ביישום לפי סדר השלבים (Backend תחילה). אנא עדכן אם דרושים שינויים נוספים לפני תחילת הפיתוח.