## ProductFormActions — תיעוד קומפוננטה

---

## מה הקומפוננטה עושה

קומפוננטת `ProductFormActions` מספקת סרגל פעולות לטופס מוצר בממשק הניהול. היא מציגה את הכפתורים המרכזיים (שמירה, ביטול) וכפתורים משניים במצב עריכה (שכפול, מחיקה), מציגה אזהרה לגבי שינויים שלא נשמרו, ותיבת טיפים מקצועיים לשימוש לפני שמירה.

## מטרת הקומפוננטה

מטרתה לארגן ולרכז את כל פעולות הטופס במקום אחד ברור ונגיש, להנחות את המשתמש באמצעות הודעות ומצבי טעינה, ולמנוע שמירה לא מכוונת (כפתור שמירה מושבת עד שיש שינויים).

## מה הקומפוננטה מכילה (קבצים ותלויות)

- `ProductFormActions.tsx` — רכיב React שמממש את ה-UI, props ופונקציות האירועים.
- `ProductFormActions.module.css` — סגנונות מקומיים (CSS Modules) עבור כל הבלוקים: banner, actions bar, tips.
- `index.ts` — barrel export (קיים בתיקייה).

תלויות חיצוניות:
- משתמשת ב-`Button` מהספרייה הפנימית (`@/components/ui/Button`).

## Props ותפקידם

- `mode: 'create' | 'edit'` — מצב הטופס, קובע אילו כפתורים משניים יוצגו (כגון מחיקה/שכפול).
- `isSubmitting: boolean` — האם הטופס בתהליך שמירה; משבית כפתורים ומציג מצב loading על כפתור השמירה.
- `isDirty: boolean` — האם יש שינויים שלא נשמרו; משפיע על זמינות כפתור השמירה והצגת ה-warning banner.
- `onSave: () => void` — callback לשמירה שנקרא בלחיצה על כפתור השמירה.
- `onCancel: () => void` — callback לביטול החתימה/חזרה לרשימה.
- `onDelete?: () => void` — אופציונלי, קריאה למחיקת מוצר (מוצג רק במצב edit אם קיים).
- `onDuplicate?: () => void` — אופציונלי, קריאה לשכפול מוצר (מוצג רק במצב edit אם קיים).

## מצב פנימי ולוגיקה

הקומפוננטה אינה מחזיקה state פנימי משמעותי — היא מתנהגת על סמך ה-props שמתקבלים. קיימים לוגים לקונסול שמסייעים בדיבוג (render props, לחיצות כפתורים). הכפתורים מבוקרים (disabled/loading) בהתאם ל-`isDirty` ו-`isSubmitting`.

## מבנה ה-UI והמשמעות של כל חלק

1. Banner אזהרה (`styles.warningBanner`)
   - מוצג רק אם `isDirty && !isSubmitting`.
   - מציג אייקון וטקסט שמעודד את המשתמש לשמור את השינויים.

2. Actions Bar (`styles.actionsBar`)
   - חלוקה ל-primaryActions (כפתורי שמירה וביטול) ו-secondaryActions (כפתורים משניים במצב edit).
   - תכונה מיוחדת: ה-bar מוגדר כ-sticky בתחתית (`position: sticky; bottom: 0`) כדי להיות גלוי תמיד בטפסים ארוכים.

   a. Primary Actions (`styles.primaryActions`)
      - כפתור שמירה (`Button` variant="primary") — מופעל רק אם יש שינויים ולא נשלח (disabled אם !isDirty || isSubmitting).
      - כפתור ביטול (`Button` variant="outline") — קורא ל-`onCancel` ומושבת בזמן שליחה.

   b. Secondary Actions (`styles.secondaryActions`) — מוצגים רק כאשר `mode === 'edit'`
      - כפתור שכפול (`onDuplicate`) — אופציונלי, מופיע במידה וה-prop קיים.
      - כפתור מחיקה (`onDelete`) — אופציונלי, מופיע במידה וה-prop קיים; variant="danger".

3. Tips (`styles.tips`)
   - רשימת טיפים מקצועיים לממלא הטופס (בדיקות לפני שמירה, המלצות על תמונות, SKU ועוד).

## כיתות CSS חשובות

- `container` — קונטיינר עליון ו-gap בין הבלוקים.
- `warningBanner`, `warningIcon`, `warningText` — עיצוב אזהרה ודינמיקה (animation slideDown).
- `actionsBar` — סרגל כפתורים עם sticky positioning, צל ו-border-top.
- `primaryActions`, `secondaryActions` — קביעת layout וכיווניות כפתורים.
- `tips`, `tipsTitle`, `tipsList` — בלוק הטיפים עם רקע והדגשה.

## התנהגויות ונקודות חשובות

- כפתור השמירה מוגן (disabled) אם אין שינויים (`!isDirty`) או אם הטופס בתהליך שליחה (`isSubmitting`).
- כפתורים משניים (מחיקה/שכפול) אינם מוצגים במצב `create` אלא רק במצב `edit` ואם ה-props הרלוונטיים הועברו.
- ה-sticky actions bar שומר על נראות הפעולות גם בטפסים ארוכים — חשוב לבדיקת z-index והנגשה על מסכי מובייל.

## נגישות והצעות שיפור

- כבר יש שימוש ב-`aria-label` על כפתורים חשובים — טוב.
- שיפור מומלץ: לוודא שקיים focus-visible ברור וכי כפתורי Danger מקבלים איפון/הודעת אישור לפני מחיקה אמיתית (modal confirmation) כדי למנוע מחיקות בטעות.
- ניתן להוסיף aria-live על ה-banner אם רוצים להודיע על שינויים לקוראי מסך.

## דוגמת שימוש

הקומפוננטה מיועדת להיות חלק מטופס הורה שידאג ל-state ולקריאות API, לדוגמה:

```tsx
<ProductFormActions
  mode={isNew ? 'create' : 'edit'}
  isSubmitting={saving}
  isDirty={formIsDirty}
  onSave={handleSave}
  onCancel={handleCancel}
  onDelete={mode === 'edit' ? handleDelete : undefined}
  onDuplicate={mode === 'edit' ? handleDuplicate : undefined}
/>
```

---

קובץ זה נוצר ללא שינוי של קבצי המקור בתיקייה — רק הוספת תיעוד Markdown חדש. אם תרצה, אפשר להמיר ל-`*.generated.md` או להוסיף קישורים ל-stories/tests.
