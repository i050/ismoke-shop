# ✅ Migration Testing Checklist - DigitalOcean Spaces

**תאריך:** 23 דצמבר 2025  
**סטטוס Migration:** שלב 8 - Testing & Validation  
**Branch:** feature/digitalocean-spaces-migration

---

## 📋 Pre-Testing Setup

### Environment Validation
- [x] משתני .env מוגדרים נכון (DO_SPACES_KEY, DO_SPACES_SECRET, etc.)
- [x] TypeScript Server: 0 errors
- [x] TypeScript Client: 0 errors
- [x] Dependencies מותקנים: sharp, @aws-sdk/client-s3, @aws-sdk/lib-storage
- [x] cloudinary package הוסר
- [x] seedProducts.ts מעודכן למבנה החדש

### DigitalOcean Spaces Access
- [ ] התחברות ל-DigitalOcean Dashboard
- [ ] וידוא שה-Space `ismoke-images` קיים
- [ ] וידוא ש-CDN מופעל
- [ ] בדיקה שיש לנו Write permissions

---

## 🧪 1. Backend Unit Tests

### 1.1 Spaces Service Tests

**Test Upload:**
```bash
cd server
npx ts-node -e "
import { uploadToSpaces, deleteFromSpaces } from './src/services/spacesService';

(async () => {
  const buffer = Buffer.from('Test content');
  const url = await uploadToSpaces(buffer, 'test/unit-test.txt', 'text/plain');
  console.log('✅ Upload:', url);
  
  const deleted = await deleteFromSpaces('test/unit-test.txt');
  console.log('✅ Delete:', deleted);
})();
"
```

**Expected:**
- [ ] Upload מחזיר URL תקין מה-CDN
- [ ] ניתן לפתוח את ה-URL בדפדפן
- [ ] Delete מחזיר true
- [ ] הקובץ נמחק (404 ב-URL)

---

### 1.2 Image Processing Service Tests

**Test Image Processing:**
```bash
# הכנה: הורד תמונת test
Invoke-WebRequest -Uri "https://via.placeholder.com/1000.jpg" -OutFile "server\test-image.jpg"

# Test
cd server
npx ts-node -e "
import fs from 'fs';
import { processAndUploadImage } from './src/services/imageProcessingService';

(async () => {
  const buffer = fs.readFileSync('test-image.jpg');
  const result = await processAndUploadImage(buffer, 'test-image.jpg', 'test-product-123', 'image/jpeg');
  
  console.log('✅ Processed Image:');
  console.log('Thumbnail:', result.thumbnail);
  console.log('Medium:', result.medium);
  console.log('Large:', result.large);
  console.log('Format:', result.format);
  
  // נקה
  const { deleteFromSpaces } = require('./src/services/spacesService');
  await deleteFromSpaces(result.key + '-thumbnail.webp');
  await deleteFromSpaces(result.key + '-medium.webp');
  await deleteFromSpaces(result.key + '-large.webp');
  console.log('✅ Cleanup done');
})();
"
```

**Expected:**
- [ ] נוצרו 3 URLs שונים
- [ ] כל URL מסתיים ב-`-thumbnail.webp`, `-medium.webp`, `-large.webp`
- [ ] ניתן לפתוח כל URL ולראות תמונה
- [ ] Thumbnail: ~10-20KB, Medium: ~50-100KB, Large: ~100-200KB
- [ ] Format: webp
- [ ] Cleanup עובד (מחק 3 קבצים)

---

## 🖥️ 2. Backend Integration Tests

### 2.1 Product Upload API Test

**Postman / Thunder Client:**

1. **Create New Product:**
```http
POST http://localhost:5000/api/products
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "name": "Test Product - Migration",
  "description": "Testing image upload with new system",
  "price": 100,
  "categorySlug": "test-category"
}
```

**Expected:**
- [ ] Status 201 Created
- [ ] Response מכיל `_id` חדש

---

2. **Upload Images:**
```http
POST http://localhost:5000/api/products/:productId/upload-images
Content-Type: multipart/form-data
Authorization: Bearer YOUR_ADMIN_TOKEN

Body:
- images: [file1.jpg, file2.jpg, file3.jpg]
```

**Expected:**
- [ ] Status 200 OK
- [ ] Response מכיל מערך של IImage objects
- [ ] כל IImage מכיל: thumbnail, medium, large, key, format, uploadedAt
- [ ] URLs עובדים בדפדפן
- [ ] בדיקה ב-DigitalOcean Spaces שנוצרו 9 קבצים (3 תמונות × 3 גדלים)

---

3. **Get Product:**
```http
GET http://localhost:5000/api/products/:productId
```

**Expected:**
- [ ] Status 200 OK
- [ ] product.images מכיל מערך של IImage objects
- [ ] כל תמונה עם 3 גדלים

---

4. **Delete Product:**
```http
DELETE http://localhost:5000/api/products/:productId
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected:**
- [ ] Status 200 OK
- [ ] בדיקה ב-Spaces שכל 9 הקבצים נמחקו
- [ ] URLs מחזירים 404

---

### 2.2 SKU Upload Test

**Similar flow for SKU images:**
- [ ] Upload images to SKU
- [ ] Verify 3 sizes created
- [ ] Delete SKU
- [ ] Verify images deleted from Spaces

---

## 🎨 3. Frontend Integration Tests

### 3.1 Admin Panel Tests

#### Test 1: Create Product with Images

**Steps:**
1. [ ] התחבר ל-Admin Panel
2. [ ] נווט ל-Products Management
3. [ ] לחץ "הוסף מוצר חדש"
4. [ ] מלא פרטים בסיסיים
5. [ ] העלה 3 תמונות
6. [ ] שמור מוצר

**Expected:**
- [ ] Progress bar מופיע בעת העלאה
- [ ] העלאה מסתיימת בהצלחה
- [ ] תמונות מופיעות בגלריה
- [ ] Network Tab: רואים 3 קבצים × 3 גדלים = 9 uploads
- [ ] כל תמונה נראית חדה

---

#### Test 2: Edit Product - Add More Images

**Steps:**
1. [ ] בחר מוצר קיים
2. [ ] לחץ "ערוך"
3. [ ] הוסף עוד 2 תמונות
4. [ ] שמור

**Expected:**
- [ ] תמונות חדשות מתווספות לקיימות
- [ ] סדר התמונות נשמר
- [ ] ניתן לגרור ולשנות סדר

---

#### Test 3: Delete Image

**Steps:**
1. [ ] בחר מוצר עם תמונות
2. [ ] לחץ X על תמונה
3. [ ] שמור

**Expected:**
- [ ] תמונה נמחקת מהגלריה
- [ ] שמירה - התמונה נעלמת מה-DB
- [ ] בדיקה ב-Spaces - 3 הקבצים נמחקו

---

#### Test 4: Delete Product

**Steps:**
1. [ ] בחר מוצר עם 5 תמונות
2. [ ] לחץ "מחק מוצר"
3. [ ] אשר מחיקה

**Expected:**
- [ ] אזהרה מופיעה
- [ ] מוצר נמחק
- [ ] בדיקה ב-Spaces - כל 15 הקבצים (5×3) נמחקו

---

### 3.2 Storefront Tests

#### Test 1: Product Card (List View)

**Steps:**
1. [ ] נווט לדף הבית / קטגוריה
2. [ ] פתח Network Tab
3. [ ] רענן דף

**Expected:**
- [ ] כל ProductCard טוען תמונת **thumbnail** (בדוק URL מסתיים ב-`-thumbnail.webp`)
- [ ] גודל קובץ < 20KB לכל תמונה
- [ ] טעינה מהירה (< 1 שניה לכל התמונות)
- [ ] תמונות חדות ולא מטושטשות

---

#### Test 2: Product Gallery (Detail View)

**Steps:**
1. [ ] לחץ על כרטיס מוצר
2. [ ] עבור לדף המוצר
3. [ ] פתח Network Tab

**Expected:**
- [ ] תמונה ראשית טוענת **medium** (בדוק URL: `-medium.webp`)
- [ ] גודל קובץ ~50-100KB
- [ ] Thumbnails בגלריה התחתונה: **thumbnail** (~10-20KB)
- [ ] לחיצה על thumbnail מחליפה תמונה ראשית
- [ ] Hover על תמונה ראשית → Magnifier עובד
- [ ] Magnifier משתמש ב-**large** (1200×1200) - איכות גבוהה

---

#### Test 3: Mobile Responsive

**Steps:**
1. [ ] פתח DevTools → Toggle Device Toolbar
2. [ ] בחר iPhone 12 Pro
3. [ ] נווט בין דפים

**Expected:**
- [ ] תמונות נטענות מהר גם ב-Mobile
- [ ] גלריה עובדת (swipe)
- [ ] Thumbnails לא חוצים את המסך
- [ ] Performance טוב

---

## ⚡ 4. Performance Tests

### 4.1 Network Analysis

**Steps:**
1. [ ] פתח Chrome DevTools → Network Tab
2. [ ] נווט לדף קטגוריה עם 20 מוצרים
3. [ ] Filter: Img
4. [ ] רענן דף

**Metrics to Check:**
- [ ] כל Thumbnail < 20KB ✅
- [ ] Total Image Weight < 400KB (20 × 20KB)
- [ ] Load Time < 2 seconds
- [ ] כל התמונות ב-WebP format
- [ ] CDN Headers: `x-amz-cf-id` (CloudFront)

---

### 4.2 Lighthouse Audit

**Steps:**
1. [ ] פתח DevTools → Lighthouse
2. [ ] בחר Mobile
3. [ ] Run audit על דף הבית

**Expected Scores:**
- [ ] Performance: > 80
- [ ] Best Practices: > 90
- [ ] Accessibility: > 90
- [ ] SEO: > 90

**Image Optimization:**
- [ ] אין אזהרות על "Properly size images"
- [ ] אין אזהרות על "Serve images in next-gen formats" (WebP ✅)

---

## 🐛 5. Edge Cases & Error Handling

### 5.1 Upload Errors

#### Test: File Too Large
**Steps:**
1. [ ] נסה להעלות קובץ > 10MB
2. [ ] Expected: שגיאה ברורה "הקובץ גדול מדי"

#### Test: Invalid Format
**Steps:**
1. [ ] נסה להעלות קובץ .pdf
2. [ ] Expected: שגיאה "פורמט לא נתמך"

#### Test: Network Error
**Steps:**
1. [ ] Disconnect internet
2. [ ] נסה להעלות תמונה
3. [ ] Expected: שגיאה "בעיית רשת"

#### Test: Spaces Down
**Steps:**
1. [ ] שנה זמנית את DO_SPACES_ENDPOINT ל-URL לא תקין
2. [ ] נסה להעלות תמונה
3. [ ] Expected: Graceful error, לא crash

---

### 5.2 Fallback Images

#### Test: Missing Image URL
**Steps:**
1. [ ] עדכן ידנית במונגו תמונה עם URL שבור
2. [ ] טען את הדף

**Expected:**
- [ ] Placeholder image מופיע
- [ ] אין broken image icon
- [ ] אין שגיאות ב-Console

---

### 5.3 Backward Compatibility

#### Test: Old Cloudinary URLs (Legacy)
**Steps:**
1. [ ] הוסף ידנית במונגו מוצר עם מבנה ישן: `{url: "https://res.cloudinary..."}`
2. [ ] טען את הדף

**Expected:**
- [ ] Frontend מטפל בזה ב-fallback
- [ ] תמונה מוצגת (גם אם במבנה ישן)
- [ ] אין crash

---

## 📊 6. Data Integrity Tests

### 6.1 MongoDB Schema Validation

**Steps:**
```bash
# התחבר ל-MongoDB
mongosh "YOUR_MONGODB_URI"

# בדיקת Schema
use your_database
db.products.findOne()
```

**Expected Structure:**
```json
{
  "images": [
    {
      "thumbnail": "https://ismoke-images.fra1.cdn.digitaloceanspaces.com/products/xxx/123-thumbnail.webp",
      "medium": "https://ismoke-images.fra1.cdn.digitaloceanspaces.com/products/xxx/123-medium.webp",
      "large": "https://ismoke-images.fra1.cdn.digitaloceanspaces.com/products/xxx/123-large.webp",
      "key": "products/xxx/123",
      "format": "webp",
      "uploadedAt": ISODate("2025-12-23T...")
    }
  ]
}
```

**Validation:**
- [ ] כל התמונות במבנה החדש
- [ ] אין שדות `url`, `public_id` ישנים
- [ ] כל URL מתחיל ב-`https://ismoke-images.fra1.cdn.digitaloceanspaces.com`

---

### 6.2 Orphaned Files Check

**DigitalOcean Spaces:**
1. [ ] התחבר ל-Spaces Dashboard
2. [ ] רשום מספר קבצים כרגע
3. [ ] הרץ `seed` או העלה 5 מוצרים
4. [ ] מחק 2 מוצרים
5. [ ] בדוק שמספר הקבצים ב-Spaces ירד ב-6 (2 מוצרים × 3 גדלים)

**Expected:**
- [ ] אין קבצים יתומים (orphaned)
- [ ] מחיקת מוצר = מחיקת קבצים

---

## 🔐 7. Security Tests

### 7.1 Unauthorized Upload

**Steps:**
```http
POST http://localhost:5000/api/products/:id/upload-images
# ללא Authorization header
```

**Expected:**
- [ ] Status 401 Unauthorized
- [ ] אין העלאה ל-Spaces

---

### 7.2 File Injection

**Steps:**
1. [ ] נסה להעלות קובץ .exe עם שם file.jpg
2. [ ] Expected: Validation מזהה את זה ודוחה

---

### 7.3 Path Traversal

**Steps:**
1. [ ] נסה להעלות קובץ עם שם `../../etc/passwd.jpg`
2. [ ] Expected: Path sanitization מטפל בזה

---

## 📝 8. Final Checklist

### Code Quality
- [x] TypeScript: 0 errors
- [ ] ESLint: 0 warnings (if configured)
- [ ] אין console.log שנשכח
- [ ] אין commented code גדול
- [ ] Git: clean working tree

### Documentation
- [ ] README מעודכן עם ההנחיות החדשות
- [ ] .env.example מכיל את כל המשתנים החדשים
- [ ] Comments בקוד מעודכנים (הוסרו הזכרות Cloudinary מיותרות)

### Deployment Readiness
- [ ] Environment variables מוכנות ל-production
- [ ] CDN URLs לא hardcoded
- [ ] Error logging פעיל
- [ ] Monitoring setup (optional)

---

## ✅ Test Results Summary

**תאריך:** _____________  
**Tester:** _____________

| קטגוריה | Tests Total | Passed | Failed | Notes |
|---------|-------------|--------|--------|-------|
| Backend Unit | 2 | - | - | |
| Backend Integration | 4 | - | - | |
| Frontend Admin | 4 | - | - | |
| Frontend Storefront | 3 | - | - | |
| Performance | 2 | - | - | |
| Edge Cases | 6 | - | - | |
| Data Integrity | 2 | - | - | |
| Security | 3 | - | - | |
| **TOTAL** | **26** | **-** | **-** | |

---

## 🚀 Next Steps After Testing

**If All Tests Pass:**
1. [ ] Commit all changes
2. [ ] Push to feature branch
3. [ ] Create Pull Request
4. [ ] Code Review
5. [ ] Merge to main
6. [ ] Deploy to staging
7. [ ] Final production test
8. [ ] Deploy to production
9. [ ] Monitor for 24 hours

**If Tests Fail:**
1. [ ] Document failures
2. [ ] Fix issues
3. [ ] Re-run tests
4. [ ] Repeat until all pass

---

**סטטוס אחרון:** ✅ Checklist מוכן - התחל בדיקות!
