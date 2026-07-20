# הוספת ערכי מאפיינים מתוך מוצר

עודכן: 20 ביולי 2026

מסמך זה מתאר את הזרימה הפעילה להוספת ערך חדש למאפיין טקסט או מספר מתוך יצירה ועריכה של מוצר עם וריאנטים.

## תחום השינוי

האפשרות מוצגת בזרימה הפעילה בלבד:

`ProductForm → ProductSKUs → ניהול גירסאות → VariantAttributesInline → FilterAttributeValueSelector`

היא אינה מוצגת בעריכה מרובה, בכרטיס SKU יחיד, ב־`VariantWizard` הישן או ב־`ProductFilterAttributes` המושבת.

במאפיין צבע ממשיכים להשתמש בזרימת הוספת הגוון למשפחת צבע. במאפיין טקסט או מספר מופיע כפתור מלא־רוחב "הוסף ערך חדש ל…", גם כאשר עדיין אין למאפיין ערכים.

המנהל מזין שדה אחד בלבד. אין שדה למזהה באנגלית ואין יצירת slug. לאחר השמירה השרת מחזיר את הזהות הסופית, הערך נוסף לרשימה המקומית ונבחר מיד למוצר.

## חוזה API

הנתיב מוגן באמצעות אימות מנהל וה־rate limiter הקיים:

```http
POST /api/filter-attributes/:id/values
Content-Type: application/json

{ "displayName": "כותנה אורגנית" }
```

יצירה חדשה מחזירה `201`; ערך שכבר קיים מחזיר `200`:

```json
{
  "success": true,
  "data": {
    "value": "כותנה אורגנית",
    "displayName": "כותנה אורגנית",
    "created": true
  }
}
```

הפעולה idempotent. אם למשל קיים נתון ותיק `{ "value": "cotton", "displayName": "כותנה" }` והמנהל מזין "כותנה", השרת מחזיר את `cotton` הקיים עם `created: false`. הלקוח תמיד משתמש בתשובת השרת ואינו מניח שהקלט הוא המזהה הסופי.

## נרמול ובטיחות

- טקסט עובר Unicode NFKC, חיתוך ואיחוד רווחים; אורכו 1–50 תווים.
- פסיק אסור בערך טקסט חדש, מפני שחוזה הסינון הציבורי הקיים משתמש בפסיקים כמפריד בין ערכים.
- מספר חייב להיות סופי ולא שלילי ונשמר בצורה קנונית; למשל `010.00` נשמר כ־`10`.
- ערך חדש נשמר באותו טקסט ב־`value` וב־`displayName`.
- מאפיין צבע נדחה מהנתיב הכללי וממשיך לנתיב הגוונים.
- בדיקת כפילות מכסה מערכי string ישנים, `values[].value` ו־`values[].displayName`, ללא תלות באותיות גדולות/קטנות וברווחים.
- הבורר מנרמל ערכי string ישנים למבנה האובייקט הנוכחי לפני חיפוש, הצגה או "בחר הכל".
- ההוספה מתבצעת ב־`$push` מותנה ואטומי. אם שתי לשוניות מוסיפות אותו ערך, אחת יוצרת והשנייה קוראת מחדש ומקבלת את אותה זהות עם `created: false`. ערכים שונים אינם דורסים זה את זה.
- caches של מאפייני הסינון והוולידציה מנוקים רק אחרי יצירה אמיתית.

## התנהגות הטופס

- Enter שומר; ביטול סוגר ומחזיר את הפוקוס לכפתור הפתיחה.
- אחרי שגיאת API הפוקוס חוזר לשדה והערך לא נבחר.
- בזמן הבקשה כל זרימת המוצר נעולה, לרבות שמירה, ביטול, החלפת מאפיין ובחירת שילובים.
- ההצלחה מנקה את החיפוש כדי שהערך שנבחר יהיה גלוי.
- מנגנון `reconcileSelectedCombinations` נשמר: שילובים חדשים הנובעים מהערך מתווספים, אך שילובים שהמנהל ביטל ידנית אינם חוזרים.

## שמירה גלובלית והגנת מקביליות

כמו גוון חדש, ערך מאפיין נשמר מיד בספרייה הגלובלית ויישאר בה גם אם עריכת המוצר תבוטל. ההודעה מוצגת במפורש בתוך טופס ההוספה. אין למחוק אוטומטית בביטול, משום שלשונית אחרת עשויה כבר להשתמש בערך.

המסנן הציבורי מקרין ערכי טקסט/מספר רק כאשר הזהות המדויקת של ערך הספרייה קיימת ב־SKU פעיל ובאחד המקומות ששאילתת המוצרים עצמה בודקת: `attributes.<key>` או `variantName`/`subVariantName` של צירי הווריאנטים. כך ערך שנוסף לספרייה אך המוצר בוטל לא יוצג כאפשרות סינון ריקה, ושדה ישן שאינו נתמך בחיפוש לא יפורסם בטעות. שינוי בשדות הווריאנט מנקה גם הוא את cache המסנן.

מודאל ניהול המאפיינים עדיין שומר מערך `values` שלם דרך PUT, ולכן העדכון מוגן ב־optimistic concurrency: הלקוח שולח את `updatedAt` שנטען עם המאפיין והשרת מחליף את המערך רק אם הגרסה עדיין זהה. אם ערך נוסף או שינוי אחר נשמר במקביל, השרת מחזיר `409` והמודאל מציג למנהל הוראה לפתוח מחדש במקום לדרוס את הספרייה.

## אימות

```powershell
cd server
npm test -- --runInBand src/services/filterAttributeService.addAttributeValue.test.ts src/services/filterAttributeService.updateAttribute.test.ts src/services/filterAttributeService.getAttributesForFilter.test.ts src/services/filterAttributeService.addColorVariant.test.ts
npm run build

cd ../client
npm test -- --run src/components/features/admin/Products/ProductForm/ProductSKUs/FilterAttributeValueSelector/attributeValueCreation.test.ts src/components/features/admin/Products/ProductForm/ProductSKUs/FilterAttributeValueSelector/colorVariantCreation.test.ts src/components/features/admin/Products/ProductForm/ProductSKUs/variantCombinationSelection.test.ts
npm run build
```
