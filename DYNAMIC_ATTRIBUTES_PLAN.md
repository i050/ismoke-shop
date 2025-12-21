# מסמך תכנון טכני: מערכת אימות מאפיינים דינמית (Dynamic Attribute Validation)

## 1. הקשר ומטרה
המערכת הנוכחית משתמשת ב-`Joi` עם הגדרת `stripUnknown: true`. כתוצאה מכך, כל שדה שנשלח תחת `attributes` ב-SKU ולא מוגדר מפורשות בסכמה הסטטית - נמחק לפני השמירה ל-DB.
מטרת מסמך זה היא לתכנן פתרון ארכיטקטוני מלא ("10/10") המאפשר:
1.  **דינמיות:** תמיכה במאפיינים שנוצרים ע"י המנהל (כגון `material`, `fabric`, `sleeve_length`).
2.  **קשיחות:** אימות סוגי נתונים (מספר, טקסט, צבע) לפי הגדרות ה-DB.
3.  **ביצועים:** שימוש ב-Caching למניעת עומס על מסד הנתונים.
4.  **בטיחות:** מניעת מחיקת מאפיינים הנמצאים בשימוש פעיל.

---

## 2. ארכיטקטורת הפתרון

הפתרון מבוסס על **Dynamic Schema Generation**. במקום סכמה סטטית אחת, אנו נבנה את הסכמה בזמן ריצה (Runtime) על בסיס תצורת המערכת.

### זרימת המידע (Data Flow):
1.  **Request:** לקוח שולח `POST /products` עם `attributes: { material: "cotton" }`.
2.  **Middleware:**
    *   בודק ב-Cache האם יש סכמת אימות עדכנית.
    *   אם לא: שולף את כל ה-`FilterAttributes` מה-DB -> בונה אובייקט Joi -> שומר ב-Cache.
    *   אם כן: משתמש בסכמה מהזיכרון.
3.  **Validation:** מריץ את הסכמה הדינמית על ה-Body.
    *   שדות לא מוכרים -> שגיאה (400).
    *   סוג נתונים שגוי -> שגיאה (400).
4.  **Controller:** מקבל אובייקט נקי ומאומת לשמירה.

---

## 3. פירוט טכני ליישום (Implementation Specs)

### שלב 1: מודול אימות דינמי
**קובץ:** `server/src/middleware/dynamicValidation.ts` (חדש)

מודול זה אחראי על בניית הסכמה. הוא יהיה Singleton שמנהל את ה-Cache של עצמו.

**לוגיקה נדרשת:**
```typescript
// Pseudo-code logic
import NodeCache from 'node-cache';
const schemaCache = new NodeCache({ stdTTL: 600 }); // 10 דקות

export const getDynamicAttributesSchema = async () => {
  // 1. בדיקת Cache
  if (schemaCache.has('joi-schema')) return schemaCache.get('joi-schema');

  // 2. שליפת הגדרות
  const attributes = await FilterAttribute.find().lean();

  // 3. בניית מפת אימות
  const schemaMap = {};
  attributes.forEach(attr => {
    switch(attr.valueType) {
      case 'number':
        schemaMap[attr.key] = Joi.number();
        break;
      case 'text':
        // אם יש ערכים מוגדרים מראש (Enum)
        if (attr.values?.length) {
           const allowed = attr.values.map(v => v.value);
           schemaMap[attr.key] = Joi.string().valid(...allowed);
        } else {
           schemaMap[attr.key] = Joi.string();
        }
        break;
      // ... טיפול בצבעים ובוליאני
    }
  });

  // 4. יצירת אובייקט Joi סופי
  // unknown(false) מבטיח ששדות שלא הוגדרו ייזרקו כשגיאה
  const finalSchema = Joi.object(schemaMap).unknown(false);

  // 5. שמירה ב-Cache
  schemaCache.set('joi-schema', finalSchema);
  return finalSchema;
}
```

### שלב 2: אינטגרציה ב-Middleware הקיים
**קובץ:** `server/src/middleware/productValidation.ts`

יש לשנות את הפונקציות `validateCreateProductWithSkus` ו-`validateUpdateProductWithSkus` כך שלא ישתמשו בסכמה סטטית גלובלית עבור ה-SKUs, אלא יבנו אותה בתוך הפונקציה.

**שינוי נדרש:**
1.  הסרת `attributes` מה-`skuSchema` הסטטי (או הגדרתו כ-`Joi.object().unknown(true)` זמנית).
2.  בתוך ה-Middleware:
    ```typescript
    export const validateCreateProductWithSkus = async (req, res, next) => {
      try {
        // 1. קבלת הסכמה הדינמית
        const dynamicAttrSchema = await getDynamicAttributesSchema();

        // 2. הרחבת הסכמה הסטטית
        // אנו יוצרים סכמה חדשה שמשלבת את הסטטי + הדינמי
        const fullSchema = createProductWithSkusSchema.keys({
          skus: Joi.array().items(
            skuSchema.keys({
              attributes: dynamicAttrSchema // הזרקת הסכמה הדינמית לכאן
            })
          )
        });

        // 3. ביצוע הוולידציה
        const { error, value } = fullSchema.validate(req.body, ...);
        // ... טיפול בשגיאות
      } catch (err) {
        next(err);
      }
    };
    ```

### שלב 3: ניהול Cache Invalidation
**קובץ:** `server/src/services/filterAttributeService.ts`

כדי שהמערכת תגיב מיד לשינויים (למשל: הוספת מאפיין חדש), עלינו לנקות את ה-Cache.

**פעולות:**
1.  ייבוא פונקציית `invalidateSchemaCache` מ-`dynamicValidation.ts`.
2.  קריאה לפונקציה זו בסוף כל פעולת כתיבה (`create`, `update`, `delete`) ב-Service.

### שלב 4: מנגנוני הגנה (Safety Nets)
**קובץ:** `server/src/services/filterAttributeService.ts`

מניעת מחיקת מאפיינים שנמצאים בשימוש היא קריטית למניעת "יתומים" (Orphaned Data).

**לוגיקה ב-`deleteAttribute`:**
1.  לפני `findByIdAndDelete`:
2.  ביצוע שאילתת Aggregation או Count:
    ```javascript
    const usageCount = await Sku.countDocuments({
      [`attributes.${attributeKey}`]: { $exists: true }
    });
    ```
3.  אם `usageCount > 0`: זריקת שגיאה `409 Conflict` עם הודעה ברורה למשתמש.

---

## 4. למה ביקשת את המסמך הזה? (Why this is necessary)

ביקשת תוכנית מפורטת ואינטגרטיבית מכמה סיבות קריטיות:

1.  **מורכבות האינטגרציה:** הבעיה אינה "באג" נקודתי אלא מגבלה ארכיטקטונית של שימוש בסכמות סטטיות (`Joi`) מול דרישה למידע דינמי (`MongoDB`). פתרון "פלסטר" (כמו `unknown(true)`) היה משאיר את המערכת חשופה לזבל (Junk Data).
2.  **סיכון לדריסת נתונים:** ללא תכנון מדויק של ה-Middleware, קיים סיכון ממשי שבעת עדכון מוצר, המערכת תמחק בטעות את כל המאפיינים הקיימים כי היא לא "מכירה" אותם.
3.  **ביצועים:** פתרון נאיבי היה שולף את כל ההגדרות מה-DB בכל בקשת HTTP. התוכנית כוללת מנגנון Caching הכרחי.
4.  **תחזוקה עתידית:** על ידי הפרדת הלוגיקה לקובץ נפרד (`dynamicValidation.ts`), אנו שומרים על הקוד נקי וקל לתחזוקה, במקום להעמיס על `productValidation.ts` הקיים.

---

## 5. תוכנית עבודה (Action Plan)

1.  [ ] **יצירת `server/src/middleware/dynamicValidation.ts`**: מימוש מנגנון ה-Cache ובניית הסכמה.
2.  [ ] **עדכון `server/src/middleware/productValidation.ts`**: הפיכת ה-Middleware לאסינכרוני ושילוב הסכמה הדינמית.
3.  [ ] **עדכון `server/src/services/filterAttributeService.ts`**: הוספת Invalidation ו-Safety Checks.
4.  [ ] **בדיקה (Verification)**: יצירת מאפיין חדש -> יצירת מוצר שמשתמש בו -> וידוא שמירה ב-DB.
