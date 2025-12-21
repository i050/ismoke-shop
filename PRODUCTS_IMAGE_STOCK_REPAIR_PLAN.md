# תוכנית תיקונים מפורטת — התממשקות Cloudinary, Rollback תמונות, וניהול מלאי אטומי

גרסה: 1.0

מטרה: לתכנן ולתעד באופן מפורט ושלב-אחר-שלב את כל התיקונים הדרושים בפרויקט כדי:
- למנוע דליפות תמונות orphaned ב-Cloudinary
- להבטיח שהעלאות תמונה ויצירת מוצר הן אטומיות או ניתנות ל-roll-back
- למנוע oversell על ידי שימוש בפעולות מלאי אטומיות ומקושרות לטרנזקציות
- להוסיף מעקב/ניקוי אוטומטי ותשתית בדיקות לאינטגרציה מלאה

התאמה לפרויקט:
- הקבצים המרכזיים שנבדקו ואליהם התוכנית מתייחסת: `server/src/controllers/productController.ts`, `server/src/services/productService.ts`, `server/src/services/imageService.ts`, `server/src/middleware/uploadMiddleware.ts`, `server/src/models/Sku.ts`, `server/src/services/skuService.ts`, `client/src/components/.../ProductForm/*`, `client/src/services/productManagementService.ts`, `client/src/store/slices/productsManagementSlice.ts`, `server/src/routes/productRoutes.ts`.

---

## תקציר מומחה קצר (מה הבעיה ולמה זה קריטי)
1. בעיית תמונות orphaned: הלקוח מעלה תמונות ל-Cloudinary (מקבל `url`/`public_id`) לפני יצירת המוצר. אם יצירת המוצר נכשלת — התמונות נשארות בענן ללא קשר ל-DB.
2. בעיית מלאי (oversell): עדכוני `stockQuantity` נעשים ישירות או בצורה לא-אטומית בחלק מהקוד (סיכוי ל-race conditions). יש להשתמש בפונקציות אטומיות (`decrementStockAtomic`) ולבטל עדכונים במקרה של כשל.

השפעות: עלויות מיותרות, זיהום DB, חוויית משתמש לקויה, סיכוני אבטחה וחשיפה לקלאוד.

---

## מסגרת פתרון רב-שכבתי — קווים מנחים כלליים
- לא חייבים לממש פתרון אחד יחיד: מומלץ גישת layered — תיקון מיידי (MVP) + פתרון ביניים (tracking) + פתרון ארוך טווח (Two-Phase Commit).
- תמיד לוג הפעולות (winston) ושליחת metrics ל-monitoring (Prometheus/Datadog) על כל שלב קריטי.
- כל שינוי בקוד חייב לכלול: unit tests + integration tests + חיזוק logging.

---

# תכנית שלבים מפורטת (ללא התייחסות לזמני פיתוח)

המסמך מחולק ל-3 מסלולי מימוש (מיידי, בינוני, ארוך טווח) וכל מסלול מפורט צעד-אחרי-צעד עם קישורים לקבצים רלוונטיים וקוד-דוגמה נדרש.

## חלק א' — תיקון מהיר (MVP) — Rollback מיידי ב-controller
מטרה: למנוע ככל האפשר orphaned images בצורה הפשוטה ביותר שאפשר להטמיע מיד בפרויקט.
התאמה לפרויקט: שינוי קל ב-`server/src/controllers/productController.ts` — `createProductWithSkus` ו־`updateProductWithSkus`.

צעדים מפורטים:
1. איסוף public_ids לפני קריאת ה-service
   - בקוד controller (לפני קריאת `productService.createProductWithSkus`) לאסוף את כל `public_id` שנמצאים ב-`req.body.product.images` ובכל `req.body.skus[*].images`.
   - לדוגמא (לוגיקה):
     - `const allPublicIds = [...(productData.images||[]).map(i=>i.public_id), ...(skusData?.flatMap(s=>s.images?.map(i=>i.public_id)||[])||[])].filter(Boolean);`
   - סיבה: controller זה המקום שבו יש את ה-body המלא — service עשוי לקבל רק נתונים מנוקים.

2. קריאה ל-service בתוך try/catch
   - בסוף ה־try: החזרת תשובה רגילה ללקוח.
   - ב־catch: אם אירעה שגיאה, לבצע ניסיון מיידי למחוק את כל `allPublicIds` באמצעות `imageService.deleteImages(allPublicIds)`.
   - חשוב: במקרה של כשל במחיקה — אל תזרוק שגיאה נוספת; יש לרשום ל־logger ולשלוח alert (לא לעצור החזרת השגיאה המקורית ללקוח).

3. הטמעה בקבצים:
   - `server/src/controllers/productController.ts` — לשנות את `createProductWithSkus` ו־`updateProductWithSkus` בהתאם.
   - שימוש ב־`server/src/services/imageService.ts` או ב־`server/src/middleware/uploadMiddleware.ts` (פונקציות delete קיימות: `deleteImages` / `deleteMultipleImagesFromCloudinary`).

4. Edge-cases לטיפול במיידי:
   - public_id חסר או ריק — לסנן.
   - במקרה של שגיאת duplicate-key (11000) — המחיקה תתבצע גם כן.
   - מצב שבו חלק מהתמונות הועלו ועדיין לא מופיעות ב-body (לא סביר אם הלקוח שולח URLs) — המנגנון הזה מטפל רק ב-public_ids שנמסרו.

תוצרים ומדידות:
- לוג: כמה תמונות הוסרו בעת כישלון.
- alert: אם מחיקות נכשלו לעיתים תכופות (איסוף סטטיסטיקה).

יתרונות MVP:
- מהיר להטמעה (קוד-שורה-וסקריפט), מוריד חשיפה מיידית ל-orphaned images.
- אינו דורש שינוי ב-flow של הלקוח.

חסרונות MVP:
- פתרון חלקי — לא מכסה מקרים בהם public_ids לא נמסרו, או העלאה חלקית.

***סיום שלב***: שדרוג ה-controller עם rollback מיידי.

---

## חלק ב' — פתרון ביניים מומלץ (Tracking + TTL) — Idempotent Upload with Tracking
מטרה: מעקב מדויק אחרי כל העלאה, טיפול אוטומטי ב-orphaned images, תמיכה ב-idempotency.
התאמה לפרויקט: הוספת מודול חדש ב־server, שינויים ב־`uploadProductImagesController` וב־`productService.createProductWithSkus`.

צעדים מפורטים:
1. יצירת מודל MongoDB חדש: `server/src/models/ImageUploadTracking.ts`
   - Schema:
     - `publicId: string` (unique)
     - `status: 'pending' | 'confirmed' | 'failed'` (default 'pending')
     - `productId?: ObjectId` (nullable)
     - `sku?: string` (optional)
     - `createdAt: Date` (default now)
     - TTL index: `expires` = 24h (לבצע expire על מסמכים בסטטוס pending מעל 24h)

2. שינוי `uploadProductImagesController` (`server/src/middleware/uploadMiddleware.ts`)
   - אחרי העלאה ל־Cloudinary לקבלת `uploadResults` (כולל `public_id`) → ליצור רשומות ב־`ImageUploadTracking` עם `status: 'pending'`.
   - החזרת התוצאות ללקוח כחוזר.

3. שינויים ב־controller/service (כאשר יוצרים מוצר):
   - ב־`createProductWithSkus` אחרי יצירת הטרנזקציה בהצלחה (commit) — לעדכן את ה־tracking לתקן `status: 'confirmed'` ולקשור `productId` להעלות המתאימות.
   - ב־catch (failed transaction): לשאול את `ImageUploadTracking` על publicIds שנמצאים בסטטוס `pending` ולמחוק אותן מה־Cloudinary; לעדכן את ה־tracking ל`failed`.

4. Cron Job לניקוי
   - ליצור סקריפט `server/src/scripts/cleanupOrphanedImages.ts` ולרוץ באמצעות cron/CI scheduler כל x שעות.
   - הסקריפט מחפש `ImageUploadTracking` עם `status: 'pending'` שיצרו לפני 24h → מנסה למחוק מה־Cloudinary ולסמן `failed` או `deleted`.

5. אינטגרציה ל־Monitoring
   - מדדים: מספר תמונות pending > 24h, failed deletions.
   - Alerts: אם שיעור ה־pending גבוה מדי — לשלוח Slack/email.

יתרונות פתרון זה:
- עקיבה מלאה ויכולת ניטור
- ניתן לזהות orphaned images ולהסירם באופן בטוח
- TTL מפחית הצורך לניקיון ידני

חסרונות:
- צורך במודל חדש וב-DB writes נוספים לכל העלאה
- מעט מורכבות נוספת

***סיום שלב***: הטמעת מודל tracking וניקוי אוטומטי.

---

## חלק ג' — פתרון ארוך טווח (מועדף ארכיטקטונלית) — Two-Phase Commit / Pending Tagging
מטרה: להפוך את תהליך ה-upload ל־idempotent ובטוח בצורה שמבטיחה שאין orphaned גם במקרי קראש.
התאמה לפרויקט: שינויים בקונפיג Cloudinary tagging, שינויים ב־uploadMiddleware וב־productService, והוספת Cron job למעקב.

ליבת הרעיון:
- שלב 1 (upload): כל תמונה מועלת עם tag `pending_upload` ו־context `status=pending`.
- שלב 2 (create): אם הטרנזקציה של יצירת מוצר/sku הצליחה — קוראים API של Cloudinary או מעדכנים את התגיות/context ל־`confirmed` (או מסירים את `pending_upload`).
- שלב 3 (cleanup): Cron job מוחק את כל התמונות שסומנו `pending_upload` ונותרו מעל סף זמן.

צעדים מפורטים:
1. Cloudinary: הגדרת tagging convention
   - `pending_upload` tag על כל upload
   - `product-id: <id>` ו־`sku:<sku>` כתגיות אופציונליות כאשר זמינות

2. שינוי `uploadBufferToCloudinary` לייצור tags/context
   - השתמש ב־upload options `tags: ['pending_upload']` ו־`context: 'status=pending,created_at=...'`.

3. שינוי flow ביצירה (service/controller)
   - אחרי commit של הטרנזקציה — לקרוא ל־imageService.confirmImages(publicIds) שמסיר את tag `pending_upload` ומעדכן tags מתאימים (product-id, sku).

4. Cron cleanup (כמו בחלק ב')
   - הסר/מחק תמונות עם tag `pending_upload` שנוצרו לפני זמן סף (24h) — לדווח ולרשום ל־logger.

יתרונות:
- פתרון חזק מאוד מול crash ו-race
- Cloudinary מאפשר חיפוש על תגיות/metadata ולכן קל לנהל ניקוי

חסרונות:
- דורש שינויים בתשתית Cloudinary ובקריאות נוספות ל־Cloudinary (עלויות API)
- צריך להבטיח אחידות tags וביצוע confirm בכל המקומות המתאימים

***סיום שלב***: הטמעת Two-Phase Commit עם tagging + cron לניקוי.

---

## חלק ד' — Audit ותיקון מלאי אטומי (decrementStockAtomic)
מטרה: לאכוף שכל עדכון מלאי שמוביל למכירה נעשה אטומית ובטוחה מפני oversell.
התאמה לפרויקט: בדיקה ותיקון בקבצים בהם מתבצע checkout/order/cart: `server/src/services/cartService.ts`, `server/src/services/orderService.ts`, כל סקריפט/route שמעדכן `stockQuantity`.

צעדים מפורטים:
1. Audit קוד קיים (חיפוש מקבצי מקור)
   - חפש שימושים ישירים של `stockQuantity` שינויי שדה (pattern):
     - `grep -r "stockQuantity" server/src/`
     - `grep -r "\.stockQuantity" server/src/`
     - חפש `findByIdAndUpdate`, `save()` על מסמכי Sku שבהם יש שינויים ידניים על מלאי.

2. תקן מיידית קוד לא אטומי
   - כל מקום שקורא ל־SKU ומבצע `sku.stockQuantity -= x; sku.save()` או דומה — להחליפו בקריאה לפונקציות בסרוויס `skuService`:
     - `await skuService.decrementStockAtomic(skuCode, quantity)` (או העברה עם session ל־bulk operations `bulkDecrementStockAtomic`).
   - ודא ש־checkout flow כולו רץ בתוך session/transaction שבו גם יצירת הזמנה וחשבון תשלומים מתנהלים (אם רלוונטי).

3. עדכון חתימות פונקציות
   - אם צריך להעביר `session` לתוך `decrementStockAtomic` (מספר implementations בקוד השרת כבר תומכים ב-session), עדכן לקרוא עם session כאשר משתמשים ב־transaction גלובלי.

4. הוספת בדיקות concurrency
   - רץ test שמדמה שני checkouts בו-זמניים (Promise.allSettled) — ודא שאחד נכשל והשני מצליח.

5. בדיקות regression
   - להוסיף unit tests לכל פונקציות `skuService` ולבדוק התנהגות כשאין מספיק מלאי.

***סיום שלב***: שדרוג כל השימושים עדכוני מלאי לשימוש בפונקציות אטומיות.

---

## חלק ה' — Test Suite (Unit, Integration, E2E) — Coverage חיוני
מטרה: לבדוק את התרחישים הקריטיים ולהבטיח שלא נחזור למצבים של orphaned images או oversell.

Test cases מומלצים:
1. Integration: יצירת מוצר עם תמונות ו-SKUs
   - העלאת תמונות (mock Cloudinary או שימוש בחשבון בדיקה) → קריאה ל`POST /api/products/with-skus` → בדוק סטטוס 201, שמירה ב-DB, ושמירת `public_id` בתוך ה־product/sku.

2. Integration: יצירת מוצר נכשל עם duplicate SKU
   - העלאת תמונות → קביעה ש־sku קיים מראש → קריאה ל־/with-skus שמחזירה 409 → בדוק שהתמונות נמחקו מה־Cloudinary.

3. Concurrency: concurrent creates with same SKU
   - שני בקשות ב־Promise.allSettled עם אותו sku → אחד צריך להצליח, השני להיכשל (409).

4. Concurrency: concurrent checkouts
   - יצירת SKU עם stockQuantity=1 → שני checkouts במקביל של כמות 1 → אחד יצליח.

5. Cron job tests
   - סימולציה: יצירת ImageUploadTracking עם `pending` ותאריך יצירה ישן יותר מ-24h, הרצת סקריפט cleanup → ודא תמונה נמחקת ו־tracking מסומן כ־failed.

כלים מומלצים:
- Backend: Jest + Supertest עבור integration tests.
- End-to-end: Cypress (אופציונלי עבור ה-flow המלא שמשלב frontend).
- Mocking Cloudinary: להשתמש ב־nock או לספק adapter שמחקה קריאות Cloudinary ב־tests (כדי להימנע מעלויות).

---

## חלק ו' — CI / Monitoring / Rollout
1. CI pipelines:
   - להריץ unit tests + integration tests לפני שחרור ל־main.
   - להריץ smoke tests על endpoint `/api/products/with-skus` ב־staging.

2. Monitoring:
   - Logs (Winston): להוסיף log levels לכל פעולות ה-upload/delete/transaction.
   - Metrics: לחשב מספר orphaned images, תמונות שנמחקו ע"י cron, כשלי commit.
   - Alerts: Slack/email אם orphaned > threshold או כשלי delete חוזרים.

3. Rollout strategy:
   - להטמיע MVP (controller rollback) ראשון ב־staging → לבדוק → להעלות ל־production בהדרגה.
   - לאחר מכן להטמיע tracking DB + cron.
   - לשקול Two-Phase Commit רק לאחר שבוצעו הקודמים ונמדדה יציבות.

---

## חלק ז' — דוגמאות קוד (פשוטות) — רק להמחשה
> שים לב: זו רק הדגמה; היישום סופי יעשה באמצעות הקבצים המצוינים.

### Controller rollback (MVP) — דוגמא (pseudocode)
```js
// server/src/controllers/productController.ts
const allPublicIds = [ ...(productData.images||[]).map(i=>i.public_id), ... ];
try {
  const result = await productService.createProductWithSkus(productData, skusData);
  res.status(201).json(result);
} catch (error) {
  if (allPublicIds.length > 0) {
    try { await imageService.deleteImages(allPublicIds); }
    catch (delErr) { logger.error('Failed to delete orphaned images', delErr); }
  }
  throw error; // or res.status(500).json(...)
}
```

### Tracking model (schema sketch)
```js
// server/src/models/ImageUploadTracking.ts
const ImageUploadTrackingSchema = new Schema({
  publicId: { type: String, unique: true },
  status: { type: String, enum: ['pending','confirmed','failed'], default: 'pending' },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  sku: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL 24h
});
```

---

## חלק ח' — Checklist אינטגרציה לפרויקט (מה לבדוק אחרי מימוש)
- [ ] ה־controller ל־`/with-skus` מעודכן ל־rollback מיידי.
- [ ] קיימת פונקציית `imageService.deleteImages` ונבדקה בשימוש.
- [ ] אוספים `public_id` מכל מקורות התמונה בטופס (product + sku.images).
- [ ] ה־audit של `stockQuantity` הושלם וכל העדכונים עוברים דרך `skuService.decrementStockAtomic`/`incrementStockAtomic`.
- [ ] הוספת tests (integration/concurrency) שנבדקו ב־CI.
- [ ] אם הוטמע tracking — Cron job פעיל ונבדק.
- [ ] Monitoring/alerts מוגדרים עבור orphaned images ו-failed deletes.

---

## חלק ט' — המלצות תפעוליות וטכניות נוספות
1. Cloudinary: קונפיג׳ אפשרויות אוטומטיות של unsigned/retention אם אפשר (במקרים מסוימים). כל API calls חייבים להיות rate-limited ומחוברים ל־retries עם exponential backoff.
2. Logs: שמור בפורמט JSON עשיר (publicId, productId, sku, caller, duration, error) כדי להקל על התחקור.
3. Security: אל תיתן public URLs לפרטי מוצר עד שהמוצר מאושר/נוצר — אם צריך, השתמש ב-signed URLs.
4. UX: להציג למשתמש הודעה ברורה במידה ויצירת מוצר נכשלה אחרי העלאת תמונות ("שמחנו את התמונות — אך שמירת המוצר נכשלה. אנחנו מוחקים את התמונות כעת.").

---

## חלק י' — סיכום והמלצות פרקטיות לסדר ביצוע מומלץ (לא לפי שעה אלא לפי סדר חשיבות)
1. מידי (P0): הטמעת controller rollback (MVP) — `server/src/controllers/productController.ts`.
2. מידי (P0): Audit מלאי והעברה לפונקציות אטומיות (`skuService.decrementStockAtomic`) בכל מקום שמבצע checkout.
3. בינוני (P1): הטמעת ImageUploadTracking + Cron cleanup.
4. בינוני (P2): בניית test-suite אינטגרטיבי + CI integration.
5. ארוך טווח (P3): הטמעת Two-Phase Commit / tagging ו־confirm flow.

---

## נספח: נקודות Implementation-Details מהפרויקט הנוכחי
- קבצים רלוונטיים: `server/src/controllers/productController.ts`, `server/src/services/productService.ts`, `server/src/services/imageService.ts`, `server/src/middleware/uploadMiddleware.ts`, `server/src/models/Sku.ts`, `server/src/services/skuService.ts`, `client/src/services/productManagementService.ts`.
- שים לב: `productService.createProductWithSkus` כבר עושה transactions ב־Mongo והוא מתאים לאינטגרציה עם חלק מהפתרונות.

---

## מה הבא?
1. אם תאשר — אני אפתח PR שמוסיף את ה-MVP: שינוי קטן ב־controller ל־rollback מיידי (שורת קוד + בדיקות יחידה). (שלב: apply code)
2. במקביל אפשר להתחיל Audit למלאי (אני יכול להריץ חיפושים בקוד ולרכז את המקומות שדורשים תיקון). (שלב: audit)
3. לאחר אישור שינויים ראשוניים — נטמיע tracking + cron. (שלב: infra)

---

קובץ זה נוצר כדי לשמש כ-manual ו־playbook לפיתוח ובדיקות, וניתן לשלב אותו ב־README או כ־`IMPLEMENTATION_PLAN` בתוך מסמכי הפרויקט.

