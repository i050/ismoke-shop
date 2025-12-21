## ProductCategories — תיעוד קומפוננטה (מונגש בעברית)

---

## 1. מה בדיוק עושה הקומפוננטה

קומפוננטת `ProductCategories` מספקת ממשק למערכת הניהול לבחירה וניהול של קטגוריה היררכית עבור מוצר והוספה/הסרה של תגיות (tags). היא מציגה בורר קטגוריות עם dropdown חיפוש והצגה של מבנה הנתיב (breadcrumb), וכן אזור לניהול תגיות — הוספה דרך שדה קלט והצגה של תגיות כ׳צ׳יפים׳ שניתן להסיר.

הקומפוננטה לא מבצעת שמירה עצמאית למסד הנתונים — במקום זאת היא מקבלת ותחזיר ערכים ל-הורה דרך props (`values` ו-`onChange`).

## 2. מה מטרת הקומפוננטה

מטרתה לאפשר למשתמש בממשק הניהול:
- לבחור קטגוריה מדויקת מתוך עץ קטגוריות (כולל חיפוש וסינון),
- להציג בצורה ברורה את מיקום הקטגוריה בעץ (path/breadcrumb),
- להוסיף תגיות שמסייעות בחיפוש ובמיון של המוצר,
- להציג ולוודא הגבלות בסיסיות על תגיות (מקסימום כמות, אורך וכו').

המטרה התפקודית היא להפריד בין UI/קלט לבין לוגיקת שמירה — הקומפוננטה מטפלת רק באיסוף/ולידציה מקומית ובדיווח לערך ההורה.

## 3. מה היא מכילה (קבצים, תלות ולוגיקה פנימית)

- `ProductCategories.tsx` — רכיב React המממש את ה-UI והלוגיקה המקומית (handlers, state, hooks).
- `ProductCategories.module.css` — סגנונות מקומיים עבור כל מבנה ה-UI.
- `index.ts` — (ייצוא בָּרֶל) - לא עברנו עליו כאן אך קיים בתיקייה.

תלויות בפרויקט:
- שימוש ב-hooks של Redux: `useAppSelector`, `useAppDispatch` כדי לטעון עץ קטגוריות מ-store (`fetchCategoriesTree`, selectCategoriesTree ועוד).
- טיפוסים/שירותים: `CategoryTreeNodeClient` מתוך `services/categoryService`.

לוגיקה פנימית עיקרית:
- טעינת עץ הקטגוריות מה-store בלולאה `useEffect` במידה והעץ ריק.
- המרה של עץ הקטגוריות לעמודה שטוחה (`flattenCategories`) עם מידע על רמת ההיררכיה ונתיב מלא — זה מקל על הצגה וסינון.
- חיפוש וסינון (`categorySearch`) על שמות הקטגוריות.
- dropdown לבחירת קטגוריה עם סגירה בלחיצה מחוץ לו (event listener על document).
- ניהול תגיות: הוספה (כולל בדיקות וולידציה על אורך ומספר), הסרה ותגובות ללחיצה על Enter.

## 4. מה המטרה של כל דבר בקומפוננטה (הסבר על החלקים והכיתות)

א. Header — `styles.header`, `styles.title`, `styles.subtitle`
- מציג כותרת ותיאור קצר של האזור: מסביר למשתמש למה משמש החלק.

ב. Section — `styles.section`, `styles.label`
- כל אזור (קטגוריה, תגיות) עטוף ב-section שמסדיר ריווח ותוויות.

ג. Category Selector
- `styles.categorySelector` — מיכל יחודי שמכיל את כפתור הבחירה ואת ה-dropdown.
- `styles.categoryButton` — כפתור פתיחה/סגירה של ה-dropdown. מציג את שם הקטגוריה הנבחרת או placeholder.
- `styles.categoryArrow` / `categoryArrowOpen` — חץ שמסתובב כאשר ה-dropdown פתוח.
- `styles.categoryClearButton` — כפתור קטן לניקוי הבחירה (אם קיימת).

ד. Category Dropdown
- `styles.categoryDropdown` — תיבת ה-dropdown הממוקמת מתחת לכפתור ובעלת max-height ו-scroll.
- `styles.categorySearch` — שדה חיפוש פנימי ליצירת סינון מהיר על קטגוריות.
- `styles.categoryList`, `styles.categoryItem`, `styles.categoryItemSelected` — רשימת פריטים שניתן לבחור מתוכה; הפריטים מראים indentation (paddingRight משתנה לפי level) וניתן להציג חלק מה-path כ-context.
- `styles.categoryEmpty` — הודעה כאשר אין תוצאות חיפוש או כאשר לא נטענו קטגוריות.

ה. Tags (תגיות)
- `styles.tagsList` — קונטיינר של הצ׳יפים שמציג תגיות קיימות.
- `styles.tagChip`, `styles.tagChipText`, `styles.tagChipRemove` — מבנה הצ׳יפ וכפתור ההסרה.
- `styles.tagInputWrapper`, `styles.tagInput`, `styles.tagAddButton` — שדה הקלט להוספת תגית וכפתור הוספה. הקלט מאזין ל-Enter ומבצע בדיקות מוקדמות לפני הוספה.

ו. Helper/Error/Tips
- `styles.helperText` — טקסט עזר שמתחת לאזור התגיות.
- `styles.error` — טקסט שגיאה המוצג מתחת לשדה במידה ויש שגיאות מועברות דרך prop `errors`.
- `styles.tips`, `styles.tipsHeader`, `styles.tipsList` — בלוק טיפים שמסביר המלצות לשימוש בקטגוריות ותגיות.

## התנהגויות חשובות ונקודות ולידציה

- טעינת עץ הקטגוריות רק כאשר הוא ריק ומצב הטעינה אינו פעיל.
- המרה לעץ שטוח (flatten) מאפשרת הצגה וסידור לפי רמת העומק (`level`) ולעשות padding חזותי לפי רמה.
- הוספת תגית מבצעת בדיקות:
	- לא להוסיף מחרוזת ריקה;
	- אורך בין 2 ל-50 תווים;
	- לא לחזור על תגית קיימת;
	- לא לעבור את המקסימום `maxTags` (ברירת מחדל 20).
- לחיצה מחוץ ל-dropdown סוגרת אותו בעזרת מאזין `mousedown` על document.

## נגישות (A11y) והצעות שיפור

- יש שימוש ב-labels ו-כפתורים עם טקסט — טוב. עם זאת מומלץ להוסיף:
	- aria-expanded/aria-controls ל-button של ה-dropdown;
	- role=listbox ו-role=option למבנה ה-dropdown כדי לעזור לקוראי מסך;
	- aria-invalid ו-aria-describedby לשדות שמציגים שגיאות.

## דוגמאות שימוש

הקומפוננטה מיועדת להיכלל בתוך טופס הורה שמנהל state של המוצר. דוגמה קצרה:

```tsx
<ProductCategories
	values={{ categoryId: product.categoryId, tags: product.tags }}
	errors={formErrors.categories}
	onChange={(field, value) => setProduct(prev => ({ ...prev, [field]: value }))}
	maxTags={30}
/>
```

## edge-cases לשים לב אליהם

- אם עץ הקטגוריות גדול מאוד כדאי להוסיף debounced search ולazy-load לילדים במקום להביא את כל העץ מראש.
- אם יש זיהוי כפילויות בתגיות בשפות/case-sensitive — שקול לנרמל (toLowerCase) בעת השוואה.
- אם הקטגוריות מגיעות עם שמות דומים, שקול להראות גם מזהה או breadcrumb מלא כברירת מחדל.

---

קובץ זה נוצר באופן אוטומטי מתוך קריאת `ProductCategories.tsx` ו-`ProductCategories.module.css`. שמרתי על מבנה ברור לפי הנקודות שביקשת: מה הקומפוננטה עושה, מה מטרתה, מה היא מכילה ומה המטרה של כל חלק.

