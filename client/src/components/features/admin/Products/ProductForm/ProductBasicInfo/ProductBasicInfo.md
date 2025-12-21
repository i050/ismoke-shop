## ProductBasicInfo — תיעוד קומפוננטה

---

## מה הקומפוננטה עושה

קומפוננטת `ProductBasicInfo` מציגה טופס לעריכת/הגדרת המידע הבסיסי של מוצר בממשק הניהול: שם המוצר, תיאור ומותג. הקומפוננטה מספקת שדות קלט (Input ו-textarea), מונה תווים לתיאור, הודעות שגיאה/עזרה וטיפים לכתיבה.

## מה מטרת הקומפוננטה

מטרת הקומפוננטה היא לאסוף ולאוודא את המידע הבסיסי של מוצר לפני שמירתו במסד הנתונים או המשך תהליך יצירת/עריכת מוצר. היא אחראית על חוויית הקליטה של השדות המרכזיים והתצוגה של שגיאות והנחיות לכותב התוכן.

## מה הקומפוננטה מכילה (קבצים ותלויות)

- `ProductBasicInfo.tsx` — הקומפוננטה React עצמה (לוגיקה, UI, handlers).
- `ProductBasicInfo.module.css` — סגנונות מקומיים באמצעות CSS Modules.
- `index.ts` — Barrel export שמייצא ברירת מחדל את הקומפוננטה.

תלויות חיצוניות/פרויקטיות:
- משתמשת ב-`Input` מתוך `client/src/components/.../ui/Input/Input` (קומפוננטת שדה קלט קיימת בפרויקט).
- משתמשת במערכת CSS variables ו-classes מתוך `ProductBasicInfo.module.css`.

## Props ו-types (מה שמתקבל לקומפוננטה)

- `values: { name: string; description: string; brand: string | null; }`
  - הערכים הנוכחיים של השדות. הקומפוננטה מציגה אותם ומעדכנת דרכם את ההורה באמצעות `onChange`.
- `errors?: { name?: string; description?: string; brand?: string; }`
  - אובייקט אופציונלי שמכיל הודעות שגיאה לכל שדה (להצגה כ-helperText או טקסט שגיאה).
- `onChange: (field: 'name' | 'description' | 'brand', value: string) => void`
  - callback שמופעל בכל שינוי בשדות. הקומפוננטה לא עושה שמירה בעצמה — היא מדווחת להורה על השינוי.
- `disabled?: boolean`
  - מצב קריאה/השבתה של הטופס (למשל בזמן שמירה). ברירת המחדל: `false`.

## מצב פנימי (state) ופונקציות עיקריות

- `descriptionLength: number` — state מקומי ששומר את מספר התווים הנוכחי בתיאור. מעודכן בכל שינוי של ה-textarea.

Handlers:
- `handleNameChange` — מקבל אירוע `ChangeEvent<HTMLInputElement>` ומפעיל `onChange('name', value)`.
- `handleDescriptionChange` — מעדכן את ה-state של המונה (`descriptionLength`) ומפעיל `onChange('description', value)`.
- `handleBrandChange` — קורא ל-`onChange('brand', value)` כששדה המותג משתנה.

הערה: handlers ממומשים עם `useCallback` כדי למנוע רינדורים מיותרים של children שמסתמכים על פונקציות אלה.

## מבנה ה-UI והסבר על כל חלק

1. container (`styles.container`)
   - מיכל עליון של הקומפוננטה. מספק ריווח, רקע ו-radius לפי משתני ה-CSS של הפרויקט.

2. header (`styles.header`, `styles.title`, `styles.subtitle`)
   - כותרת ותיאור קצר של הקטע. מיועד להנחות את המשתמש על מה למלא.

3. form (`styles.form`) — שדות הטופס
   - כל שדה עטוף ב-`formGroup` (flex column, ריווח בין שדות).

   a. שדה `שם המוצר` (Input)
      - משתמש ב-`Input` קומפוננטה של הפרויקט.
      - תכונות: `required`, placeholder, `disabled` בהתאם לפרופ, `helperText` מתוך `errors.name`.
      - מטרתו לאפשר קליטה חד-שורתית של שם המוצר.

   b. שדה `תיאור המוצר` (textarea)
      - שדה רב-שורתי עם `maxLength=5000`, `rows=6` and placeholder.
      - מעקב אחרי אורך הטקסט (`descriptionLength`) וביצוע עדכון חיצוני דרך `onChange`.
      - מציג מונה תווים (`styles.charCounter`) עם צבעים משתנים (warning/danger) לפי אורך.
      - מציג `errors.description` כטקסט שגיאה או טקסט עזר כאשר אין שגיאה.
      - כיתה `styles.textarea.error` מוחלת במקרה של שגיאה.

   c. שדה `מותג` (Input)
      - אופציונלי; אם `values.brand` הוא `null` מציג מחרוזת ריקה.
      - מציג helperText שמסביר כי השדה אופציונלי אם אין מותג.

4. textareaFooter (`styles.textareaFooter`)
   - מציג מונה תווים בצד אחד וטקסט עזר/שגיאה בצד השני; במכשירים קטנים הוא עובר לשורה.

5. tips (`styles.tips`)
   - תיבה המציגה טיפים לכתיבת תיאור טוב (רשימה של נקודות). משפרת חוויית עריכה ומגבירה איכות התוכן.

## כיתות CSS חשובות והמשמעות שלהן

- `container`, `header`, `title`, `subtitle` — מבנה כותרת ותיבה כללית.
- `form`, `formGroup` — ארגון השדות בריווח ובכיוון עמודי.
- `label`, `required` — תוויות שדה וסימון שדות חובה.
- `textarea`, `textarea.error`, `textarea.disabled` — עיצוב שדה התיאור במצבים שונים.
- `textareaFooter`, `charCounter`, `helperText`, `errorText` — טקסטי עזר, שגיאות ומונה תווים.
- `tips`, `tipIcon`, `tipContent` — בלוק הטיפים והתוכן שבתוכו.

## התנהגויות ותנאים מיוחדים (edge cases)

- אם `values.description` מתחיל כריק, ה-mounter מתחיל מ-0.
- המונה מציג עד 5000 תווים; יש סימון חזותי (warning/danger) אם קצר/ארוך מאוד.
- שגיאות מועברות דרך prop `errors` ומוצגות מתאימים תחת השדה.
- כאשר `disabled=true` כל השדות מושבתים ומקבלים סגנון שמראה מצב בלתי פעיל.

## דגשים לפיתוח, accessibility ותחזוקה

- הקומפוננטה משתמשת ב-labels ו-id תואמים (`htmlFor`) — טוב לנגישות.
- כדאי לוודא שאורך התיאור (5000) והמסר למשתמש תואמים למדיניות התוכן של המערכת (SEO/קופירייטינג).
- אם רוצים לבצע localization, יש להוציא מחרוזות טקסט (כמו placeholders, טיפים) לקובץ תרגום.
- כדי לתמוך ב-A11y, ניתן להוסיף aria-invalid ו-aria-describedby כאשר יש הודעת שגיאה.

## שימוש לדוגמה (הורה צריך לספק props)

```tsx
// דוגמה קצרה לשימוש מתוך טופס הורה
<ProductBasicInfo
  values={{ name: product.name, description: product.description || '', brand: product.brand }}
  errors={formErrors.basicInfo}
  onChange={(field, value) => setProduct(prev => ({ ...prev, [field]: value }))}
  disabled={isSaving}
/>
```

---

קובץ זה נוצר מתוך ניתוח `ProductBasicInfo.tsx` ו-`ProductBasicInfo.module.css` ובו תיעוד בעברית שמתאים למפתחים ועורכי מוצר שמשתמשים בקומפוננטה.
