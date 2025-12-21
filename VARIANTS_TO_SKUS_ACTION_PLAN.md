# תוכנית פעולה: מעבר ממודל Variants מוטמע למודל SKUs נפרד

## מבוא
תוכנית זו מתארת את השלבים הנדרשים להמרת מערכת ניהול הווריאנטים מ-embedded variants בתוך מסמך המוצר למודל SKUs נפרד וסמכותי. המעבר נועד לשפר ביצועים, אמינות, ויכולות ניהול מלאי בחנות איקומרס ברמה מקצועית.

---

## שלב 1: תיקונים קריטיים מיידיים (Pre-Migration Fixes)

### 1.1 אכיפת בדיקות מלאי נכונות ועדכונים אטומיים
**מטרה:** מניעת oversell באמצעות בדיקות בסל ועדכונים אטומיים ב-checkout

**צעדים:**
1. זיהוי כל נקודות העדכון של מלאי בקוד:
   - `CartService.addItem` - הוספה לסל
   - `CartService.updateItemQuantity` - עדכון כמות בסל
   - **הערה**: checkout/orders יתווספו בשלב מאוחר יותר

2. הפרדה בין הוספה לסל לבין checkout (בעתיד):

   **א. בהוספה/עדכון בסל (addItem, updateItemQuantity) - רק בדיקה:**
   ```
   - קרא מוצר
   - בדוק אם stockQuantity >= requestedQty
   - אם כן → הוסף/עדכן בסל (ללא הורדת מלאי!)
   - אם לא → החזר שגיאה "אין מספיק במלאי"
   
   הערה: מספר לקוחות יכולים להוסיף את אותו מוצר לסל
   ```
   
   **ב. ב-checkout (בעתיד, עם מערכת הזמנות) - עדכון אטומי:**
   ```
   - updateOne עם תנאי { stockQuantity: { $gte: qty } }
   - הורדת מלאי רק כאן!
   - בדיקת modifiedCount להבטחת הצלחה
   - אם נכשל → "המוצר אזל במהלך התשלום"
   ```

3. יישום בקבצים:
   - `server/src/services/cartService.ts` - פונקציות `addItem`, `updateItemQuantity`
   - הוספת error handling מתאים למקרה של אזל מלאי
   - **הערה**: checkout flow יתווסף כאשר תיצור את מערכת ההזמנות

4. בדיקה:
   - כתיבת unit test שמסמלל concurrent purchases
   - ווידוא שהמערכת מחזירה שגיאה כשאין מספיק מלאי

**קבצים מושפעים:**
- `server/src/services/cartService.ts`
- `server/src/controllers/cartController.ts`

---

### 1.2 שיפור מבנה אחסון פריטים בסל
**מטרה:** שמירת מזהה ברור ו-snapshot של מידע המוצר

**⚠️ הערה - לאתרים שטרם עלו לאוויר:**
עבור אתרים חדשים, השתמש רק ב-`sku` ללא `variantIndex`. דלג על backward compatibility.

**צעדים (גרסה פשוטה):**
1. עדכון ממשק `ICartItem` ב-`server/src/models/Cart.ts`:
   - שדה `sku: string` (חובה)
   - שמירת snapshot: `snapshotPrice`, `snapshotName`, `snapshotImage`
   - ❌ **אין צורך ב-variantIndex** לאתרים חדשים

2. עדכון לוגיקת הוספה/עדכון פריט בסל:
   
   **שליפת SKU מהווריאנט הנבחר:**
   - ב-`addItem`: אחרי שליפת המוצר מ-DB, קבל את ה-SKU:
     ```
     const selectedVariant = product.variants[variantIndex];
     const sku = selectedVariant?.sku || product.sku || `${productId}-${variantIndex}`;
     ```
   
   **שמירת SKU בפריט:**
   - הוסף שדה `sku` לאובייקט `newItem` לפני הוספה לסל:
     ```
     const newItem: ICartItem = {
       productId,
       sku: sku,  // רק SKU!
       quantity,
       price: finalPrice,
       name: product.name,
       // ...שאר השדות
     };
     ```
   
   **שימוש ב-SKU להשוואה:**
   - כשמחפשים אם הפריט כבר קיים בסל, השווה לפי SKU בלבד:
     ```
     const existingItemIndex = cart.items.findIndex(item => {
       return item.productId.toString() === productId.toString() && 
              item.sku === sku;
     });
     ```
   
   **שמירת snapshot:**
   - שמור snapshot של מחיר, שם ותמונה בזמן ההוספה (כבר קיים)
   - ה-snapshot ישמש לתצוגה בסל, אבל המחיר האמיתי יאומת מול DB ב-recalculateCart

3. עדכון פונקציית `recalculateCart`:
   - re-validation של מחיר מול SKU Collection
   - עדכון snapshot אם יש שינוי מחיר
   - התראה למשתמש על שינוי מחיר
   
   **מתי להפעיל:**
   - כשלקוח פותח את עמוד הסל (GET /api/cart)
   - לפני מעבר ל-checkout (בעתיד)
   - **לא** ב-addItem (המחיר כבר טרי מ-DB)
   - **לא** ב-updateItemQuantity (רק כמות משתנה)

4. עדכון client-side:
   - `client/src/types/Product.ts` - הוספת sku לממשק CartItem
   - `client/src/store/slices/cartSlice.ts` - שליחת sku בלבד
   - `client/src/services/cartService.ts` - עדכון API calls

**קבצים מושפעים:**
- `server/src/models/Cart.ts`
- `server/src/services/cartService.ts`
- `client/src/types/Product.ts`
- `client/src/store/slices/cartSlice.ts`
- `client/src/services/cartService.ts`

---

### 1.3 אימות נתונים בצד שרת
**מטרה:** אבטחה - אי-סמיכה על נתונים מהלקוח

**צעדים:**
1. בכל endpoint שמקבל מחיר/SKU/מידע מוצר:
   - התעלמות ממחיר שנשלח מהלקוח
   - שליפת מידע סמכותי מ-DB
   - חישוב מחיר סופי (כולל מבצעים, מודיפיקטורים)

2. יישום ב-`cartController.addItem`:
   - קבלת productId + sku (או variantIndex)
   - שליפת המוצר והווריאנט מ-DB
   - שימוש במחיר האמיתי
   - החזרת שגיאה אם SKU לא נמצא

3. הוספת validation middleware:
   - בדיקת קיום productId
   - בדיקת תקינות sku format
   - בדיקת זמינות (isActive, inStock)

**קבצים מושפעים:**
- `server/src/controllers/cartController.ts`
- `server/src/middleware/` (validation middleware חדש)
- `server/src/services/productService.ts` (פונקציית עזר לשליפת מחיר)

---

### 1.4 טיפול במיזוג סלים (Guest → Authenticated User)
**מטרה:** שמירת חוויה רציפה כשלקוח מתחבר

**תרחיש:**
1. לקוח אורח מוסיף פריטים לסל (שמור ב-sessionId)
2. לקוח מתחבר (login)
3. צריך למזג סל אנונימי + סל משתמש קיים

**לוגיקת מיזוג מתוקנת:**
- שליפת שני הסלים: guestCart (ע"פ sessionId) + userCart (ע"פ userId)
- לכל פריט בגuestCart:
  - אם אותו SKU קיים גם ב-userCart → חבר כמויות
  - אם SKU קיים רק ב-guestCart → העבר לuserCart
  - בדיקת מלאי זמין לכמות המעודכנת
- מחיקת guestCart לאחר מיזוג מוצלח
- החזרת userCart מעודכן עם recalculateCart

**עדכון הלוגיקה הקיימת:**
- הקוד הנוכחי ב-`cartService.mergeCarts` משתמש ב-`JSON.stringify(variant)` להשוואה
- צריך לשנות להשוואה לפי `sku` (כשיהיה זמין) או `variantIndex`
- הוספת בדיקות מלאי בתהליך המיזוג

**צעדים מפורטים:**

**1. עדכון `cartService.mergeCarts` לשימוש ב-SKU:**

   **⚠️ הערה - לאתרים חדשים:**
   השווה רק לפי SKU, ללא fallback ל-variantIndex.
   
   **השוואה לפי SKU בלבד:**
   ```typescript
   const existingItemIndex = userCart.items.findIndex(item => {
     const sameProduct = item.productId.toString() === guestItem.productId.toString();
     return sameProduct && item.sku === guestItem.sku;
   });
   ```
   
   **בדיקת מלאי בזמן מיזוג:**
   
   אחרי מציאת פריט תואם, בדוק מלאי לפני חיבור כמויות:
   ```typescript
   if (existingItemIndex !== -1) {
     const existingItem = userCart.items[existingItemIndex];
     const targetQuantity = existingItem.quantity + guestItem.quantity;
     
     // בדוק מלאי זמין מ-SKU Collection
     const sku = await Sku.findOne({ sku: guestItem.sku });
     const maxStock = sku ? sku.stockQuantity : 0;
     
     if (targetQuantity > maxStock) {
       // אופציה: הגבל לכמות מקסימלית
       existingItem.quantity = maxStock;
       // אופציה: זרוק שגיאה
       // throw new Error(`לא ניתן למזג - מלאי לא מספיק עבור ${guestItem.name}`);
     } else {
       existingItem.quantity = targetQuantity;
     }
   } else {
     // פריט לא קיים - הוסף אותו (אחרי בדיקת מלאי)
     const sku = await Sku.findOne({ sku: guestItem.sku });
     const maxStock = sku ? sku.stockQuantity : 0;
     
     if (guestItem.quantity > maxStock) {
       guestItem.quantity = maxStock;
     }
     
     userCart.items.push(guestItem);
   }
   ```

**2. מיזוג בצד שרת (Server-Side Merge) - הדרך המומלצת:**

   **למה Server-Side?**
   - ✅ אבטחה וסנכרון: המיזוג מתבצע מיד אחרי אימות
   - ✅ חוויית משתמש: הסל המאוחד חוזר עם תגובת login
   - ✅ פשטות: הלקוח רק שולח sessionId
   - ✅ טיפול בשגיאות: השרת מטפל בכל הבעיות במקום אחד
   - ✅ תקן בתעשייה: כך עושות Amazon, Shopify, Magento, WooCommerce
   
   **עדכון `authController.login`:**
   
   ```typescript
   // server/src/controllers/auth/authentication.ts
   
   export const login = async (req: Request, res: Response) => {
     const { email, password, guestSessionId } = req.body;
     
     // 1. אימות משתמש (קיים)
     const user = await User.findOne({ email }).select('+password');
     if (!user || !(await user.comparePassword(password))) {
       return res.status(401).json({ message: 'Invalid credentials' });
     }
     
     // 2. צור token (קיים)
     const token = jwt.sign({ userId: user._id }, JWT_SECRET);
     
     // 3. ✨ מיזוג סלים אוטומטי (חדש)
     let userCart;
     if (guestSessionId) {
       try {
         // מצא סל אורח
         const guestCart = await Cart.findOne({ sessionId: guestSessionId });
         
         if (guestCart && guestCart.items.length > 0) {
           // מצא/צור סל משתמש
           userCart = await Cart.findOne({ userId: user._id });
           if (!userCart) {
             userCart = new Cart({ userId: user._id, items: [] });
           }
           
           // מזג את הסלים
           userCart = await cartService.mergeCarts(userCart, guestCart);
           
           // מחק סל אורח
           await Cart.deleteOne({ sessionId: guestSessionId });
         } else {
           // אין סל אורח - רק החזר סל משתמש
           userCart = await cartService.getOrCreateCart(user._id);
         }
       } catch (error) {
         console.error('Cart merge failed:', error);
         // אל תכשיל את ה-login בגלל בעיית מיזוג
         userCart = await cartService.getOrCreateCart(user._id);
       }
     } else {
       userCart = await cartService.getOrCreateCart(user._id);
     }
     
     // 4. החזר תגובה עם token וסל
     res.json({
       token,
       user: { id: user._id, email: user.email, name: user.name },
       cart: userCart, // ← הסל המאוחד!
     });
   };
   ```

**3. עדכון צד לקוח לשלוח `guestSessionId`:**
   
   **עדכון `authService.login` (client):**
   ```typescript
   // client/src/services/authService.ts
   
   export const login = async (email: string, password: string) => {
     // שלוף sessionId מ-localStorage
     const guestSessionId = localStorage.getItem('sessionId');
     
     const response = await api.post('/auth/login', {
       email,
       password,
       guestSessionId, // ← שלח sessionId של אורח
     });
     
     const { token, user, cart } = response.data;
     
     // שמור token
     localStorage.setItem('token', token);
     
     // נקה sessionId ישן
     if (guestSessionId) {
       localStorage.removeItem('sessionId');
     }
     
     return { token, user, cart };
   };
   ```
   
   **עדכון Redux `authSlice` (client):**
   ```typescript
   // client/src/store/slices/authSlice.ts
   
   export const loginUser = createAsyncThunk(
     'auth/login',
     async (credentials: { email: string; password: string }, { dispatch }) => {
       const { token, user, cart } = await authService.login(
         credentials.email,
         credentials.password
       );
       
       // עדכן את הסל ב-Redux
       if (cart) {
         dispatch(setCart(cart)); // ← עדכן סל מיד
       }
       
       return { token, user };
     }
   );
   ```

**4. טיפול בשגיאות מיזוג:**
   
   - מלאי לא מספיק: הגבל כמות למקסימום זמין
   - מוצר לא קיים: דלג על הפריט והמשך
   - SKU לא תקף: השתמש ב-fallback (variantIndex)
   - שגיאת DB: לא תכשיל login, רק החזר סל משתמש ריק

**קבצים מושפעים:**
- `server/src/services/cartService.ts` - עדכון `mergeCarts`
- `server/src/controllers/auth/authentication.ts` - הוספת לוגיקת מיזוג ב-login
- `server/src/controllers/cartController.ts` - endpoint למיזוג ידני (אופציונלי)
- `client/src/services/authService.ts` - שליחת guestSessionId
- `client/src/store/slices/authSlice.ts` - טיפול בסל לאחר login

---

### 1.5 Checklist לסיום שלב 1 ✅

**לפני מעבר לשלב 2, וודא שהכל עובד:**

**מודלים:**
- [ ] `ICartItem` כולל שדה `sku: string` (חובה) ב-`server/src/models/Cart.ts`
- [ ] `CartItemSchema` מגדיר `sku: { type: String, required: true }`
- [ ] ❌ **אין** `variantIndex` בסכמה (לאתרים חדשים)

**CartService:**
- [ ] `addItem` שומר `sku` לכל פריט חדש
- [ ] `addItem` משתמש ב-`sku` להשוואה בלבד
- [ ] `mergeCarts` משתמש ב-`sku` להשוואה בלבד
- [ ] `mergeCarts` בודק מלאי מ-SKU Collection לפני חיבור כמויות
- [ ] `mergeCarts` מגביל או מתריע כשאין מספיק מלאי
- [ ] `recalculateCart` מאמת מחירים מול SKU Collection

**Auth Flow (Server-Side Merge):**
- [ ] `authController.login` מקבל `guestSessionId` בבקשה
- [ ] `authController.login` קורא ל-`mergeCarts` אחרי אימות מוצלח
- [ ] `authController.login` מחזיר את הסל המאוחד בתגובה
- [ ] `authController.login` מוחק את סל האורח אחרי מיזוג
- [ ] טיפול בשגיאות: מיזוג לא מכשיל את ה-login

**Client:**
- [ ] `authService.login` שולח `guestSessionId` מ-localStorage
- [ ] `authService.login` מנקה `sessionId` אחרי login מוצלח
- [ ] `authSlice.loginUser` מעדכן את הסל ב-Redux עם הסל המאוחד
- [ ] `client/src/types` מעודכן עם `sku` ב-CartItem

**טסטים:**
- [ ] בדיקת מיזוג עם SKU זהה (חיבור כמויות)
- [ ] בדיקת מיזוג עם SKU שונה (הוספת פריט)
- [ ] בדיקת מיזוג עם עודף מלאי (הגבלה/התראה)
- [ ] בדיקת login עם סל אורח ריק
- [ ] בדיקת login בלי guestSessionId
- [ ] בדיקת concurrent cart operations

**תיעוד:**
- [ ] עדכון README עם flow המיזוג
- [ ] תיעוד API: login endpoint מקבל guestSessionId

---

## שלב 2: הכנה למיגרציה

### 2.1 ניתוח ואודית נתונים קיימים
**מטרה:** הבנת המצב הקיים וזיהוי בעיות

**צעדים:**
1. יצירת סקריפט ניתוח:
   - `server/src/scripts/analyzeVariants.ts`
   - ספירת כמות מוצרים וכמות ווריאנטים כוללת
   - זיהוי מוצרים ללא ווריאנטים / עם ווריאנט בודד
   - רשימת כל SKUs קיימים

2. בדיקת כפילויות SKU:
   - חיפוש SKUs שמופיעים ביותר ממוצר אחד
   - זיהוי ווריאנטים ללא SKU
   - זיהוי SKUs לא תקינים (null, undefined, empty string)

3. הפקת דוח:
   - כמות מוצרים ייחודיים
   - כמות SKUs כוללת
   - רשימת כפילויות (אם יש)
   - רשימת SKUs חסרים או לא תקינים
   - הערכת גודל collection החדש

4. ניקוי נתונים (אם נדרש):
   - תיקון SKUs כפולים (הוספת suffix ייחודי)
   - השלמת SKUs חסרים (generation בפורמט עקבי)
   - סימון ווריאנטים לא פעילים

**קבצים חדשים:**
- `server/src/scripts/analyzeVariants.ts`
- `server/src/scripts/cleanupSkus.ts`

---

### 2.2 תכנון מבנה SKU Collection
**מטרה:** הגדרת סכמה ואסטרטגיית נתונים

**צעדים:**
1. יצירת מודל Sku:
   - `server/src/models/Sku.ts`
   - שדות: sku (unique), productId (ref), name, price, stockQuantity
   - attributes (color, size, material - flexible object)
   - images, isActive, timestamps

2. הגדרת אינדקסים:
   - unique index על `sku`
   - index על `productId` (לשליפת כל SKUs של מוצר)
   - compound index על attributes נפוצים (למשל color + size)
   - index על `stockQuantity` (לחיפוש in-stock items)

3. יצירת ממשקים ב-TypeScript:
   - `ISku` interface
   - `ISkuDocument` interface
   - עדכון `IProduct` להכיל `skuIds?: ObjectId[]` (אופציונלי)

4. תכנון relationship:
   - SKU מחזיק productId (one-to-many: Product → SKUs)
   - Product יכול להחזיק array של skuIds (אופציונלי, למהירות)
   - או populate דינמי בשאילתות

**קבצים חדשים:**
- `server/src/models/Sku.ts`

**קבצים מושפעים:**
- `server/src/models/Product.ts` (הוספת skuIds אופציונלי)

---

### 2.3 יצירת שירותי SKU
**מטרה:** abstraction layer לעבודה עם SKUs

**צעדים:**
1. יצירת `server/src/services/skuService.ts`:
   - `getSkuByCode(sku: string)` - שליפת SKU לפי קוד
   - `getSkusByProductId(productId)` - שליפת כל SKUs של מוצר
   - `updateStock(sku: string, quantity: number)` - עדכון מלאי אטומי
   - `reserveStock(sku, qty, reservationId)` - שמירת מלאי
   - `releaseReservation(reservationId)` - שחרור רזרבציה
   - `checkAvailability(sku, qty)` - בדיקת זמינות

2. יצירת `server/src/controllers/skuController.ts`:
   - GET `/api/skus/:sku` - קבלת פרטי SKU
   - GET `/api/products/:productId/skus` - קבלת כל SKUs של מוצר
   - PATCH `/api/skus/:sku/stock` - עדכון מלאי (admin)

3. הוספת routes:
   - `server/src/routes/skuRoutes.ts`
   - רישום ב-`server/src/routes/index.ts`

**קבצים חדשים:**
- `server/src/services/skuService.ts`
- `server/src/controllers/skuController.ts`
- `server/src/routes/skuRoutes.ts`

---

## שלב 3: מיגרציה והטמעה

### 3.1 פיתוח סקריפט מיגרציה
**מטרה:** העברת variants קיימים ל-SKUs collection

**צעדים:**
1. יצירת `server/src/scripts/migrateToSkus.ts`:
   - קריאת כל מוצרים מ-DB (בבאצ'ים של 100-500)
   - לכל מוצר, לולאה על variants
   - יצירת SKU document לכל variant
   - שמירת mapping: variantIndex → skuId

2. לוגיקת המרה:
   ```
   לכל variant במוצר:
   - צור SKU חדש
   - העתק: sku, name, attributes, images
   - חשב price = product.price + variant.priceModifier
   - העתק stockQuantity
   - שמור productId
   - שמור isActive
   ```

3. טיפול בשגיאות:
   - SKU כפול - דלג או הוסף suffix
   - SKU חסר - generate מ-productId + attributes
   - שמירת log של כל שגיאה

4. verification:
   - ספירת SKUs שנוצרו
   - השוואה למספר variants מקורי
   - sample check - בדיקת 10 מוצרים ידנית

5. dry-run mode:
   - הרצה ללא שמירה (console.log בלבד)
   - אפשרות ל-rollback (שמירת backup)

**קבצים חדשים:**
- `server/src/scripts/migrateToSkus.ts`

---

### 3.2 עדכון שירותים להשתמש ב-SKUs
**מטרה:** מעבר מלא לשימוש ב-SKU Collection בלבד

**⚠️ הערה קריטית - לאתרים שטרם עלו לאוויר:**
עבור אתרים שעדיין בפיתוח וללא לקוחות אמיתיים, **אין צורך בתמיכה במצבים מקבילים**.
יש לעבור ישירות לשימוש ב-SKU Collection בלבד, ללא feature flags או backward compatibility.

**צעדים (גרסה פשוטה - ללא dual-mode):**

1. ❌ **דלג על** יצירת feature flag - לא נדרש!
   - אין `USE_SKU_COLLECTION` 
   - אין תמיכה במצבים מקבילים
   - רק SKU Collection מהתחלה

2. עדכון `productService.ts`:
   - פונקציה `getProductWithSkus` - שליפת SKUs מה-collection בלבד
   - החזרת SKUs כמו שהם (ללא המרה למבנה variant)
   - הסרת כל התייחסות ל-embedded variants

3. עדכון `cartService.ts`:
   - פונקציה `addItem` - שימוש ב-`sku` בלבד
   - בדיקת מלאי מול SKU Collection
   - הסרת כל לוגיקה של `variantIndex`
   - השוואה לפי `sku` בלבד (ללא fallback)

4. עדכון `Cart.ts` Model:
   - הסרת שדה `variantIndex` (לא נדרש)
   - הסרת שדה `variant` (לא נדרש)
   - רק `sku: string` (חובה, לא אופציונלי)

**קבצים מושפעים:**
- `server/src/services/productService.ts` - רק SKU logic
- `server/src/services/cartService.ts` - רק SKU logic
- `server/src/models/Cart.ts` - הסרת variantIndex/variant
- `server/src/models/Product.ts` - (אופציונלי) הסרת variants array

**יתרונות הגישה הפשוטה:**
- ✅ קוד נקי יותר וקל לתחזוקה
- ✅ אין if/else branches מסובכים
- ✅ אין בעיות backward compatibility
- ✅ ביצועים טובים יותר
- ✅ פחות באגים פוטנציאליים

**הערה חשובה**: כאשר תיצור את מערכת ההזמנות בעתיד, תוכל להוסיף:
- `orderService.ts` - שמירת skuId/sku בהזמנה והורדת מלאי אטומית
- `orderController.ts` - endpoints לניהול הזמנות
- אינטגרציה עם reservation mechanism

---

### 3.3 עדכון API ו-Controllers
**מטרה:** התאמת endpoints לעבודה עם SKUs

**צעדים:**
1. עדכון `productController.ts`:
   - `getProductById` - החזרת SKUs במקום/בנוסף ל-variants
   - פורמט תגובה: 
     ```json
     {
       "product": {...},
       "skus": [...] // או variants (תלוי ב-flag)
     }
     ```

2. עדכון `cartController.ts`:
   - `addItem` - קבלת sku במקום variantIndex
   - תמיכה זמנית בשני הפורמטים (מעבר הדרגתי)
   - validation על sku format

3. יצירת migration endpoints (זמניים):
   - POST `/api/admin/migrate/skus` - הפעלת מיגרציה
   - GET `/api/admin/migrate/skus/status` - סטטוס מיגרציה
   - POST `/api/admin/migrate/skus/rollback` - rollback

**קבצים מושפעים:**
- `server/src/controllers/productController.ts`
- `server/src/controllers/cartController.ts`
- `server/src/routes/` - הוספת admin migration routes

---

### 3.4 עדכון Frontend
**מטרה:** התאמת UI לעבודה עם SKUs

**צעדים:**
1. עדכון Types:
   - `client/src/types/Product.ts` - הוספת Sku interface
   - עדכון Product type לכלול `skus?: Sku[]`
   - שמירת variants לתקופת מעבר

2. עדכון `ProductDetail.tsx`:
   - קבלת SKUs במקום variants
   - עדכון state: selectedSku במקום selectedVariantIndex
   - הצגת מידע מ-SKU (price, stock, images)

3. עדכון `VariantSelector.tsx`:
   - מעבר על skus במקום variants
   - שליחת sku code בעת בחירה
   - הצגת attributes מ-SKU

4. עדכון Redux (`cartSlice.ts`):
   - `addToCart` - שליחת sku במקום variantIndex
   - עדכון CartItem type לכלול sku
   - תמיכה זמנית בשני הפורמטים

5. עדכון `cartService.ts` (client):
   - עדכון API calls לשלוח sku
   - טיפול בתגובות עם SKU data

**קבצים מושפעים:**
- `client/src/types/Product.ts`
- `client/src/components/features/products/ProductDetail/ProductDetail.tsx`
- `client/src/components/features/products/VariantSelector/VariantSelector.tsx`
- `client/src/store/slices/cartSlice.ts`
- `client/src/services/cartService.ts`

---

### 3.5 טסטים ואימות
**מטרה:** ווידוא תקינות המערכת לאחר מעבר

**צעדים:**
1. Unit Tests:
   - `skuService.test.ts` - בדיקת כל פונקציות השירות
   - `cartService.test.ts` - בדיקת הוספה/עדכון עם SKUs
   - בדיקות concurrency למניעת oversell

2. Integration Tests:
   - בדיקת flow מלא: הוספה לסל → עדכון כמות → הסרה מסל
   - בדיקת עדכון מלאי במקביל (concurrency tests)
   - **לעתיד**: בדיקת checkout → יצירת הזמנה (כאשר תיצור מערכת הזמנות)

3. E2E Tests:
   - ניווט למוצר → בחירת ווריאנט → הוספה לסל
   - עדכון כמות בסל → הסרה מהסל
   - בדיקת עדכון מלאי בזמן אמת
   - **לעתיד**: מעבר לתשלום → השלמת הזמנה (כאשר תיצור checkout flow)

4. Performance Tests:
   - load testing על endpoints חדשים
   - השוואת זמני תגובה לפני ואחרי
   - בדיקת query performance עם אינדקסים

5. בדיקות ידניות:
   - בדיקת UI - תצוגת ווריאנטים, מחירים, מלאי
   - בדיקת סל - הוספה, עדכון, מחיקה
   - בדיקת admin panel - ניהול SKUs

**קבצים חדשים:**
- `server/src/tests/services/skuService.test.ts`
- `server/src/tests/services/cartService.test.ts`
- `client/src/tests/components/ProductDetail.test.tsx`

---

## שלב 4: שיפורים מתקדמים

### 4.1 מנגנון Reservation (שמירת מלאי) - **לעתיד**
**מטרה:** מניעת oversell במהלך תהליך checkout

**הערה חשובה**: שלב זה יהיה רלוונטי רק לאחר יצירת מערכת ההזמנות (Orders) ו-checkout flow. כרגע, העדכונים האטומיים (שלב 1.1) מספיקים למניעת oversell בסל הקניות.

**צעדים לעתיד (כאשר תיצור checkout):**
1. יצירת מודל Reservation:
   - `server/src/models/Reservation.ts`
   - שדות: reservationId, skuId, quantity, userId, expiresAt, status
   - TTL index על expiresAt (מחיקה אוטומטית)

2. יצירת `reservationService.ts`:
   - `createReservation(skuId, qty, userId)` - יצירת רזרבציה
   - `confirmReservation(reservationId)` - אישור והמרה להזמנה
   - `cancelReservation(reservationId)` - ביטול והחזרת מלאי
   - `cleanupExpiredReservations()` - ניקוי (cron job)

3. אינטגרציה ב-checkout flow:
   - בתחילת checkout: createReservation לכל פריט
   - במהלך checkout: reservation פעילה (10-15 דקות)
   - בהצלחה: confirmReservation + הורדת מלאי סופית
   - בכשל/timeout: cancelReservation אוטומטי

4. עדכון UI:
   - הצגת טיימר לסיום checkout
   - התראה לפני פקיעת הרזרבציה
   - טיפול במקרה של פקיעה (ניקוי סל)

**קבצים חדשים (לעתיד, עם מערכת הזמנות):**
- `server/src/models/Reservation.ts`
- `server/src/services/reservationService.ts`
- `server/src/jobs/cleanupReservations.ts` (cron)

---

### 4.2 Transactions לאטומיות מלאה - **לעתיד**
**מטרה:** עקביות נתונים במבצעים מורכבים

**הערה חשובה**: טרנזקציות יהיו קריטיות כאשר תיצור מערכת הזמנות שצריכה לבצע מספר פעולות אטומיות (יצירת הזמנה + הורדת מלאי + עדכון רזרבציות). כרגע, פעולות הסל פשוטות מספיק ולא דורשות transactions.

**צעדים לעתיד (כאשר תיצור checkout ו-orders):**
1. הגדרת MongoDB Replica Set:
   - ווידוא שה-DB רץ ב-replica set mode
   - בדיקת תמיכה ב-transactions (MongoDB 4.0+)

2. יישום ב-`orderService.createOrder` (בעתיד):
   ```
   session.startTransaction()
   try:
     - יצירת order document
     - הורדת מלאי מכל SKUs (אטומי)
     - עדכון סטטוס רזרבציות
     - עדכון סטטוס סל ל-checkedOut
     - commit transaction
   catch:
     - abort transaction (rollback אוטומטי)
     - החזרת שגיאה
   ```

3. error handling:
   - retry logic למקרי timeout
   - logging מפורט
   - התראות למנהלים

**קבצים מושפעים (בעתיד):**
- `server/src/services/orderService.ts` (יווצר)
- `server/src/services/cartService.ts` (אינטגרציה)
- `server/src/config/database.ts` - הגדרת sessions

---

### 4.3 אופטימיזציה וביצועים
**מטרה:** שיפור מהירות ויעילות

**צעדים:**
1. אינדקסים נוספים:
   - compound indexes לשאילתות נפוצות
   - partial indexes (למשל רק על isActive=true)
   - text indexes לחיפוש (attributes.color, name)

2. Caching:
   - Redis cache לנתוני SKU פופולריים
   - invalidation בעדכון מחיר/מלאי
   - cache warming לעמוד הבית

3. Query Optimization:
   - שימוש ב-projection (בחירת שדות ספציפיים)
   - aggregation pipelines למקרים מורכבים
   - pagination לרשימות SKUs גדולות

4. Connection Pooling:
   - הגדרת pool size אופטימלי
   - connection reuse
   - monitoring של connection health

**קבצים מושפעים:**
- `server/src/models/Sku.ts` - הוספת אינדקסים
- `server/src/config/redis.ts` - הגדרת Redis
- `server/src/services/cacheService.ts` - cache layer חדש

---

### 4.4 ניטור ו-Observability
**מטרה:** ראות לתפעול ומניעת בעיות

**צעדים:**
1. Logging:
   - log כל עדכון מלאי (audit trail)
   - log oversell attempts
   - log reservation timeouts
   - structured logging (JSON format)

2. Metrics:
   - מונה מלאי נמוך (low stock alerts)
   - מונה oversell attempts
   - זמני תגובה של SKU queries
   - throughput של עדכוני מלאי

3. Alerts:
   - התראה במלאי נמוך (< 5 יחידות)
   - התראה בכישלון עדכון מלאי
   - התראה בעלייה חריגה ב-oversell attempts
   - התראה בזמני תגובה איטיים

4. Dashboards:
   - תצוגת מלאי בזמן אמת
   - גרפים של מכירות לפי SKU
   - ביצועי מערכת (latency, throughput)
   - סטטוס reservations

**קבצים חדשים:**
- `server/src/utils/logger.ts` - enhanced logging
- `server/src/utils/metrics.ts` - metrics collection
- `server/src/config/monitoring.ts` - alerts configuration

---

## שלב 5: ניקוי והשלמה

### 5.1 הסרת קוד ישן
**מטרה:** ניקוי legacy code לאחר מעבר מוצלח

**צעדים:**
1. הסרת feature flags:
   - מחיקת `USE_SKU_COLLECTION` flag
   - הסרת if/else branches של מצב ישן
   - שמירת רק קוד SKU-based

2. הסרת embedded variants:
   - מחיקת `variants` array מ-Product schema
   - מחיקת VariantSchema
   - עדכון interfaces להסיר Variant types

3. ניקוי endpoints ישנים:
   - מחיקת migration endpoints זמניים
   - הסרת backward compatibility layers
   - עדכון API documentation

4. ניקוי client-side:
   - מחיקת variantIndex logic
   - הסרת variant types ישנים
   - עדכון כל התייחסויות

**קבצים מושפעים:**
- `server/src/models/Product.ts`
- `server/src/services/productService.ts`
- `server/src/services/cartService.ts`
- `client/src/types/Product.ts`
- כל קובץ שהשתמש ב-variants

---

### 5.2 עדכון תיעוד
**מטרה:** תיעוד המערכת החדשה

**צעדים:**
1. עדכון README:
   - הסבר על מבנה SKU
   - הסבר על flow הוספה לסל/checkout
   - דיאגרמות ארכיטקטורה

2. API Documentation:
   - עדכון Swagger/OpenAPI
   - דוגמאות requests/responses עם SKUs
   - הסבר על reservation mechanism

3. תיעוד למפתחים:
   - מדריך הוספת מוצרים חדשים
   - מדריך ניהול מלאי
   - best practices לעדכוני SKU

4. תיעוד לצוות תמיכה:
   - מדריך פתרון בעיות מלאי
   - מדריך ניהול reservations
   - FAQ לבעיות נפוצות

**קבצים חדשים/מעודכנים:**
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/SKU_MANAGEMENT.md`

---

### 5.3 הדרכה והטמעה
**מטרה:** העברת ידע לצוות

**צעדים:**
1. הדרכה טכנית:
   - מפגש הסבר על המבנה החדש
   - דוגמאות קוד והדגמות
   - תרגול על סביבת dev

2. הדרכה תפעולית:
   - איך לנטר מלאי
   - איך לטפל ב-alerts
   - איך לבצע rollback במקרה חירום

3. תהליכים חדשים:
   - תהליך הוספת מוצר חדש
   - תהליך עדכון מלאי
   - תהליך reconciliation מול ספקים

---

## שלב 6: אופטימיזציות מתקדמות (אופציונלי)

### 6.1 Microservice ייעודי למלאי
**תנאי:** רק אם עומס גבוה מאוד או צורך בהפרדה

**צעדים:**
1. יצירת שירות נפרד:
   - `inventory-service` - Node.js microservice
   - DB נפרד לאינוונטורי (או shared עם segregation)
   - Redis לסנכרון בזמן אמת

2. API Gateway:
   - routing לשירות המלאי
   - rate limiting
   - caching layer

3. Event-Driven Architecture:
   - Message queue (RabbitMQ/Kafka)
   - events: StockUpdated, ReservationCreated, OrderCompleted
   - eventual consistency

4. גיבוי וסנכרון:
   - sync בין main DB למלאי
   - fallback למצב read-only
   - reconciliation jobs

---

### 6.2 Machine Learning למלאי
**מטרה:** חיזוי ביקוש ואופטימיזציה

**צעדים:**
1. איסוף נתונים:
   - היסטוריית מכירות לפי SKU
   - עונתיות וטרנדים
   - correlation בין מוצרים

2. מודלים:
   - חיזוי ביקוש (demand forecasting)
   - המלצות reorder point
   - זיהוי slow-movers

3. אינטגרציה:
   - auto-alerts למלאי נמוך
   - המלצות לרכישה מספקים
   - dynamic pricing בהתאם למלאי

---

## סיכום נקודות מפתח

### עקרונות מנחים
- **אטומיות**: כל עדכון מלאי אטומי ובטוח
- **ייחודיות**: SKU ייחודי בכל המערכת
- **מדרגיות**: שימוש באינדקסים, caching, ואופטימיזציות
- **אמינות**: transactions, reservations, monitoring
- **גמישות**: מבנה attributes פתוח למאפיינים חדשים

### תלויות קריטיות
- MongoDB 4.0+ (לצורך transactions)
- Node.js + Express
- React + Redux
- Redis (לcaching ו-reservations)
- Monitoring tools (למטריקות ו-alerts)

### נקודות החלטה
- האם להשתמש ב-reservations או רק בדיקות אטומיות?
- האם לשמור variants גם לאחר מעבר (לarchive)?
- איזה TTL לreservations (10/15/20 דקות)?
- האם לעבור למיקרו-שירות או להשאר monolith?

### מדדי הצלחה
- אפס מקרי oversell בפרודקשן
- זמני תגובה < 200ms לשאילתות SKU
- 99.9% uptime של מערכת המלאי
- כל SKU ייחודי ומתועד
- ניטור מלא וראות לתפעול

---

## נספחים

### קבצים חדשים שייווצרו

**שלבים 1-3 (עכשיו):**
```
server/src/models/Sku.ts
server/src/services/skuService.ts
server/src/controllers/skuController.ts
server/src/routes/skuRoutes.ts
server/src/scripts/analyzeVariants.ts
server/src/scripts/migrateToSkus.ts
server/src/scripts/cleanupSkus.ts
server/src/tests/services/skuService.test.ts
docs/SKU_MANAGEMENT.md
docs/ARCHITECTURE.md
```

**שלב 4 (לעתיד, עם מערכת הזמנות):**
```
server/src/models/Reservation.ts
server/src/models/Order.ts
server/src/services/reservationService.ts
server/src/services/orderService.ts
server/src/controllers/orderController.ts
server/src/routes/orderRoutes.ts
server/src/jobs/cleanupReservations.ts
```

**שלב 4.3-4.4 (אופציונלי):**
```
server/src/services/cacheService.ts
server/src/utils/metrics.ts
server/src/config/monitoring.ts
```

### קבצים עיקריים לעדכון

**עכשיו (שלבים 1-3):**
```
server/src/models/Product.ts
server/src/models/Cart.ts
server/src/services/productService.ts
server/src/services/cartService.ts
server/src/controllers/productController.ts
server/src/controllers/cartController.ts
client/src/types/Product.ts
client/src/components/features/products/ProductDetail/ProductDetail.tsx
client/src/components/features/products/VariantSelector/VariantSelector.tsx
client/src/store/slices/cartSlice.ts
client/src/services/cartService.ts
```

**בעתיד (עם מערכת הזמנות):**
```
server/src/services/orderService.ts (יווצר)
server/src/controllers/orderController.ts (יווצר)
```

### כלים נדרשים
- MongoDB Compass (לניתוח נתונים)
- Postman/Insomnia (לבדיקת API)
- Redis CLI (לניהול cache)
- Load testing tool (k6, Artillery)
- Monitoring platform (Grafana, Datadog)

---

**סיום התוכנית**

תוכנית זו מספקת מפת דרכים מפורטת למעבר ממודל variants מוטמע למודל SKUs נפרד ומקצועי. היישום צריך להיות הדרגתי, מבוקר, ומלווה בבדיקות מקיפות בכל שלב.
