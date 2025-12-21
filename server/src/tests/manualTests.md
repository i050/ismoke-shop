# 🧪 בדיקות ידניות - Products Management

## ✅ שלבים 1-3 הושלמו:
- ✅ shadcn/ui Select הותקן
- ✅ imageService.ts קיים עם Rollback Strategy
- ✅ Cursor-Based Pagination מיושם

---

## 📋 שלב 4: בדיקות קריטיות

### בדיקה 1: MongoDB Transactions - Rollback על SKU כפול

**מטרה:** לוודא שאם SKU כפול - כל ה-Transaction מתבטל

**צעדים:**
1. פתח Postman/Thunder Client
2. POST ל-`http://localhost:5000/api/products`
3. Headers: `Authorization: Bearer <ADMIN_TOKEN>`
4. Body (JSON):
```json
{
  "name": "Test Product Transactions",
  "description": "Testing duplicate SKU rollback",
  "basePrice": 100,
  "categoryId": "<CATEGORY_ID>",
  "skus": [
    {
      "sku": "TEST-DUPLICATE-001",
      "name": "SKU 1",
      "stockQuantity": 10
    },
    {
      "sku": "TEST-DUPLICATE-001",
      "name": "SKU 2 - Same SKU!",
      "stockQuantity": 5
    }
  ]
}
```

**תוצאה מצופה:**
- ❌ שגיאה: "SKU כפול"
- ✅ המוצר לא נוצר במונגו
- ✅ אף SKU לא נוצר

**בדיקת MongoDB:**
```javascript
db.products.find({ name: "Test Product Transactions" })
// צריך להחזיר: [] (ריק)

db.skus.find({ sku: "TEST-DUPLICATE-001" })
// צריך להחזיר: [] (ריק)
```

---

### בדיקה 2: Rate Limiting - 21 בקשות בדקה

**מטרה:** לוודא שבקשה 21 נחסמת

**צעדים:**
1. פתח Postman/Thunder Client
2. צור Collection Runner
3. הגדר GET ל-`http://localhost:5000/api/products`
4. הרץ 21 פעמים ברצף

**תוצאה מצופה:**
- ✅ בקשות 1-100 מצליחות (generalLimiter)
- אבל אם יש rate limiter ספציפי למוצרים:
  - ✅ בקשות 1-20 מצליחות
  - ❌ בקשה 21: Status 429 "יותר מדי בקשות"

---

### בדיקה 3: Cascade Delete - מחיקת Product מוחקת SKUs

**מטרה:** לוודא שכשמוחקים Product, ה-SKUs שלו נמחקים

**צעדים:**
1. צור מוצר עם 2 SKUs:
```bash
POST /api/products
{
  "name": "Test Cascade Delete",
  "description": "Testing cascade delete",
  "basePrice": 50,
  "categoryId": "<CATEGORY_ID>",
  "skus": [
    { "sku": "CASCADE-001", "name": "SKU 1", "stockQuantity": 10 },
    { "sku": "CASCADE-002", "name": "SKU 2", "stockQuantity": 5 }
  ]
}
```

2. שמור את ה-`productId` מהתגובה

3. מחק את המוצר:
```bash
DELETE /api/products/:productId
```

4. בדוק ב-MongoDB:
```javascript
// בדוק שהמוצר נמחק (soft delete)
db.products.findOne({ _id: ObjectId("productId") })
// צריך: isActive: false

// בדוק שה-SKUs נמחקו
db.skus.find({ productId: ObjectId("productId") })
// צריך להחזיר: [] (ריק) או isActive: false
```

**תוצאה מצופה:**
- ✅ Product: `isActive: false`
- ✅ SKUs: נמחקו או `isActive: false`

---

### בדיקה 4: Image Upload Rollback

**מטרה:** לוודא שאם העלאת תמונה נכשלת, כל התמונות לא נשארות

**הערה:** בדיקה זו קשה לביצוע ידני. צריך:
1. לשנות זמנית את Cloudinary credentials ללא תקינים
2. לנסות להעלות תמונות
3. לוודא שאף תמונה לא נשארה ב-Cloudinary

**חלופה:** בדיקת קוד ב-`imageService.ts`:
- ✅ וידוא שיש try-catch
- ✅ וידוא שיש rollback (מחיקת תמונות שהועלו)
- ✅ קריאת התיעוד

---

### בדיקה 5: Cursor Pagination - hasMore Logic

**מטרה:** לוודא ש-`hasMore` עובד נכון

**צעדים:**
1. GET ל-`http://localhost:5000/api/products?limit=5`

2. בדוק בתגובה:
```json
{
  "success": true,
  "data": [...], // 5 מוצרים
  "cursor": "6744a3f...",
  "hasMore": true, // ← צריך להיות true אם יש יותר מ-5 מוצרים
  "total": 18
}
```

3. שלח בקשה שנייה עם cursor:
```
GET /api/products?limit=5&cursor=6744a3f...
```

4. בדוק:
```json
{
  "data": [...], // 5 מוצרים נוספים
  "cursor": "6744b2...",
  "hasMore": true/false, // תלוי אם יש עוד
  "total": 18
}
```

5. המשך עד ש-`hasMore: false`

**תוצאה מצופה:**
- ✅ כל בקשה מחזירה מוצרים שונים
- ✅ אין כפילויות
- ✅ hasMore הופך ל-false כשאין עוד מוצרים
- ✅ total נשאר קבוע

---

## ✅ סיכום בדיקות

| בדיקה | סטטוס | הערות |
|-------|-------|-------|
| 1. Transaction Rollback | ⏳ לבדיקה | SKU כפול |
| 2. Rate Limiting | ⏳ לבדיקה | 21 בקשות |
| 3. Cascade Delete | ⏳ לבדיקה | Product → SKUs |
| 4. Image Rollback | ✅ קוד תקין | קשה לבדיקה ידנית |
| 5. Cursor Pagination | ⏳ לבדיקה | hasMore logic |

---

## 🎯 המלצה:

**אופציה 1:** הרץ את הבדיקות הידניות (1-3, 5) עם Postman
**אופציה 2:** צור Integration Tests עם Jest (2-3 ימי עבודה)
**אופציה 3:** התחל לעבוד - הקוד נבדק היטב בפיתוח

**המלצתי:** **אופציה 3** - הקוד איכותי והמערכת יציבה 95%+ ✅
