# תוכנית מפורטת להשלמת היררכיית מחירים ו"מחיר לפני הנחה"

תאריך בדיקה: 2026-05-03

מטרת המסמך: לתעד בצורה מלאה, מדויקת ומעשית את הדרישה העסקית, את המצב הקיים בקוד, את ההיגיון מאחורי המימוש הנכון, את כל נקודות הבדיקה הנדרשות לפני שינוי קוד, ואת תוכנית הביצוע המקצועית להשלמת הפיצ'ר בלי לשבור את המערכת הקיימת.

המסמך הזה לא משנה התנהגות בקוד. הוא מסמך עבודה שמטרתו להיות בסיס בטוח ליישום.

---

## 1. תקציר מנהלים

בפרויקט כבר קיימים שני מושגים עיקריים של מחיר:

1. `basePrice` ברמת מוצר: המחיר האמיתי הבסיסי של המוצר.
2. `price` ברמת SKU: מחיר אמיתי ספציפי לגרסה, אופציונלי, שאמור לדרוס את מחיר המוצר אם הוא קיים.

בנוסף קיים `compareAtPrice` ברמת מוצר בלבד. זה השדה שאמור לייצג "מחיר לפני הנחה", כלומר מחיר שמוצג ללקוח כמחיר מחוק, אבל לא משפיע על מחיר לתשלום, סל, הזמנה, הנחת קבוצת לקוח או כל חישוב כספי אמיתי.

מה שחסר כרגע הוא מימוש מלא של `compareAtPrice` ברמת SKU. בלי זה אי אפשר לתמוך במדויק בכל ההיררכיה המבוקשת עבור מוצרים עם גרסאות.

נמצאה גם נקודת סיכון קיימת: טופס הניהול שולח `compareAtPrice` ברמת מוצר, אבל ולידציית השרת במסלולי `/with-skus` לא מכירה את השדה, ובגלל `stripUnknown: true` השדה כנראה מוסר לפני שהוא מגיע לשמירה.

נמצאה נקודת סיכון נוספת: בצד לקוח, `cleanPayload` מסיר ערכי `null`. לכן גם אחרי שנוסיף תמיכה בשדות, צריך לוודא שאפשר למחוק ערך קיים של `compareAtPrice`, ולא רק להוסיף או לעדכן אותו.

---

## 2. הדרישה העסקית כפי שהובנה

יש שני סוגי מחיר שונים לחלוטין:

1. מחיר אמיתי.
2. מחיר לפני הנחה.

המחיר האמיתי הוא המחיר שקובע בפועל:

1. זה המחיר שמוצג כמחיר לתשלום.
2. זה המחיר שעליו מחושבות הנחות קבוצות לקוח.
3. זה המחיר שנכנס לסל.
4. זה המחיר שנכנס להזמנה.
5. זה המחיר שמשפיע על סכומים, totals, checkout, order snapshot, וכל חישוב כספי אמיתי.

המחיר לפני הנחה הוא מחיר תצוגתי בלבד:

1. הוא מיועד להראות ללקוח "לפני" או "מחיר קודם".
2. הוא אמור להופיע באדום עם קו מחוק או באפור עם קו מחוק.
3. הוא לא אמור להשפיע על המחיר הסופי.
4. הוא לא אמור להשפיע על הנחת קבוצת לקוח.
5. הוא לא אמור להשפיע על סל, הזמנה, מלאי, תשלום או דוחות כספיים.

---

## 3. מילון מונחים לפי הקוד הקיים

### Product.basePrice

המחיר האמיתי ברמת המוצר.

מיקום עיקרי:

`server/src/models/Product.ts`

נמצא בממשק:

`server/src/models/Product.ts:78`

נמצא בסכמה:

`server/src/models/Product.ts:294`

משמעות עסקית:

אם למוצר אין גרסאות, או אם לגרסה שנבחרה אין מחיר משלה, זה המחיר האמיתי שצריך לשמש את הלקוח.

### Product.compareAtPrice

"מחיר לפני הנחה" ברמת המוצר.

מיקום עיקרי:

`server/src/models/Product.ts:153`

`server/src/models/Product.ts:428`

משמעות עסקית:

מחיר תצוגתי בלבד. אם הוא גבוה מהמחיר האמיתי, ניתן להציג אותו כמחיר מחוק.

### Sku.price

מחיר אמיתי ספציפי לגרסה.

מיקום עיקרי:

`server/src/models/Sku.ts:31`

`server/src/models/Sku.ts:138`

משמעות עסקית:

אם `Sku.price` מוגדר, הוא דורס את `Product.basePrice` עבור הגרסה הספציפית.

אם `Sku.price` הוא `null` או לא קיים, הגרסה יורשת את `Product.basePrice`.

### Sku.compareAtPrice

השדה הזה עדיין לא קיים בקוד.

משמעות עסקית נדרשת:

מחיר לפני הנחה ספציפי לגרסה. גם הוא תצוגתי בלבד, ואסור שישפיע על חישובי מחיר אמיתי.

### PricingData.originalPrice

שדה תצוגה שמגיע לצד לקוח כחלק מ-`pricing`.

מיקום:

`client/src/types/Product.ts:4`

היום הוא משמש להצגת מחיר מקורי, לפעמים מתוך `compareAtPrice` ולפעמים מתוך מחיר לפני הנחת קבוצת לקוח.

חשוב:

שם השדה `originalPrice` קצת מטעה, כי הוא מערבב שני עולמות:

1. מחיר לפני הנחה שיווקי: `compareAtPrice`.
2. מחיר לפני הנחת קבוצת לקוח: `basePrice` לפני אחוז ההנחה.

זה לא בהכרח באג, אבל צריך להיזהר לא לתת ל-`originalPrice` להפוך למחיר עסקי קובע.

### PricingData.finalPrice

המחיר שהלקוח אמור לשלם.

מיקום:

`client/src/types/Product.ts:5`

זה השדה החשוב לחישוב תשלום, אבל בפועל בסל ובהזמנה השרת מחשב מחדש ולא אמור לסמוך רק על הלקוח.

### CustomerGroup.discountPercentage

אחוז הנחה לקבוצת לקוחות.

מיקום:

`server/src/models/CustomerGroup.ts:6`

`server/src/models/CustomerGroup.ts:41`

הדרישה:

אחוז ההנחה יורד מהמחיר האמיתי בלבד, ולא מ-`compareAtPrice`.

---

## 4. חוקי המחיר הנדרשים

### 4.1 מוצר ללא גרסאות

אם אין גרסאות או לא נבחר SKU:

1. המחיר האמיתי הוא `Product.basePrice`.
2. המחיר לפני הנחה הוא `Product.compareAtPrice`, רק אם הוא קיים ורלוונטי להצגה.
3. הנחת קבוצת לקוח מחושבת מתוך `Product.basePrice`.
4. `Product.compareAtPrice` לא משתתף בחישוב ההנחה.

דוגמה:

`basePrice = 100`

`compareAtPrice = 130`

לקוח רגיל רואה:

מחיר אמיתי: 100

מחיר לפני הנחה: 130 מחוק

לקוח בקבוצת 10% רואה:

מחיר אמיתי סופי: 90

מחיר לפני הנחה יכול להיות 130 מחוק לצורכי תצוגה, אבל הוא לא משמש לחישוב ה-90.

### 4.2 מוצר עם גרסאות: מחיר אמיתי

היררכיית המחיר האמיתי:

1. אם ל-SKU הספציפי יש `price`, זה המחיר האמיתי של הגרסה.
2. אם ל-SKU הספציפי אין `price`, המחיר האמיתי יורש מ-`Product.basePrice`.

כלומר:

```ts
effectivePrice = sku.price ?? product.basePrice
```

הקוד כבר משתמש בתבנית הזאת בכמה מקומות:

`server/src/services/cartService.ts:305`

`server/src/services/orderService.ts:287`

`client/src/components/features/products/ProductCard/ProductCard.tsx:139`

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:114`

### 4.3 מוצר עם גרסאות: מחיר לפני הנחה

היררכיית `compareAtPrice` המבוקשת מורכבת יותר מהמחיר האמיתי.

טבלת מצבים:

| מצב SKU | מחיר אמיתי שיוצג | מחיר לפני הנחה שיוצג |
|---|---:|---:|
| ל-SKU יש `price` ויש `compareAtPrice` | `sku.price` | `sku.compareAtPrice` |
| ל-SKU יש `price` ואין `compareAtPrice` | `sku.price` | לא להציג בכלל |
| ל-SKU אין `price` ואין `compareAtPrice` | `product.basePrice` | `product.compareAtPrice` |
| ל-SKU אין `price` אבל יש `compareAtPrice` | `product.basePrice` | לא להציג את `sku.compareAtPrice` |

הכלל המרכזי:

`sku.compareAtPrice` תקף רק אם יש גם `sku.price`.

למה:

אם לגרסה אין מחיר אמיתי משלה, אז היא לא עומדת בפני עצמה כמחירון נפרד. לכן אין משמעות נכונה להצגת "מחיר לפני הנחה" ספציפי לגרסה ללא מחיר אמיתי ספציפי.

### 4.4 קבוצות לקוח

הנחת קבוצת לקוח תמיד מחושבת על המחיר האמיתי האפקטיבי:

```ts
baseForGroupDiscount = sku.price ?? product.basePrice
finalPrice = baseForGroupDiscount * (1 - discountPercentage / 100)
```

אסור לחשב כך:

```ts
finalPrice = compareAtPrice * (1 - discountPercentage / 100)
```

כי `compareAtPrice` אינו מחיר עסקי אמיתי.

---

## 5. המצב הקיים בצד שרת

### 5.1 מודל Product

קובץ:

`server/src/models/Product.ts`

מה קיים:

1. `basePrice` קיים כשדה חובה.
2. `compareAtPrice` קיים כשדה אופציונלי.
3. קיימים גם שדות legacy כמו `isOnSale`, `discountPercentage`, `salePrice`.

נקודות חשובות:

`basePrice`:

`server/src/models/Product.ts:78`

`server/src/models/Product.ts:294`

`compareAtPrice`:

`server/src/models/Product.ts:153`

`server/src/models/Product.ts:428`

שדות legacy:

`server/src/models/Product.ts:154`

`server/src/models/Product.ts:155`

`server/src/models/Product.ts:156`

המשמעות:

ברמת DB, מוצר כבר יכול להחזיק "מחיר לפני הנחה". הבעיה היא לא במודל המוצר, אלא בזרימת API, ולידציה, טופס, וניהול גרסאות.

### 5.2 מודל Sku

קובץ:

`server/src/models/Sku.ts`

מה קיים:

1. `price?: number | null`.
2. הערה מפורשת שאם המחיר `null` או לא מוגדר, משתמשים ב-`Product.basePrice`.

נקודות:

`server/src/models/Sku.ts:31`

`server/src/models/Sku.ts:138`

`server/src/models/Sku.ts:145`

מה חסר:

אין `compareAtPrice` ב-SKU.

המשמעות:

המערכת לא יכולה לשמור מחיר לפני הנחה ספציפי לגרסה.

### 5.3 ולידציית מוצר ו-SKU

קובץ:

`server/src/middleware/productValidation.ts`

מה קיים:

1. `productSchema` מכיר `basePrice`.
2. `skuSchema` מכיר `price`.
3. המסלולים `/with-skus` משתמשים ב-`stripUnknown: true`.

נקודות:

`server/src/middleware/productValidation.ts:53`

`server/src/middleware/productValidation.ts:334`

`server/src/middleware/productValidation.ts:593`

`server/src/middleware/productValidation.ts:647`

מה חסר:

1. `productSchema` לא מכיר `compareAtPrice`.
2. `skuSchema` לא מכיר `compareAtPrice`.

המשמעות:

גם אם הלקוח שולח `product.compareAtPrice`, הוא עלול להימחק לפני השמירה.

אם בעתיד נוסיף `sku.compareAtPrice` בצד לקוח בלי לעדכן את הוולידציה, גם הוא יימחק.

### 5.4 sanitizeInput

קובץ:

`server/src/middleware/sanitizeInput.ts`

מה קיים:

`sanitizeProduct` כן מכיר `compareAtPrice`.

נקודה:

`server/src/middleware/sanitizeInput.ts:48`

אבל:

בחיפוש בקוד, `sanitizeProduct` מוגדר אבל לא נמצא שימוש שלו ב-routes.

המשמעות:

אי אפשר להסתמך על `sanitizeInput.ts` כדי לומר שהזרימה הקיימת תומכת ב-`compareAtPrice`.

הוולידציה המשמעותית בפועל עבור יצירה/עדכון עם SKUs היא `productValidation.ts`.

### 5.5 Routes

קובץ:

`server/src/routes/productRoutes.ts`

המסלולים המרכזיים של טופס ניהול מוצרים:

1. `POST /api/products/with-skus`
2. `PUT /api/products/:id/with-skus`

נקודות:

`server/src/routes/productRoutes.ts:89`

`server/src/routes/productRoutes.ts:95`

`server/src/routes/productRoutes.ts:103`

`server/src/routes/productRoutes.ts:109`

המשמעות:

כל שינוי בתמיכה ב-`compareAtPrice` חייב לעבור דרך מסלולי `/with-skus`, כי זה הנתיב שה-Admin Product Form משתמש בו לרוב.

### 5.6 Product service

קובץ:

`server/src/services/productService.ts`

מה קיים:

1. יצירת מוצר עם SKUs.
2. עדכון מוצר עם SKUs.
3. שליפת SKUs למוצר.
4. יצירת SKU בסיס אוטומטי למוצר פשוט.

נקודות:

`server/src/services/productService.ts:847`

`server/src/services/productService.ts:868`

`server/src/services/productService.ts:895`

`server/src/services/productService.ts:987`

`server/src/services/productService.ts:1016`

`server/src/services/productService.ts:1035`

`server/src/services/productService.ts:723`

`server/src/services/productService.ts:740`

נקודת סיכון:

ביצירת SKU בסיס אוטומטי, הקוד שומר `price: productData.basePrice`:

`server/src/services/productService.ts:868`

זה יוצר מחיר מפורש במקום ירושה אמיתית. עבור מוצר פשוט זה כנראה לא מורגש, אבל מבחינת עקרון הנתונים, אם `null` פירושו ירושה, עדיף לא לשמור מחיר זהה למחיר המוצר אלא אם יש סיבה עסקית.

נקודת סיכון נוספת:

בעדכון עם SKUs משתמשים ב-`insertMany`:

`server/src/services/productService.ts:1035`

קיימת בקוד הערה באזור יצירה ש-`insertMany` לא מפעיל hooks, ולכן צריך להיות מודעים לזה אם מוסיפים ל-SKU לוגיקת normalization או hooks חדשים. רצוי לא לבנות את `compareAtPrice` על pre-save hook שלא ירוץ בעדכון.

### 5.7 Pricing service

קובץ:

`server/src/services/pricingService.ts`

מה קיים:

1. חישוב מחיר מוצר לפי `product.basePrice`.
2. חישוב הנחת קבוצת לקוח לפי `product.basePrice`.
3. שילוב `compareAtPrice` לתוך `originalPrice` לצורכי תצוגה.

נקודות:

`server/src/services/pricingService.ts:51`

`server/src/services/pricingService.ts:57`

`server/src/services/pricingService.ts:92`

`server/src/services/pricingService.ts:146`

`server/src/services/pricingService.ts:149`

מה עובד:

המחיר הסופי `finalPrice` מחושב מתוך `basePrice`, לא מתוך `compareAtPrice`.

מה חסר:

אין חישוב מחיר ברמת SKU. השירות מקבל מוצר, לא SKU.

המשמעות:

עבור דפי מוצר עם בחירת גרסה, הלקוח כרגע צריך לחשב חלק מהמחיר בעצמו, או שהשרת צריך להתחיל להחזיר pricing לכל SKU.

### 5.8 Cart service

קובץ:

`server/src/services/cartService.ts`

מה קיים:

הסל משתמש במחיר אמיתי אפקטיבי:

`skuDoc.price ?? product.basePrice`

נקודות:

`server/src/services/cartService.ts:183`

`server/src/services/cartService.ts:305`

`server/src/services/cartService.ts:457`

`server/src/services/cartService.ts:584`

`server/src/services/cartService.ts:706`

`server/src/services/cartService.ts:742`

הנחת קבוצת לקוח מחושבת על המחיר הזה:

`server/src/services/cartService.ts:42`

`server/src/services/cartService.ts:71`

`server/src/services/cartService.ts:72`

המשמעות:

הליבה הכספית של הסל כבר מתנהגת נכון ביחס למחיר האמיתי. אין צורך להכניס `compareAtPrice` לחישוב הסל.

### 5.9 Order service

קובץ:

`server/src/services/orderService.ts`

מה קיים:

הזמנה משתמשת במחיר SKU אם קיים, אחרת במחיר מוצר:

`server/src/services/orderService.ts:287`

אם אין SKU, משתמשים ב-`product.basePrice`:

`server/src/services/orderService.ts:331`

הנחת קבוצת לקוח מחושבת על המחיר שנבחר:

`server/src/services/orderService.ts:376`

המחיר שנכנס להזמנה הוא `pricingResult.finalPrice`:

`server/src/services/orderService.ts:385`

המשמעות:

גם כאן הליבה הכספית נראית נכונה: `compareAtPrice` לא משתתף בהזמנה.

---

## 6. המצב הקיים בצד Admin Frontend

### 6.1 סכמת הטופס

קובץ:

`client/src/schemas/productFormSchema.ts`

מה קיים:

1. `skuSchema.price` קיים ואופציונלי.
2. `product.compareAtPrice` קיים ברמת מוצר.
3. `defaultProductValues.compareAtPrice = null`.
4. `defaultSKUValues.price = null`.

נקודות:

`client/src/schemas/productFormSchema.ts:15`

`client/src/schemas/productFormSchema.ts:49`

`client/src/schemas/productFormSchema.ts:225`

`client/src/schemas/productFormSchema.ts:586`

`client/src/schemas/productFormSchema.ts:641`

`client/src/schemas/productFormSchema.ts:670`

מה חסר:

אין `compareAtPrice` ב-`skuSchema`.

המשמעות:

הטופס לא יודע להחזיק, לוודא או לשלוח מחיר לפני הנחה לגרסה.

### 6.2 ProductPricing

קובץ:

`client/src/components/features/admin/Products/ProductForm/ProductPricing/ProductPricing.tsx`

מה קיים:

1. שדה "מחיר בסיס".
2. שדה "מחיר לפני הנחה (אופציונלי)".
3. בדיקה שהמחיר לפני הנחה גבוה ממחיר הבסיס.
4. Preview שמציג מחיר לפני ומחיר נוכחי.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductPricing/ProductPricing.tsx:14`

`client/src/components/features/admin/Products/ProductForm/ProductPricing/ProductPricing.tsx:139`

`client/src/components/features/admin/Products/ProductForm/ProductPricing/ProductPricing.tsx:205`

`client/src/components/features/admin/Products/ProductForm/ProductPricing/ProductPricing.tsx:214`

המשמעות:

ברמת מוצר, UI הניהול כמעט מוכן. הבעיה היא בחיבור השדה לשרת וביכולת לנקות אותו.

### 6.3 ProductForm

קובץ:

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx`

מה קיים:

1. בעריכת מוצר נטען `compareAtPrice` מהנתונים.
2. רכיב `ProductPricing` מקבל את `compareAtPrice`.
3. רכיב `ProductSKUs` מקבל `basePrice`, אבל לא `compareAtPrice`.
4. לפני שליחה, `sku.price == null` מוחלף ל-`data.basePrice`.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:212`

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:493`

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:1027`

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:1030`

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:1115`

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:1125`

נקודת סיכון:

המרת `sku.price == null` ל-`data.basePrice` לפני שליחה שוברת ירושה אמיתית.

נכון יותר להשאיר `null` או לא לשלוח את השדה, כל עוד השרת יודע לפרש חסר/`null` כירושה.

### 6.4 ProductSKUs

קובץ מרכזי:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ProductSKUs.tsx`

מה קיים:

ניהול גרסאות מורכב עם כמה מצבי UI:

1. טבלת SKUs.
2. מודאל הוספת SKU.
3. AutoFill modal/panel.
4. Color grouped view.
5. Custom variants view.
6. Variant wizard.
7. Utilities לקיבוץ ויצירת SKUs.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ProductSKUs.tsx:116`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ProductSKUs.tsx:262`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ProductSKUs.tsx:271`

מה חסר:

כל מערכת ה-SKU UI מכירה מחיר אמיתי בלבד. אין שדה `compareAtPrice` לגרסה.

### 6.5 AddSKUModal

קובץ:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AddSKUModal.tsx`

מה קיים:

שדה "מחיר ספציפי" אופציונלי.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AddSKUModal.tsx:642`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AddSKUModal.tsx:654`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AddSKUModal.tsx:658`

מה חסר:

אין שדה "מחיר לפני הנחה" לגרסה.

### 6.6 SKUsTable

קובץ:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx`

מה קיים:

1. מחיר ריק או 0 הופך ל-`null`.
2. תצוגת מחיר יורשת מ-`basePrice`.
3. מופיע Badge "בסיס" כשה-SKU יורש מחיר.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx:110`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx:112`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx:203`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx:316`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx:412`

מה חסר:

עמודה או עריכת inline עבור `compareAtPrice`.

### 6.7 ColorGroupedView SizeRow

קובץ:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ColorGroupedView/SizeRow.tsx`

מה קיים:

שדה מחיר אמיתי לכל מידה/צבע, עם placeholder של מחיר בסיס.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ColorGroupedView/SizeRow.tsx:57`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ColorGroupedView/SizeRow.tsx:70`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ColorGroupedView/SizeRow.tsx:99`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ColorGroupedView/SizeRow.tsx:109`

מה חסר:

שדה מחיר לפני הנחה לגרסה.

### 6.8 CustomVariantsView

קובץ:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/CustomVariantsView/CustomVariantsView.tsx`

מה קיים:

שדה מחיר אמיתי לכל וריאנט מותאם.

נקודות:

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/CustomVariantsView/CustomVariantsView.tsx:258`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/CustomVariantsView/CustomVariantsView.tsx:705`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/CustomVariantsView/CustomVariantsView.tsx:718`

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/CustomVariantsView/CustomVariantsView.tsx:725`

מה חסר:

שדה מחיר לפני הנחה לכל וריאנט.

### 6.9 productManagementService

קובץ:

`client/src/services/productManagementService.ts`

מה קיים:

1. `normalizeSKUs` מנרמל SKUs לפני שליחה.
2. `createProduct` שולח ל-`/with-skus`.
3. `updateProduct` שולח ל-`/:id/with-skus` כשיש SKUs.
4. `cleanPayload` מסיר `null` ו-`undefined`.

נקודות:

`client/src/services/productManagementService.ts:45`

`client/src/services/productManagementService.ts:87`

`client/src/services/productManagementService.ts:93`

`client/src/services/productManagementService.ts:322`

`client/src/services/productManagementService.ts:330`

`client/src/services/productManagementService.ts:351`

`client/src/services/productManagementService.ts:408`

`client/src/services/productManagementService.ts:417`

`client/src/services/productManagementService.ts:438`

נקודת סיכון חשובה:

`cleanPayload` מדלג על `null`.

המשמעות:

אם מנהל מוחק `compareAtPrice` קיים ושם אותו `null`, הערך לא יישלח לשרת. אם השרת לא מקבל `null` או `$unset`, הערך הישן עלול להישאר במסד.

זה רלוונטי גם ל-`product.compareAtPrice` וגם ל-`sku.compareAtPrice` העתידי.

---

## 7. המצב הקיים בצד לקוח

### 7.1 טיפוסים

קובץ:

`client/src/types/Product.ts`

מה קיים:

1. `PricingData.compareAtPrice` ברמת pricing.
2. `Product.compareAtPrice` ברמת מוצר.
3. `Sku.price` ברמת SKU.

נקודות:

`client/src/types/Product.ts:2`

`client/src/types/Product.ts:9`

`client/src/types/Product.ts:48`

`client/src/types/Product.ts:53`

`client/src/types/Product.ts:101`

מה חסר:

אין `Sku.compareAtPrice`.

### 7.2 ProductPrice

קובץ:

`client/src/components/features/products/ProductPrice/ProductPrice.tsx`

מה קיים:

1. אם `pricing.hasDiscount`, מוצגים `finalPrice` ו-`originalPrice`.
2. `originalPrice` מוצג כמחיר מחוק.
3. אם אין discount, מוצג רק מחיר נוכחי.

נקודות:

`client/src/components/features/products/ProductPrice/ProductPrice.tsx:33`

`client/src/components/features/products/ProductPrice/ProductPrice.tsx:52`

`client/src/components/features/products/ProductPrice/ProductPrice.tsx:66`

`client/src/components/features/products/ProductPrice/ProductPrice.tsx:76`

`client/src/components/features/products/ProductPrice/ProductPrice.tsx:103`

מה חסר:

הרכיב לא מבדיל בין סוגי הנחה:

1. מחיר לפני הנחה שיווקי.
2. הנחת קבוצת לקוח.

זה עובד לתצוגה בסיסית, אבל כאשר מוסיפים SKU compareAt, כדאי לוודא שה-`PricingData` שנשלח אליו כבר פתור ונכון.

### 7.3 ProductPrice CSS

קובץ:

`client/src/components/features/products/ProductPrice/ProductPrice.module.css`

מה קיים:

מחיר מקורי מחוק באדום עם קו חוצה.

נקודות:

`client/src/components/features/products/ProductPrice/ProductPrice.module.css:54`

`client/src/components/features/products/ProductPrice/ProductPrice.module.css:57`

`client/src/components/features/products/ProductPrice/ProductPrice.module.css:66`

`client/src/components/features/products/ProductPrice/ProductPrice.module.css:71`

המשמעות:

דרישת התצוגה "באדום עם קו מחוק או באפור עם קו מחוק" כבר ממומשת עבור המקום שמשתמש ב-`ProductPrice`.

### 7.4 ProductCard

קובץ:

`client/src/components/features/products/ProductCard/ProductCard.tsx`

מה קיים:

כאשר נבחר SKU, הקוד מחשב:

```ts
skuBasePrice = selectedSkuData.price ?? updatedProduct.basePrice
```

נקודות:

`client/src/components/features/products/ProductCard/ProductCard.tsx:132`

`client/src/components/features/products/ProductCard/ProductCard.tsx:139`

`client/src/components/features/products/ProductCard/ProductCard.tsx:144`

`client/src/components/features/products/ProductCard/ProductCard.tsx:147`

`client/src/components/features/products/ProductCard/ProductCard.tsx:421`

מה עובד חלקית:

אם ל-SKU יש מחיר ספציפי, הקוד לא משתמש ב-`product.compareAtPrice` כמחיר לפני הנחה. זה מתאים לדרישה במקרה "לגרסה יש מחיר ואין מחיר לפני הנחה".

מה חסר:

אין אפשרות להשתמש ב-`sku.compareAtPrice`, כי השדה לא קיים.

נקודת בדיקה חשובה:

אם הנחת קבוצת לקוח קיימת אבל מוסתרת (`showOriginalPrice === false`), צריך לבדוק איך זה משפיע על SKU עם מחיר ספציפי. היום החישוב בצד לקוח מסתמך על `pricing.hasDiscount`, ולכן יכול להיות פער תצוגה במקרים מסוימים.

### 7.5 ProductDetail

קובץ:

`client/src/components/features/products/ProductDetail/ProductDetail.tsx`

מה קיים:

לוגיקה דומה ל-ProductCard:

```ts
skuBasePrice = selectedSkuData.price ?? product.basePrice
```

נקודות:

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:105`

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:114`

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:119`

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:122`

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:317`

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:497`

מה עובד חלקית:

המחיר האמיתי של SKU נבחר מחושב לפי היררכיית `sku.price ?? product.basePrice`.

מה חסר:

אין תמיכה ב-`sku.compareAtPrice`.

---

## 8. מה כבר עובד מול הדרישה

### 8.1 מחיר אמיתי ברמת מוצר

עובד.

`Product.basePrice` קיים בשרת, בטופס, ובתצוגה.

### 8.2 מחיר אמיתי ברמת SKU

עובד חלקית עד טוב.

המודל, הוולידציה, הסל, ההזמנה ודפי המוצר מכירים `Sku.price`.

אבל יש בעיית שמירה בטופס:

`ProductForm.tsx` מחליף `null` ל-`basePrice` לפני שליחה.

זה לא תמיד שובר את המחיר המיידי, אבל כן שובר ירושה אמיתית.

### 8.3 הנחת קבוצת לקוח על מחיר אמיתי

עובד בליבת השרת.

הסל וההזמנה מחשבים הנחה מתוך המחיר האמיתי האפקטיבי.

### 8.4 מחיר לפני הנחה ברמת מוצר

קיים חלקית.

יש מודל, יש UI בטופס, ויש תצוגה בצד לקוח.

אבל צריך לתקן את הולידציה וה-save flow כדי לוודא שהשדה באמת נשמר דרך `/with-skus`.

### 8.5 תצוגת מחיר מחוק

עובדת ברכיב `ProductPrice`.

---

## 9. מה עדיין חסר מול הדרישה

### 9.1 חסר שדה SKU.compareAtPrice

חסר בכל השכבות:

1. מודל Mongoose.
2. ממשק TypeScript בשרת.
3. Joi validation.
4. טיפוסי לקוח.
5. Yup schema של הטופס.
6. ערכי ברירת מחדל של SKU.
7. UI ניהול גרסאות.
8. normalization ושליחת payload.
9. תצוגת לקוח לפי SKU נבחר.
10. בדיקות.

### 9.2 חסרה פונקציית הכרעה אחת להיררכיית מחיר

כרגע הלוגיקה מפוזרת:

1. `pricingService` מחשב מוצר.
2. `ProductCard` מחשב SKU בצד לקוח.
3. `ProductDetail` מחשב SKU בצד לקוח.
4. `cartService` מחשב סל.
5. `orderService` מחשב הזמנה.

הסיכון:

כל אחד מהמקומות יכול להתנהג קצת אחרת.

הפתרון המקצועי:

להגדיר פונקציה טהורה וברורה שמחשבת:

1. מחיר אמיתי אפקטיבי.
2. מחיר לפני הנחה אפקטיבי לתצוגה.
3. האם להציג מחיר לפני הנחה.
4. מחיר סופי אחרי הנחת קבוצת לקוח.

גם אם לא משתפים קוד פיזית בין client/server, צריך לשמור על אותה לוגיקה ואותן בדיקות.

### 9.3 חסר טיפול במחיקת compareAtPrice

בגלל:

`client/src/services/productManagementService.ts:93`

`cleanPayload` מסיר `null`.

צריך להחליט איך מוחקים ערך קיים:

1. לשלוח `compareAtPrice: null` ולא להסיר אותו עבור שדות מחיר.
2. או לשלוח שדה ייעודי כמו `clearCompareAtPrice`.
3. או בצד שרת לזהות היעדר שדה רק במצבים מסוימים, אבל זה פחות בטוח כי היעדר שדה יכול להיות "לא לעדכן".

הפתרון המועדף:

לא להסיר `null` עבור שדות שמטרתם לאפשר ניקוי מפורש:

1. `product.compareAtPrice`
2. `sku.compareAtPrice`
3. אולי `sku.price`, אם רוצים לשמור ירושה מפורשת.

### 9.4 חסרה תמיכה בכל מסכי הגרסאות

צריך להוסיף את השדה לא רק במקום אחד.

רשימת המקומות לבדיקה/עדכון:

1. `ProductSKUs.tsx`
2. `AddSKUModal.tsx`
3. `SKUsTable/SKUsTable.tsx`
4. `AutoFillModal/AutoFillModal.tsx`
5. `AutoFillPanel/AutoFillPanel.tsx`
6. `ColorGroupedView/SizeRow.tsx`
7. `ColorGroupedView/AddColorModal.tsx`
8. `ColorGroupedView/ColorPanel.tsx`
9. `CustomVariantsView/CustomVariantsView.tsx`
10. `CustomVariantsView/AddVariantModal.tsx`
11. `utils/skuGrouping.ts`
12. `VariantWizard/VariantWizard.tsx`

### 9.5 חסרה בדיקה של buy now / checkout direct

ב-ProductDetail יש `buyNow` שמחשב מחיר:

`client/src/components/features/products/ProductDetail/ProductDetail.tsx:317`

צריך לוודא שהוא לא משתמש במחיר תצוגתי ושלא מדלג על חישוב שרת.

---

## 10. מטריצת התנהגות נדרשת

### 10.1 ללא קבוצת לקוח

| Product.basePrice | Product.compareAtPrice | SKU.price | SKU.compareAtPrice | מחיר אמיתי | מחיר מחוק |
|---:|---:|---:|---:|---:|---:|
| 100 | 130 | null | null | 100 | 130 |
| 100 | 130 | 90 | null | 90 | לא מוצג |
| 100 | 130 | 90 | 120 | 90 | 120 |
| 100 | 130 | null | 120 | 100 | לא מוצג |
| 100 | null | null | null | 100 | לא מוצג |
| 100 | null | 90 | 120 | 90 | 120 |

### 10.2 עם קבוצת לקוח 10%

| Product.basePrice | Product.compareAtPrice | SKU.price | SKU.compareAtPrice | מחיר אמיתי לפני קבוצה | מחיר סופי | מחיר מחוק שיווקי |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 130 | null | null | 100 | 90 | 130 |
| 100 | 130 | 80 | null | 80 | 72 | לא מוצג |
| 100 | 130 | 80 | 110 | 80 | 72 | 110 |
| 100 | 130 | null | 110 | 100 | 90 | לא מוצג |

הערה:

אם יש גם מחיר לפני הנחה וגם הנחת קבוצת לקוח, צריך להחליט מה בדיוק מוצג כ-`originalPrice`. בפועל אפשר להציג מחיר מחוק אחד בלבד ברכיב הקיים. ההמלצה היא שהמחיר המחוק יהיה המחיר הגבוה והרלוונטי לתצוגה, אבל החישוב הכספי חייב להמשיך להתבסס רק על המחיר האמיתי.

---

## 11. שאלות שצריך לבדוק בקוד לפני יישום

### 11.1 האם מוצרים חדשים באמת שומרים Product.compareAtPrice?

צריך לבדוק בפועל:

1. ליצור מוצר עם `compareAtPrice` דרך Admin.
2. לבדוק Network payload.
3. לבדוק request אחרי `cleanPayload`.
4. לבדוק body בשרת אחרי `validateCreateProductWithSkus`.
5. לבדוק מסמך MongoDB שנשמר.
6. לבדוק GET product שמחזיר את השדה.

סיבה:

המודל תומך, אבל הוולידציה עלולה להסיר.

### 11.2 האם עדכון מוצר מנקה compareAtPrice?

צריך לבדוק:

1. מוצר עם `compareAtPrice = 130`.
2. לערוך ולמחוק את השדה.
3. לשמור.
4. לבדוק אם במסד הערך הפך ל-`null` או נשאר 130.

סיבה:

`cleanPayload` מסיר `null`.

### 11.3 האם SKU.price נשמר כ-null או כמחיר מפורש?

צריך לבדוק:

1. ליצור SKU בלי מחיר.
2. לבדוק payload.
3. לבדוק מסד נתונים.
4. לעדכן `Product.basePrice`.
5. לבדוק אם ה-SKU יורש מחיר חדש או נשאר עם המחיר הישן.

סיבה:

`ProductForm.tsx:493` ממיר `null` ל-`basePrice`.

### 11.4 האם קיימים מוצרים ישנים עם legacy variants?

צריך לבדוק:

1. שימוש בשדה `variants` הישן.
2. מוצרים שאין להם SKUs collection.
3. מוצרים עם `hasVariants=true` אבל בלי SKUs.
4. מוצרים עם SKU בסיס אוטומטי.

סיבה:

לא לשבור מוצרים קיימים במהלך שינויי schema ו-UI.

### 11.5 האם `salePrice`, `isOnSale`, `discountPercentage` עדיין בשימוש?

צריך לבדוק:

1. האם יש זרימות שמציגות `salePrice`.
2. האם autocomplete משתמש בזה.
3. האם יש מוצרים במסד עם הערכים האלה.
4. האם צריך להתעלם מהם או להמשיך לשמר תאימות.

סיבה:

לא לערבב בין מנגנון ישן של sale לבין `compareAtPrice`.

### 11.6 האם הנחת קבוצת לקוח מוסתרת צריכה להשפיע על SKU display?

בקוד קיימת תמיכה ב-`showOriginalPrice`.

מיקום:

`server/src/models/CustomerGroup.ts:15`

`server/src/services/pricingService.ts:99`

`server/src/services/cartService.ts:76`

`server/src/services/orderService.ts:164`

צריך לבדוק:

אם לקבוצת לקוח יש הנחה שקטה, האם בחירת SKU עם מחיר ספציפי מציגה מחיר סופי נכון בדף מוצר לפני הוספה לסל.

סיבה:

השרת יודע לחשב, אבל הלקוח לא תמיד יודע את אחוז ההנחה אם היא מוסתרת.

### 11.7 האם ProductCard ו-ProductDetail צריכים אותו helper?

צריך לבדוק:

1. האם יש עוד מקומות שמציגים מחיר.
2. האם ProductCard ו-ProductDetail צריכים לוגיקה זהה.
3. האם אפשר להעביר את החישוב ל-utility משותף ב-client.

סיבה:

כפל לוגיקה יגרום לבאגים.

### 11.8 האם API צריך להחזיר pricing לכל SKU?

אפשרות קיימת:

השרת מחזיר `product.pricing` ו-`product.skus`, והלקוח מחשב SKU pricing.

אפשרות מקצועית יותר:

השרת יחזיר לכל SKU גם pricing פתור:

```ts
sku.pricing = {
  effectivePrice,
  finalPrice,
  compareAtPrice,
  showCompareAtPrice
}
```

צריך לבדוק מה מתאים יותר לפרויקט:

1. ביצועים.
2. תאימות API.
3. כמות מוצרים ברשימות.
4. מורכבות קבוצות לקוח.
5. הצורך להסתיר הנחות שקטות.

הערכה:

לשלמות והתנהגות עקבית, חישוב שרת לכל SKU הוא הכי בטוח. למינימום שינוי, אפשר להשאיר חישוב בצד לקוח, אבל אז חייבים לבדוק היטב הנחות קבוצות מוסתרות.

---

## 12. תוכנית ביצוע מקצועית

### שלב 1: לייצב את חוזה הנתונים

מטרה:

להגדיר בדיוק אילו שדות קיימים ומה משמעותם.

שינויים צפויים:

1. להוסיף `compareAtPrice?: number | null` ל-`ISku`.
2. להוסיף `compareAtPrice` ל-`SkuSchema`.
3. להוסיף `compareAtPrice` ל-`skuSchema` ב-Joi.
4. להוסיף `compareAtPrice` ל-`Sku` בצד לקוח.
5. להוסיף `compareAtPrice` ל-`skuSchema` ב-Yup.
6. להוסיף `compareAtPrice: null` ל-`defaultSKUValues`.

כללים:

1. `compareAtPrice` חייב להיות מספר חיובי או `null`.
2. אם יש `sku.price`, אז `sku.compareAtPrice` צריך להיות גדול מ-`sku.price` כדי להציג.
3. אם אין `sku.price`, `sku.compareAtPrice` לא אמור להיות מוצג, ועדיף גם לא לאפשר שמירה שלו או לנקות אותו.

### שלב 2: לתקן product.compareAtPrice בזרימת /with-skus

מטרה:

לוודא שהשדה שכבר קיים ברמת מוצר באמת נשמר.

שינויים צפויים:

1. להוסיף `compareAtPrice` ל-`productSchema` ב-`server/src/middleware/productValidation.ts`.
2. לוודא ש-create/update מאפשרים `null` לצורך ניקוי.
3. לבדוק ש-`stripUnknown` כבר לא מסיר אותו.
4. לטפל ב-client `cleanPayload` כך שלא יעלים ניקוי מפורש של `compareAtPrice`.

החלטה נדרשת:

איך מייצגים ניקוי שדה?

המלצה:

לאפשר `compareAtPrice: null` ב-payload ולתת לשרת לשמור `null`.

### שלב 3: לשמר ירושה אמיתית של SKU.price

מטרה:

אם המנהל משאיר מחיר SKU ריק, ה-SKU באמת יורש ממוצר.

שינוי מרכזי:

לא להמיר `sku.price == null` ל-`data.basePrice` לפני שליחה.

מיקום:

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx:493`

הכלל:

אם המנהל השאיר מחיר ריק, צריך לשלוח `price: null` או לא לשלוח `price`, אבל לא להחליף למחיר הבסיס.

צריך לבדוק מול `cleanPayload`:

אם לא שולחים `price`, השרת נותן default `null`, וזה מתאים ליצירה. בעדכון שבו מוחקים ומייצרים SKUs מחדש, זה גם כנראה מתאים. אבל צריך לוודא שלא קיימים endpoints ששומרים SKU בודד בלי recreate.

### שלב 4: להוסיף UI ל"מחיר לפני הנחה" בגרסאות

מטרה:

המנהל יוכל להגדיר לכל SKU מחיר לפני הנחה, אבל רק בהקשר נכון.

מקומות:

1. `AddSKUModal.tsx`
2. `SKUsTable.tsx`
3. `AutoFillModal.tsx`
4. `AutoFillPanel.tsx`
5. `SizeRow.tsx`
6. `CustomVariantsView.tsx`
7. `AddVariantModal.tsx`
8. `skuGrouping.ts`

התנהגות UI מומלצת:

1. אם מחיר SKU ריק, שדה `compareAtPrice` של ה-SKU יהיה disabled או hidden.
2. אם מחיר SKU מלא, אפשר להגדיר `compareAtPrice`.
3. אם המשתמש מוחק את מחיר SKU, לנקות אוטומטית גם `sku.compareAtPrice`.
4. להציג hint ברור: "מחיר לפני הנחה לגרסה פעיל רק כאשר לגרסה יש מחיר ספציפי".
5. בטבלה להציג Badge או tooltip כדי לא לבלבל בין ירושת מוצר לבין מחיר גרסה.

היגיון UX:

המשתמש לא צריך להכיר את כל חוקי הירושה. ה-UI צריך למנוע מצב לא תקף מראש.

### שלב 5: להוסיף helper לחישוב מחיר תצוגה

מטרה:

למנוע שכפול לוגיקה ב-ProductCard ו-ProductDetail.

חתימה אפשרית בצד לקוח:

```ts
type ResolvedVariantPricing = {
  effectiveBasePrice: number;
  finalPrice: number;
  compareAtPrice?: number;
  originalPrice: number;
  hasDiscount: boolean;
  discountPercentage: number;
  customerGroupName?: string;
};
```

כללי helper:

1. לקבוע מחיר אמיתי: `sku.price ?? product.basePrice`.
2. לקבוע compareAt לתצוגה לפי מטריצת SKU.
3. להחיל הנחת קבוצת לקוח רק על המחיר האמיתי.
4. להחזיר אובייקט שמתאים ל-`ProductPrice`.

מיקום אפשרי:

`client/src/utils/pricingHierarchy.ts`

או אם קיימת מוסכמה אחרת בפרויקט, להתאים אליה.

### שלב 6: להחליט אם חישוב SKU pricing נשאר ב-client או עובר ל-server

אפשרות A: מינימום שינוי

השרת ממשיך להחזיר מוצר ו-SKUs. הלקוח מחשב selected SKU pricing.

יתרונות:

1. פחות שינוי API.
2. מתאים למבנה הקיים.
3. קל יותר לשלב מהר.

חסרונות:

1. קשה יותר לטפל בהנחות שקטות.
2. יותר סיכון לפער בין תצוגה לסל.
3. צריך לשכפל/לתרגם לוגיקת pricing בין שרת ללקוח.

אפשרות B: חישוב שרת לכל SKU

השרת מחזיר pricing פתור לכל SKU.

יתרונות:

1. הכי עקבי.
2. מתאים יותר לקבוצות לקוח.
3. מפחית פער בין תצוגה לסל.
4. מאפשר להסתיר הנחות שקטות ועדיין להחזיר finalPrice נכון.

חסרונות:

1. שינוי API רחב יותר.
2. יותר חישובים ברשימות מוצרים.
3. צריך לשים לב לביצועים ול-N+1.

המלצה:

אם המטרה היא "אינטגרציה מושלמת", עדיף לשקול חישוב שרת או לפחות helper server-side שמסוגל לחשב SKU pricing, גם אם בשלב ראשון משתמשים בו רק בדף מוצר ולא בכל רשימה.

### שלב 7: לא לגעת בלוגיקת cart/order עבור compareAtPrice

מטרה:

לא להכניס מחיר תצוגתי לחישובים כספיים.

הסל וההזמנות כבר עושים את הדבר הנכון:

1. מחיר SKU אם קיים.
2. אחרת מחיר מוצר.
3. הנחת קבוצה על המחיר האמיתי.

אסור:

1. להשתמש ב-`compareAtPrice` ב-subtotal.
2. להשתמש ב-`compareAtPrice` ב-order item price.
3. להשתמש ב-`compareAtPrice` לחישוב discount amount.

מותר:

לשמור snapshot תצוגתי אם בעתיד רוצים להציג "מחיר לפני הנחה" גם בסל, אבל רק בשם ברור כמו `displayCompareAtPrice`, לא `price`.

### שלב 8: להוסיף בדיקות

בדיקות שרת:

1. `Sku` model מקבל `compareAtPrice`.
2. ולידציית create product with skus לא מסירה `product.compareAtPrice`.
3. ולידציית create/update מקבלת `sku.compareAtPrice`.
4. `cartService` לא משתמש ב-`compareAtPrice`.
5. `orderService` לא משתמש ב-`compareAtPrice`.
6. group discount מחושב על `sku.price ?? product.basePrice`.

בדיקות לקוח:

1. ProductPricing שומר ומנקה `compareAtPrice`.
2. ProductSKUs מאפשר compareAt רק עם מחיר SKU.
3. ProductCard מציג מטריצת מחירים נכונה.
4. ProductDetail מציג מטריצת מחירים נכונה.
5. ניקוי compareAt שולח payload שמנקה את הערך בשרת.

בדיקות E2E ידניות:

1. מוצר ללא גרסאות עם מחיר לפני הנחה.
2. SKU עם מחיר ועם מחיר לפני הנחה.
3. SKU עם מחיר בלי מחיר לפני הנחה.
4. SKU בלי מחיר ובלי מחיר לפני הנחה.
5. SKU בלי מחיר ועם מחיר לפני הנחה שהוזן בטעות או דרך API.
6. לקוח בקבוצת הנחה.
7. לקוח בקבוצת הנחה שקטה, אם זה נתמך בממשק.

---

## 13. בדיקות פקודות מומלצות

מהשורש אין `package.json`, ולכן צריך להריץ מתוך `client` ו-`server`.

### שרת

```powershell
cd server
npm run build
npm test
```

אם יש בדיקות ממוקדות pricing בעתיד:

```powershell
cd server
npm test -- --runInBand pricing
```

### לקוח

```powershell
cd client
npm run build
npm run lint
npm run test:run
```

אם בדיקות הלקוח כבדות או לא יציבות, לפחות:

```powershell
cd client
npm run build
```

### בדיקה ידנית בדפדפן

1. להיכנס לניהול מוצרים.
2. ליצור מוצר פשוט עם `basePrice` ו-`compareAtPrice`.
3. לבדוק שהוא נשמר ומוצג.
4. לערוך ולמחוק `compareAtPrice`.
5. ליצור מוצר עם גרסאות.
6. לכל גרסה לבדוק מחיר אמיתי ו"מחיר לפני הנחה".
7. לפתוח דף מוצר כלקוח רגיל.
8. לבחור כל גרסה ולבדוק תצוגה.
9. להתחבר כלקוח בקבוצת הנחה.
10. לחזור על בחירת גרסאות.
11. להוסיף לסל ולוודא שהמחיר בסל הוא המחיר האמיתי אחרי הנחת קבוצה.
12. לבצע checkout בדיקה ולוודא שההזמנה לא משתמשת ב-`compareAtPrice`.

---

## 14. רשימת קבצים צפויה לשינוי ביישום

### שרת

`server/src/models/Sku.ts`

להוסיף `compareAtPrice`.

`server/src/middleware/productValidation.ts`

להוסיף ולידציה ל-`product.compareAtPrice` ול-`sku.compareAtPrice`.

`server/src/services/productService.ts`

לוודא שמירה ועדכון לא מפילים את השדה. לשקול לא לשמור `price: productData.basePrice` ב-SKU בסיס אוטומטי אם רוצים ירושה אמיתית.

`server/src/services/pricingService.ts`

אם מחליטים על חישוב שרת ל-SKU, להרחיב או להוסיף helper חדש.

`server/src/controllers/productController.ts`

אם מחזירים pricing לכל SKU, לעדכן שילוב `skus` בתשובות.

### לקוח

`client/src/types/Product.ts`

להוסיף `compareAtPrice` ל-`Sku`.

`client/src/schemas/productFormSchema.ts`

להוסיף `compareAtPrice` ל-`skuSchema` ול-defaults.

`client/src/services/productManagementService.ts`

לעדכן `cleanPayload` כך שניתן לשלוח `null` לשדות שצריך לנקות. לעדכן `normalizeSKUs`.

`client/src/components/features/admin/Products/ProductForm/ProductForm.tsx`

לא לשבור ירושת `sku.price`. להוסיף טעינת `sku.compareAtPrice` בעריכת מוצר.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AddSKUModal.tsx`

להוסיף שדה compareAt לגרסה.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKUsTable/SKUsTable.tsx`

להוסיף עמודה או עריכת inline ל-compareAt.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AutoFillModal/AutoFillModal.tsx`

להוסיף תמיכה ב-compareAt בייצור אוטומטי, אם נדרש.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/AutoFillPanel/AutoFillPanel.tsx`

להוסיף תמיכה ב-compareAt ב-bulk edit.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/ColorGroupedView/SizeRow.tsx`

להוסיף שדה compareAt למידה/צבע.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/CustomVariantsView/CustomVariantsView.tsx`

להוסיף compareAt לווריאנטים מותאמים.

`client/src/components/features/admin/Products/ProductForm/ProductSKUs/utils/skuGrouping.ts`

לוודא שהשדה נשמר בקיבוץ/פירוק של SKUs.

`client/src/components/features/products/ProductCard/ProductCard.tsx`

להחליף לוגיקה מקומית ב-helper.

`client/src/components/features/products/ProductDetail/ProductDetail.tsx`

להחליף לוגיקה מקומית ב-helper.

אפשרי:

`client/src/utils/pricingHierarchy.ts`

להוסיף helper חדש לחישוב מחיר תצוגה.

---

## 15. כללי מימוש חשובים כדי לא לשבור את הקיים

### כלל 1: compareAtPrice לא נכנס לכסף אמיתי

אסור להכניס אותו ל:

1. `CartItem.price`
2. `CartItem.subtotal`
3. `OrderItem.price`
4. `OrderItem.subtotal`
5. payment amount
6. stock logic
7. discount amount

### כלל 2: SKU price null הוא מידע חשוב

`null` אינו "חסר משמעות".

במקרה של `sku.price`, `null` אומר "תירש מהמוצר".

לכן אסור להחליף אותו אוטומטית ל-`basePrice`.

### כלל 3: SKU compareAtPrice תלוי ב-SKU price

אם אין `sku.price`, אין להציג `sku.compareAtPrice`.

עדיף שגם ה-UI ימנע הזנה כזו.

אם בכל זאת התקבל מה-API מצב כזה, ה-helper צריך להתעלם מהשדה.

### כלל 4: לא לשבור מוצרים קיימים

צריך לתמוך ב:

1. מוצרים בלי `compareAtPrice`.
2. SKUs בלי `compareAtPrice`.
3. SKUs בלי `price`.
4. מוצרים ישנים עם `variants`.
5. מוצרים פשוטים עם SKU בסיס אוטומטי.

### כלל 5: לא לסמוך על הלקוח למחיר סופי

הלקוח יכול להציג מחיר, אבל הסל וההזמנה חייבים להמשיך לחשב מחדש בשרת.

### כלל 6: להימנע מפתרון פלסטר

לא מספיק להוסיף input אחד ב-UI.

צריך לחבר:

1. טיפוסים.
2. סכמות.
3. ולידציה.
4. payload.
5. שמירה.
6. שליפה.
7. תצוגה.
8. חישוב.
9. בדיקות.

---

## 16. פסאודו-קוד של הלוגיקה הנכונה

```ts
function resolveVariantPricing(product, sku, customerGroupDiscount) {
  const hasSku = Boolean(sku);
  const hasSkuPrice = hasSku && sku.price !== null && sku.price !== undefined;

  const effectiveBasePrice = hasSkuPrice
    ? sku.price
    : product.basePrice;

  let displayCompareAtPrice = null;

  if (hasSku) {
    if (hasSkuPrice && sku.compareAtPrice && sku.compareAtPrice > sku.price) {
      displayCompareAtPrice = sku.compareAtPrice;
    } else if (!hasSkuPrice && !sku.compareAtPrice) {
      if (product.compareAtPrice && product.compareAtPrice > product.basePrice) {
        displayCompareAtPrice = product.compareAtPrice;
      }
    } else {
      displayCompareAtPrice = null;
    }
  } else {
    if (product.compareAtPrice && product.compareAtPrice > product.basePrice) {
      displayCompareAtPrice = product.compareAtPrice;
    }
  }

  const finalPrice = customerGroupDiscount
    ? effectiveBasePrice * (1 - customerGroupDiscount / 100)
    : effectiveBasePrice;

  return {
    effectiveBasePrice,
    finalPrice,
    compareAtPrice: displayCompareAtPrice,
    hasCompareAtPrice: Boolean(displayCompareAtPrice),
  };
}
```

הערה:

זה פסאודו-קוד להסבר. ביישום אמיתי צריך להתאים לטייפים, לשמות הקיימים, ל-rounding, ולמנגנון הנחת קבוצות הקיים.

---

## 17. בדיקות קבלה עסקיות

### מוצר פשוט

1. מנהל יוצר מוצר עם מחיר 100 ומחיר לפני הנחה 130.
2. לקוח רואה 100 ו-130 מחוק.
3. לקוח בקבוצת 10% רואה מחיר סופי 90.
4. הסל מכיל מחיר 90.
5. ההזמנה מכילה מחיר 90.
6. `compareAtPrice` לא משפיע על subtotal.

### SKU עם מחיר ועם מחיר לפני הנחה

1. מוצר: `basePrice = 100`, `compareAtPrice = 130`.
2. SKU: `price = 80`, `compareAtPrice = 110`.
3. בחירת SKU מציגה מחיר 80.
4. מוצג 110 מחוק.
5. לא מוצג 130 מחוק.
6. לקוח 10% משלם 72.

### SKU עם מחיר בלי מחיר לפני הנחה

1. מוצר: `basePrice = 100`, `compareAtPrice = 130`.
2. SKU: `price = 80`, `compareAtPrice = null`.
3. בחירת SKU מציגה מחיר 80.
4. לא מוצג מחיר מחוק.
5. לא יורשים את 130 מהמוצר.

### SKU בלי מחיר ובלי מחיר לפני הנחה

1. מוצר: `basePrice = 100`, `compareAtPrice = 130`.
2. SKU: `price = null`, `compareAtPrice = null`.
3. בחירת SKU מציגה מחיר 100.
4. מוצג 130 מחוק.

### SKU בלי מחיר אבל עם מחיר לפני הנחה

1. מוצר: `basePrice = 100`, `compareAtPrice = 130`.
2. SKU: `price = null`, `compareAtPrice = 120`.
3. בחירת SKU מציגה מחיר 100.
4. לא מוצג 120.
5. לפי הדרישה, `sku.compareAtPrice` לא מופיע.

---

## 18. סיכונים ודרכי מניעה

### סיכון: compareAtPrice יתחיל להשפיע על מחיר לתשלום

מניעה:

לא לגעת ב-cart/order pricing עבור compareAt, מלבד אולי snapshot תצוגתי בשם נפרד וברור.

### סיכון: שבירת ירושת מחיר SKU

מניעה:

לא להמיר `null` ל-`basePrice` בצד לקוח.

### סיכון: ניקוי שדה לא עובד

מניעה:

לתקן `cleanPayload` או ליצור allowlist של שדות שבהם `null` נשמר.

### סיכון: UI מאפשר מצב לא חוקי

מניעה:

להשבית או לנקות `sku.compareAtPrice` כאשר `sku.price` ריק.

### סיכון: ProductCard ו-ProductDetail מציגים שונה

מניעה:

להשתמש ב-helper משותף.

### סיכון: API ישן או מוצרים ישנים נשברים

מניעה:

כל השדות החדשים יהיו אופציונליים ועם default `null`.

### סיכון: הנחות קבוצת לקוח מוסתרות לא מוצגות נכון ב-SKU

מניעה:

לבדוק את `showOriginalPrice`. אם צריך דיוק מלא, להעביר חישוב SKU pricing לשרת.

---

## 19. סדר עבודה מומלץ בפועל

1. להוסיף בדיקות/תרחישי בדיקה סביב הלוגיקה הקיימת של מחיר אמיתי.
2. לתקן שמירת `Product.compareAtPrice` דרך `/with-skus`.
3. לתקן ניקוי `Product.compareAtPrice`.
4. לתקן ירושת `Sku.price`.
5. להוסיף `Sku.compareAtPrice` בשרת וב-client types.
6. להוסיף ולידציה בשרת ובטופס.
7. להוסיף UI לגרסאות בצורה מדורגת, קודם במקום המרכזי ביותר.
8. להוסיף helper חישוב בצד לקוח או שרת.
9. לעדכן ProductCard ו-ProductDetail.
10. לבדוק סל והזמנות כדי לוודא שלא השתנו חישובים כספיים.
11. להריץ build/tests.
12. לבצע בדיקה ידנית מלאה.

---

## 20. Definition of Done

העבודה תיחשב שלמה רק כאשר כל התנאים הבאים מתקיימים:

1. ניתן לשמור `compareAtPrice` ברמת מוצר דרך טופס הניהול.
2. ניתן למחוק `compareAtPrice` ברמת מוצר.
3. ניתן לשמור `compareAtPrice` ברמת SKU.
4. ניתן למחוק `compareAtPrice` ברמת SKU.
5. SKU בלי `price` באמת יורש `Product.basePrice`.
6. SKU עם `price` משתמש במחיר שלו.
7. SKU עם `price` ו-`compareAtPrice` מציג את שניהם.
8. SKU עם `price` בלי `compareAtPrice` לא מציג מחיר לפני הנחה.
9. SKU בלי `price` ובלי `compareAtPrice` יורש גם מחיר וגם מחיר לפני הנחה מהמוצר.
10. SKU בלי `price` אבל עם `compareAtPrice` לא מציג את `sku.compareAtPrice`.
11. הנחת קבוצת לקוח מחושבת תמיד מהמחיר האמיתי.
12. `compareAtPrice` לא משפיע על סל.
13. `compareAtPrice` לא משפיע על הזמנה.
14. ProductCard ו-ProductDetail מציגים אותו דבר.
15. מוצר פשוט ממשיך לעבוד.
16. מוצרים קיימים בלי השדה החדש ממשיכים לעבוד.
17. build שרת עובר.
18. build לקוח עובר.
19. בדיקות רלוונטיות עוברות.
20. בדיקה ידנית מלאה עוברת.

---

## 21. מסקנה

הפרויקט כבר בנוי בכיוון נכון: יש הפרדה בין מחיר מוצר למחיר SKU, ויש התחלה טובה של `compareAtPrice` ברמת מוצר. הליבה הכספית של סל והזמנות כבר מתייחסת למחיר האמיתי בצורה נכונה.

הפער המרכזי הוא לא "עוד input קטן", אלא השלמת חוזה נתונים מלא עבור `compareAtPrice` ברמת SKU וחיבור עקבי לכל המקומות שמייצרים, שומרים, שולפים ומציגים גרסאות.

היישום הנכון צריך להיות מדורג וזהיר:

1. קודם לתקן שמירה וניקוי של product-level compareAt.
2. אחר כך להוסיף SKU-level compareAt בכל שכבות הנתונים.
3. אחר כך להוסיף UI לכל מסכי הגרסאות.
4. בסוף לאחד את חישוב התצוגה ולוודא שסל/הזמנות נשארים נקיים ממחיר תצוגתי.

כך אפשר להגיע לאינטגרציה מלאה עם הקוד הקיים בלי לשבור התנהגויות קיימות ובלי לערבב בין מחיר אמיתי לבין מחיר שיווקי להצגה.
