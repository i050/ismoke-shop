## תכנית מפורטת: עריכת מלאי של SKUs ישירות בטאב "מלאי"

מטרה: לאפשר למנהל המוצר לערוך את כמות המלאי של כל וריאנט (SKU) ישירות מתוך הטאב "מלאי" בזמן יצירה ובזמן עריכה, באופן בטוח, ונוח, תוך שמירה על עקביות נתונים מול השרת.

תקציר מהיר
- התחלה בטווח קצר: מימוש שמירה אצווה (batch) — עדכון כל ה-SKUs ושדה `product.quantityInStock` בעת לחיצה על "שמור".
- שלב מתקדם: אפשרות לשמירה מיידית (per-SKU) עם optimistic updates — להטמיע אחרי בדיקות.

עקרונות הנדסיים
- שמרו על עקביות: כל עדכון מלאי צריך להתעדכן ב-server בתוך טרנזקציה שמעדכנת גם את `product.quantityInStock` לפי סכימת SKUs.
- מינימום שינוי במבנה הקיים: להשתמש ב-react-hook-form הקיים (RHF) ובפונקציית `setValueWithDirty` כדי לעדכן סטייט הטופס.
- חוויית משתמש ברורה: עריכה inline, עדכון סכום בזמן אמת, הודעות הצלחה/שגיאה ברורות.
- נגישות: שדות עריכה ניתנים למקלדת, aria labels וברירת מוקד נכונה.

מצב נוכחי בקוד (תקציר)
- `ProductForm.tsx` - טופס מבוסס RHF. יש שדות `skus` ו-`stockQuantity` בתוך ה-form.
- `ProductInventory` - קומפוננטה לטאב מלאי שמקבלת `skus` ופרטי מלאי; כיום מציגה סיכום ומידע, ללא עריכה inline לכל SKU.
- `ProductSKUs` ו-`AddSKUModal` - קיימת לוגיקה מלאה לעריכת SKU בתוך modal עם ולידציה.
- שרת: קיימת לוגיקה ליצירת SKU דיפולטי ועדכון `product.quantityInStock` בתוך טרנזקציות.

מה המשתמש יחווה בסוף העבודה הזו
- בטאב "מלאי" יוצג טבלה/רשימה של ה־SKUs (או שורה אחת ב-create) עם העמודות הבסיסיות: קוד SKU, שם/תיאור, כמות במלאי (input/spinner), סטטוס ותמונה מוקטנת.
- המשתמש יכול לשנות את שדה הכמות לכל SKU ולראות את הסכום הכולל מתעדכן מיד (client-side).
- יש כפתור "שמור שינויים" שמבצע קריאת API אחת עם כל ה-SKUs המעודכנים (batch), ומציג toast על הצלחה/שגיאה.
- בתצורה מתקדמת: ניתן להפעיל שמירה אוטומטית per-field עם הודעת טעינה קטנה וסימון optimistic update.

ממשק נתונים (contract)
- בצד לקוח: עדכון השדה `skus` ב-RHF - כל עריכה מעדכנת מערך ה-SKUs ובנוסף מחשבת ומשתמשת ב־`setValueWithDirty('stockQuantity', newTotal)` כדי לעדכן את סיכום המלאי בטופס.
- בקריאה לשרת (batch):
  - Endpoint: `PUT /api/products/:id/skus` או `PUT /api/products/:id` עם payload שמכיל `skus: SKUFormData[]`.
  - השרת יקבל את המערך המלא של SKUs המעודכנים ויבצע עדכון בתוך טרנזקציה:
    1. עדכון/יצירת/מחיקה של SKUs כנדרש
    2. חישוב סכום מלאי: SUM(sku.stockQuantity)
    3. עדכון `product.quantityInStock` עם הסכום
    4. החזרת ה-product המלא אחרי population של skus

הצעדי מימוש (פרקטי) - סדר כרונולוגי

שלב A — החלטות ו־feature flag
1. החלטה: נתחיל ב״שמירה אצווה״ (batch) כזרימת ברירת מחדל.
2. הוספת feature flag `featureFlags.autoSaveSkuInventory` ו־`featureFlags.inlineSkuInventoryEdit` אם רוצים להשקות בהדרגה.

שלב B — עדכונים ב־UI
1. `ProductInventory`:
   - העבר/הרחב את ה־props כדי לקבל גם `onSkusChange?: (skus: SKUFormData[]) => void` (או להשתמש ישירות ב־setValue דרך context/FormProvider).
   - הצג טבלה עם שדות עבור כל SKU: `sku`, `name`, `stockQuantity` (input number), `isActive`, `thumbnail`.
   - טיפול באירוע שינוי: עדכון מקומי של `skus` (השתמש ב־`setValueWithDirty('skus', updatedSkus)` של `ProductForm`).
   - חישוב סכום ומצגו: compute locally `updatedSkus.reduce((s, k) => s + k.stockQuantity, 0)` ועדכון `setValueWithDirty('stockQuantity', total)`.
2. UX: כפתור "שמור שינויים" גלובלי בטופס או כפתור מקומי בטאב; הוספת toast/loader בזמן השמירה.

שלב C — עדכונים ב־Form flow
1. `ProductForm`:
   - לוודא ש־`ProductInventory` נמצא תחת `FormProvider` ושימוש ב־`setValueWithDirty` כדי לעדכן את ה־form.
   - כאשר המשתמש לוחץ "שמור שינויים" בטאב, לקרוא ל־onSubmit או ל־API שמעדכן את ה-SKUs בלבד (עדיפות ל־endpoint ייעודי).

שלב D — עדכונים בצד השרת
1. Endpoint חדש/קיים: `PUT /products/:id/skus` או שימוש ב־`updateProductWithSkus` הקיים.
2. בתוך ה-service:
   - בתוך טרנזקציה: עדכון/החלפה של SKUs (insert/update/delete לפי השוואה או לפי מזהים), חישוב סכום מלאי ועדכון `product.quantityInStock`.
   - החזר את ה-product עם populated skus.

שלב E — בדיקות ו־QA
1. בדיקות ידניות:
   - יצירת מוצר חדש: בטאב מלאי יש שורה של SKU דיפולטית שניתן לערוך; שמירה שולחת את ה־skus ומחזירה את ה־product עם skus.
   - עריכה של כמה SKUs ושמירה ב-batch — ודא שהסכום הכולל מעודכן בשרת וב־UI.
   - כשלי רשת: ודא הודעת שגיאה ויכולת retry.
2. בדיקות אוטומטיות:
   - unit tests ל־service שמעדכן skus ומחשב סכום.
   - integration test קצר שמדמה שמירת skus דרך ה־endpoint.

שיקולי ביצועים ומדידה
- שימוש ב-batch מפחית קריאות רשת מרובות. לשמירה per-field לשקול debounce ו־optimistic update.
- מדדי חשיבה: זמן שעבר ממשתמש ללחיצה עד עדכון מוצלח, שיעור שגיאות שמירה, עומס DB על טרנזקציות.

נגישות (A11y)
- כל input חייב תווית `aria-label` ו־aria-describedby לשגיאות.
- צירוף מפוקס בעת כניסה לטאב "מלאי" — במצב create אולי להעביר פוקוס לשדה המלאי של ה־SKU הראשון.

רשימת קבצים להוסיף/לעדכן
- client:
  - `client/src/components/features/admin/Products/ProductForm/ProductInventory.tsx` — הרחבה להצגה ועריכה של SKUs
  - `client/src/components/features/admin/Products/ProductForm/ProductForm.tsx` — שימוש ב־setValueWithDirty ושילוב כפתור שמירה בטאב
  - `client/src/components/features/admin/Products/ProductForm/ProductSKUs/*` — תאום בין עריכות Inventory ו־SKUs
- server:
  - `server/src/services/productService.ts` — וידוא/הרחבה של `updateProductWithSkus` ו־create flow
  - `server/src/controllers/productsController.ts` — הוספת route/handler אם צריך

לוח זמנים מומלץ (אג'ילי, story-based)
1. Story 1 (1–2 יום): UI - טבלת SKUs ב־`ProductInventory` עם עריכת `stockQuantity` ועדכון מקומי של סכום.
2. Story 2 (1 יום): שמירה אצווה - שליחת ה־skus המעודכנים ב־API ועדכון בשרת.
3. Story 3 (0.5–1 יום): בדיקות ידניות + תיקוני UI/ולידציה.
4. Story 4 (1 יום): שיפור — שמירה per-field עם optimistic updates (אופציונלי).

סיכום
התכנית מפחיתה צעדי עבודה למנהלי המוצר, משפרת הדיוק של מלאי ברגע יצירה ועריכה, ושומרת על עקביות בשרת באמצעות עדכוני טרנזקציה. ההמלצה להתחיל בשמירה אצווה מפחיתה סיכונים ומאפשר להטמיע את היכולות במהירות.

---
אם תרצה, אני יכול להמיר את התכנית הזאת לרשימת שינויי קוד מדויקים (patch) ולהתחיל ביישום של Story 1 בקבצי ה־client. איזה דרך להמשיך מעדיף — להתחיל בביצוע (ממשק) או להכין את שינויים בשרת קודם?
