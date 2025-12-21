# מדריך מיגרציה: העברת size ממאפיין מובנה למאפיין דינמי

## 📋 תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [הכנה](#הכנה)
3. [שלב 1: עדכון מודל השרת](#שלב-1-עדכון-מודל-השרת)
4. [שלב 2: יצירת סקריפט מיגרציה](#שלב-2-יצירת-סקריפט-מיגרציה)
5. [שלב 3: הרצת המיגרציה](#שלב-3-הרצת-המיגרציה)
6. [שלב 4: עדכון ולידציה](#שלב-4-עדכון-ולידציה)
7. [שלב 5: עדכון Controllers](#שלב-5-עדכון-controllers)
8. [שלב 6: עדכון Services](#שלב-6-עדכון-services)
9. [שלב 7: עדכון טיפוסים בלקוח](#שלב-7-עדכון-טיפוסים-בלקוח)
10. [שלב 8: עדכון סכמת Yup](#שלב-8-עדכון-סכמת-yup)
11. [שלב 9: עדכון AddSKUModal](#שלב-9-עדכון-addskumodal)
12. [שלב 10: עדכון SKURow](#שלב-10-עדכון-skurow)
13. [שלב 11: עדכון ProductForm](#שלב-11-עדכון-productform)
14. [שלב 12: עדכון Cart Store](#שלב-12-עדכון-cart-store)
15. [שלב 13: בדיקות](#שלב-13-בדיקות)
16. [שלב 14: ניקוי וסיום](#שלב-14-ניקוי-וסיום)

---

## סקירה כללית

### מטרה
להפוך את `size` ממאפיין **מובנה** (top-level field) למאפיין **דינמי** שהמנהל מוסיף דרך מערכת ה-FilterAttributes.

### סיבה
- **עקביות**: size יתנהג כמו כל מאפיין אחר (material, weight...)
- **גמישות**: מנהל יכול להוסיף/להסיר מאפיינים בלי לשנות קוד
- **פשטות**: פחות בדיקות מיוחדות בקוד
- **סקלאביליות**: הוספת מאפיינים חדשים לא דורשת שינויי קוד

### ⚠️ נקודות קריטיות למניעת שבירה
- **Backward Compatibility**: נשמור תמיכה זמנית בשדה `size` ברמה עליונה
- **API Compatibility**: השרת ימשיך לקבל ולהחזיר `size` דרך שכבת תאימות
- **אינדקסים**: נוסיף אינדקסים חדשים לפני מחיקת הישנים
- **Gradual Rollout**: מעבר מבוקר בשלבים עם נקודות בדיקה

### מצב נוכחי
```typescript
// לפני
interface ISku {
  color?: string;  // מובנה
  size?: string;   // מובנה ❌
  attributes: { [key: string]: any };
}
```

### מצב רצוי
```typescript
// אחרי
interface ISku {
  color?: string;  // מובנה ✅ (יש לו לוגיקה מיוחדת)
  attributes: {    // size כאן ✅
    size?: string;
    [key: string]: any;
  };
}
```

---

## הכנה

### דרישות מקדימות
- ✅ Node.js מותקן
- ✅ MongoDB רץ
- ✅ הפרויקט מקומפל ועובד
- ✅ נתוני דמה בלבד (אין צורך בגיבוי)

### כלים נדרשים
```bash
# ודא שהכל מעודכן
cd server
npm install

cd ../client
npm install
```

### בדיקת מצב נוכחי
```bash
# בדוק כמה SKUs קיימים עם size
cd server
npm run dev

# בטרמינל נוסף - בדוק ב-MongoDB
mongosh
use ecommerce_db
db.skus.countDocuments({ size: { $exists: true } })
```

---

## שלב 1: הוספת שכבת תאימות (Compatibility Layer)

### מטרה
להבטיח שהשרת ימשיך לקבל ולהחזיר `size` בזמן המעבר, כך שלקוחות ישנים לא יישברו.

### 1.1 הוספת Virtual Property ל-Sku Model
**קובץ:** `server/src/models/Sku.ts`
**מיקום:** אחרי הגדרת הסכמה, לפני יצוא המודל

```typescript
/**
 * Virtual property: size
 * מחזיר את attributes.size כאילו הוא שדה רגיל
 * מאפשר תאימות לאחור עם קוד שמצפה ל-sku.size
 */
SkuSchema.virtual('size').get(function () {
  return this.attributes?.size;
});

// הגדרות תצוגה - כולל virtuals בJSON ובObject
SkuSchema.set('toJSON', { virtuals: true });
SkuSchema.set('toObject', { virtuals: true });
```

### 1.2 יצירת Middleware למיפוי Request Body
**קובץ חדש:** `server/src/middleware/sizeCompatibility.ts`

```typescript
/**
 * Middleware למיפוי size compatibility
 * ממיר size ברמה עליונה ל-attributes.size
 * מאפשר ללקוחות ישנים להמשיך לשלוח size בטופ-לבל
 */

import { Request, Response, NextFunction } from 'express';

/**
 * ממיר req.body.size -> req.body.attributes.size
 * שומר על תאימות לאחור עם API ישן
 */
export function mapSizeToAttributes(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // אם יש size בבקשה וזה POST/PUT/PATCH
  if (req.body && req.body.size !== undefined) {
    console.log(`[Size Compatibility] Mapping size="${req.body.size}" to attributes.size`);
    
    // יצירת attributes אם לא קיים
    if (!req.body.attributes) {
      req.body.attributes = {};
    }
    
    // העברת size ל-attributes (רק אם לא קיים שם כבר)
    if (!req.body.attributes.size) {
      req.body.attributes.size = req.body.size;
    }
    
    // הסרת size מהרמה העליונה
    delete req.body.size;
  }
  
  // טיפול ב-SKUs array (במקרה של יצירת/עדכון מוצר עם SKUs)
  if (req.body && req.body.skus && Array.isArray(req.body.skus)) {
    req.body.skus = req.body.skus.map((sku: any) => {
      if (sku.size !== undefined) {
        if (!sku.attributes) sku.attributes = {};
        if (!sku.attributes.size) {
          sku.attributes.size = sku.size;
        }
        delete sku.size;
      }
      return sku;
    });
  }
  
  next();
}

/**
 * ממיר query parameter ?size=M -> filter['attributes.size']
 * שומר על תאימות לאחור עם חיפושים ישנים
 */
export function mapSizeQueryParam(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.query.size) {
    console.log(`[Size Compatibility] Mapping query size="${req.query.size}" to attributes.size`);
    // נשמור את זה ב-req object לשימוש ב-controller
    (req as any).mappedSizeFilter = { 'attributes.size': req.query.size };
  }
  next();
}
```

### 1.3 הוספת Middleware ל-Routes
**קובץ:** `server/src/routes/productRoutes.ts` וגם `server/src/routes/skuRoutes.ts`

```typescript
import { mapSizeToAttributes, mapSizeQueryParam } from '../middleware/sizeCompatibility';

// הוספה לכל route שמקבל body עם SKU
router.post('/products', mapSizeToAttributes, createProduct);
router.put('/products/:id', mapSizeToAttributes, updateProduct);

// הוספה לכל route חיפוש
router.get('/skus/search', mapSizeQueryParam, searchSkus);
router.get('/products', mapSizeQueryParam, getProducts);
```

### 1.4 שמירה ובדיקה
```bash
cd server
npm run build

# בדוק שאין שגיאות TypeScript
```

**✅ שלב 1 הושלם** - שכבת תאימות נוספה

---

## שלב 2: הוספת אינדקס חדש (לפני מחיקת הישן)

## שלב 2: הוספת אינדקס חדש (לפני מחיקת הישן)

### מטרה
להוסיף אינדקס על `attributes.size` כדי להבטיח ביצועים טובים לפני מחיקת האינדקס הישן.

### 2.1 הוספת אינדקס חדש
**קובץ:** `server/src/models/Sku.ts`
**מיקום:** בסקציית האינדקסים (אחרי שורה ~165)

```typescript
/**
 * אינדקסים מורכבים (Compound Indexes)
 */

// אינדקס משולב על productId + isActive - לשליפת SKUs פעילים של מוצר
SkuSchema.index({ productId: 1, isActive: 1 });

// ✅ אינדקס חדש: color מובנה + size דינמי
// נוסף לפני מחיקת האינדקס הישן כדי להבטיח ביצועים
SkuSchema.index({ color: 1, 'attributes.size': 1 }, { background: true });

// ⚠️ אינדקס ישן: ייוסר בשלב 5 (אחרי אימות שהחדש עובד)
SkuSchema.index({ color: 1, size: 1 });

// אינדקס משולב על attributes נפוצים (תאימות לאחור)
SkuSchema.index({ 'attributes.color': 1, 'attributes.size': 1 });

// אינדקס לחיפוש מלאי זמין (במלאי + פעיל)
SkuSchema.index({ stockQuantity: 1, isActive: 1 });

// אינדקס משולב על colorFamily + isActive
SkuSchema.index({ colorFamily: 1, isActive: 1 });
```

### 2.2 בניית אינדקס ברקע
```bash
# התחבר ל-MongoDB
mongosh
use ecommerce_db

# בנה אינדקס ברקע (לא חוסם פעולות)
db.skus.createIndex({ color: 1, "attributes.size": 1 }, { background: true })

# בדוק שהאינדקס נבנה
db.skus.getIndexes()

# בדוק ביצועים
db.skus.find({ color: "blue", "attributes.size": "M" }).explain("executionStats")
```

**✅ שלב 2 הושלם** - אינדקס חדש נוסף

---

## שלב 3: עדכון מודל השרת

### קובץ: `server/src/models/Sku.ts`

#### 3.1 הסרת שדה size מהממשק
**מיקום:** שורה ~32

```typescript
// 🔴 למחוק את השורה הזו:
size?: string; // מידה (שדה שטוח)

// התוצאה:
export interface ISku {
  sku: string;
  productId: mongoose.Types.ObjectId;
  name: string;
  price?: number | null;
  stockQuantity: number;
  color?: string; // ✅ נשאר - יש לו לוגיקה מיוחדת
  // size הוסר ❌ (יהיה ב-attributes ו-virtual)
  attributes: {
    [key: string]: any; // ✅ size יהיה כאן
  };
  colorFamily?: string;
  colorFamilySource?: 'auto' | 'manual' | 'import';
  images?: IImage[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

#### 3.2 הסרת שדה size מהסכמה
**מיקום:** שורה ~115

```typescript
// 🔴 למחוק את הבלוק הזה:
size: {
  type: String,
  required: false,
  trim: true,
},

// ✅ color נשאר, attributes נשאר
color: {
  type: String,
  required: false,
  trim: true,
},

attributes: {
  type: Schema.Types.Mixed,
  default: {},
},
```

#### 3.3 ⚠️ אל תמחק את האינדקס הישן עדיין
**הערה חשובה:** האינדקס `{ color: 1, size: 1 }` יימחק רק בשלב 8 (אחרי אימות).

#### 3.4 שמירת הקובץ
```bash
# שמור את הקובץ
# בדוק שאין שגיאות TypeScript
cd server
npm run build
```

**✅ שלב 3 הושלם** - מודל Sku עודכן (אך שכבת תאימות נשמרה)

---

## שלב 4: יצירת סקריפט מיגרציה

```typescript
// 🔴 למחוק את השורה הזו:
size?: string; // מידה (שדה שטוח)

// התוצאה:
export interface ISku {
  sku: string;
  productId: mongoose.Types.ObjectId;
  name: string;
  price?: number | null;
  stockQuantity: number;
  color?: string; // ✅ נשאר - יש לו לוגיקה מיוחדת
  // size הוסר ❌
  attributes: {
    [key: string]: any; // ✅ size יהיה כאן
  };
  colorFamily?: string;
  colorFamilySource?: 'auto' | 'manual' | 'import';
  images?: IImage[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
```

#### 1.2 הסרת שדה size מהסכמה
**מיקום:** שורה ~115

```typescript
// 🔴 למחוק את הבלוק הזה:
// שדות אטריביוטים שטוחים (Phase: Flat Attributes)
color: {
  type: String,
  required: false,
  trim: true,
},

size: {  // ← למחוק את כל הבלוק הזה
  type: String,
  required: false,
  trim: true,
},

// ✅ להשאיר רק:
color: {
  type: String,
  required: false,
  trim: true,
},

// attributes יישאר ללא שינוי
attributes: {
  type: Schema.Types.Mixed,
  default: {},
},
```

#### 1.3 עדכון אינדקסים
**מיקום:** שורה ~165

```typescript
// 🔴 למחוק את האינדקס הזה:
// אינדקס משולב על שדות שטוחים color ו-size
SkuSchema.index({ color: 1, size: 1 });

// 🔴 למחוק גם את האינדקס הזה:
// אינדקס משולב על attributes נפוצים (תאימות לאחור)
SkuSchema.index({ 'attributes.color': 1, 'attributes.size': 1 });

// ✅ להוסיף אינדקס חדש:
// אינדקס משולב על color מובנה ו-size דינמי
SkuSchema.index({ color: 1, 'attributes.size': 1 });
```

#### 1.4 שמירת הקובץ
```bash
# שמור את הקובץ
# בדוק שאין שגיאות TypeScript
cd server
npm run build
```

**✅ שלב 1 הושלם** - מודל Sku עודכן

---

## שלב 4: יצירת סקריפט מיגרציה

### 4.1 יצירת הקובץ
**קובץ חדש:** `server/src/scripts/migrate-size-to-attributes.ts`

```typescript
/**
 * סקריפט מיגרציה: העברת size -> attributes.size
 * 
 * מטרה: להעביר את שדה size ממאפיין מובנה (top-level) 
 * למאפיין דינמי בתוך attributes
 * 
 * שימוש:
 * npm run migrate:size           # הרצה רגילה
 * npm run migrate:size -- --dry-run  # הרצת ניסיון (לא משנה DB)
 */

import mongoose from 'mongoose';
import { Sku } from '../models/Sku';
import { connectDB } from '../config/db';

interface MigrationStats {
  total: number;
  withSize: number;
  migrated: number;
  skipped: number;
  conflicts: number;
  failed: number;
  errors: Array<{ sku: string; error: string }>;
  conflictDetails: Array<{ sku: string; topLevel: string; attributes: string }>;
}

async function migrateSizeToAttributes() {
  // בדיקה אם זה dry-run
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🚀 מתחיל מיגרציה: size -> attributes.size');
  console.log(isDryRun ? '⚠️  מצב DRY-RUN - לא ישנה נתונים\n' : '✅ מצב הרצה מלא\n');

  try {
    // חיבור למסד נתונים
    await connectDB();
    console.log('✅ התחברות למסד נתונים הצליחה\n');

    const stats: MigrationStats = {
      total: 0,
      withSize: 0,
      migrated: 0,
      skipped: 0,
      conflicts: 0,
      failed: 0,
      errors: [],
      conflictDetails: [],
    };

    // ספירת כלל ה-SKUs
    stats.total = await Sku.countDocuments();
    console.log(`📦 סך הכל SKUs במערכת: ${stats.total}`);

    // מציאת כל SKUs עם שדה size מובנה
    const skusWithSize = await Sku.find({ 
      size: { $exists: true, $ne: null } 
    });

    stats.withSize = skusWithSize.length;
    console.log(`🔍 נמצאו ${stats.withSize} SKUs עם שדה size\n`);

    if (stats.withSize === 0) {
      console.log('✨ אין SKUs למיגרציה - הכל כבר מעודכן!');
      process.exit(0);
    }

    console.log(isDryRun ? '🔄 מדמה עיבוד...\n' : '🔄 מתחיל עיבוד...\n');

    // עיבוד כל SKU
    for (let i = 0; i < skusWithSize.length; i++) {
      const sku = skusWithSize[i];
      const progress = `[${i + 1}/${stats.withSize}]`;

      try {
        const topLevelSize = (sku as any).size;
        const attributesSize = sku.attributes?.size;

        // מקרה 1: יש conflict - גם top-level וגם attributes.size
        if (attributesSize && topLevelSize && attributesSize !== topLevelSize) {
          console.log(`⚠️  ${progress} SKU ${sku.sku}: CONFLICT! top-level="${topLevelSize}" vs attributes="${attributesSize}"`);
          stats.conflicts++;
          stats.conflictDetails.push({
            sku: sku.sku,
            topLevel: topLevelSize,
            attributes: attributesSize,
          });
          
          // מדיניות: נשמור את attributes.size (הוא בעדיפות)
          if (!isDryRun) {
            (sku as any).size = undefined;
            await sku.save();
            console.log(`   → נשמר attributes.size="${attributesSize}", הוסר top-level`);
          }
          stats.migrated++;
          continue;
        }

        // מקרה 2: כבר קיים attributes.size בלבד
        if (attributesSize && !topLevelSize) {
          console.log(`✓ ${progress} SKU ${sku.sku}: כבר קיים attributes.size="${attributesSize}" - מדלג`);
          stats.skipped++;
          continue;
        }

        // מקרה 3: יש רק top-level, צריך להעביר
        if (topLevelSize) {
          // יצירת attributes אם לא קיים
          if (!sku.attributes) {
            sku.attributes = {};
          }

          // העברת הערך
          sku.attributes.size = topLevelSize;

          // הסרת השדה המובנה
          if (!isDryRun) {
            (sku as any).size = undefined;
            await sku.save();
          }

          console.log(`✓ ${progress} SKU ${sku.sku}: ${isDryRun ? '[DRY-RUN] היה מעביר' : 'הועבר'} size="${topLevelSize}" -> attributes.size`);
          stats.migrated++;
        }

        // הצגת התקדמות כל 10 פריטים
        if ((i + 1) % 10 === 0) {
          console.log(`\n📊 התקדמות: ${i + 1}/${stats.withSize} (${Math.round(((i + 1) / stats.withSize) * 100)}%)\n`);
        }

      } catch (error) {
        console.error(`❌ ${progress} SKU ${sku.sku}: שגיאה -`, error);
        stats.failed++;
        stats.errors.push({
          sku: sku.sku,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // סיכום
    console.log('\n' + '='.repeat(60));
    console.log('📊 סיכום מיגרציה:');
    console.log('='.repeat(60));
    console.log(`✅ ${isDryRun ? 'היו מועברים' : 'הועברו'} בהצלחה:     ${stats.migrated}`);
    console.log(`⚠️  דולגו (כבר קיים):             ${stats.skipped}`);
    console.log(`🔀 conflicts (שני ערכים שונים):  ${stats.conflicts}`);
    console.log(`❌ נכשלו:                        ${stats.failed}`);
    console.log(`📦 סה"כ עובדו:                   ${stats.withSize}`);
    console.log('='.repeat(60));

    // הצגת conflicts
    if (stats.conflictDetails.length > 0) {
      console.log('\n🔀 פירוט Conflicts (נשמר attributes.size):');
      stats.conflictDetails.forEach(({ sku, topLevel, attributes }) => {
        console.log(`   - ${sku}: top="${topLevel}" vs attr="${attributes}"`);
      });
    }

    // הצגת שגיאות אם יש
    if (stats.errors.length > 0) {
      console.log('\n❌ שגיאות שנמצאו:');
      stats.errors.forEach(({ sku, error }) => {
        console.log(`   - ${sku}: ${error}`);
      });
    }

    if (!isDryRun) {
      // בדיקת נקיון - ודא שאין יותר SKUs עם size מובנה
      const remainingSize = await Sku.countDocuments({ 
        size: { $exists: true, $ne: null } 
      });

      console.log(`\n🔍 בדיקת נקיון: ${remainingSize} SKUs נותרו עם size מובנה`);

      if (remainingSize === 0) {
        console.log('✨ מיגרציה הושלמה בהצלחה מלאה!');
      } else {
        console.log('⚠️  עדיין יש SKUs עם size מובנה - בדוק שגיאות למעלה');
      }
    } else {
      console.log('\n💡 זה היה dry-run. הרץ ללא --dry-run כדי לבצע את השינויים.');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n💥 שגיאה קריטית במיגרציה:', error);
    process.exit(1);
  }
}

// הרצת המיגרציה
migrateSizeToAttributes();
```
```

### 4.2 הוספת הסקריפט ל-package.json
**קובץ:** `server/package.json`

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "migrate:size": "ts-node src/scripts/migrate-size-to-attributes.ts"
  }
}
```

**✅ שלב 4 הושלם** - סקריפט מיגרציה נוצר עם תמיכה ב-dry-run וזיהוי conflicts

---

## שלב 5: הרצת המיגרציה

### 5.1 הרצת Dry-Run (ניסיון)
```bash
cd server
npm run migrate:size -- --dry-run
```

### 5.2 בדיקת פלט ה-Dry-Run
```
🚀 מתחיל מיגרציה: size -> attributes.size
⚠️  מצב DRY-RUN - לא ישנה נתונים

✅ התחברות למסד נתונים הצליחה

📦 סך הכל SKUs במערכת: 45
🔍 נמצאו 23 SKUs עם שדה size

🔄 מדמה עיבוד...

✓ [1/23] SKU SHIRT-001: [DRY-RUN] היה מעביר size="M" -> attributes.size
⚠️  [2/23] SKU PANTS-002: CONFLICT! top-level="L" vs attributes="XL"
...
```

### 5.3 אם יש Conflicts - החלט על מדיניות
- **מדיניות ברירת מחדל**: שומרים `attributes.size` (הוא בעדיפות)
- אם צריך לשנות - ערוך את הסקריפט

### 5.4 הרצה מלאה (אחרי אישור)
```bash
cd server
npm run migrate:size
```

### 5.5 פלט צפוי
```
🚀 מתחיל מיגרציה: size -> attributes.size
✅ מצב הרצה מלא

...

============================================================
📊 סיכום מיגרציה:
============================================================
✅ הועברו בהצלחה:                    21
⚠️  דולגו (כבר קיים):                2
🔀 conflicts (שני ערכים שונים):      0
❌ נכשלו:                            0
📦 סה"כ עובדו:                       23
============================================================

🔍 בדיקת נקיון: 0 SKUs נותרו עם size מובנה
✨ מיגרציה הושלמה בהצלחה מלאה!
```

### 5.6 בדיקה ידנית ב-MongoDB
```bash
mongosh
use ecommerce_db

# בדוק שאין יותר size מובנה
db.skus.countDocuments({ size: { $exists: true } })
# צריך להחזיר: 0

# בדוק ש-attributes.size קיים
db.skus.countDocuments({ "attributes.size": { $exists: true } })
# צריך להחזיר: מספר ה-SKUs שהיו עם size

# הצג דוגמה
db.skus.findOne({ "attributes.size": { $exists: true } })
```

**✅ שלב 5 הושלם** - מיגרציה רצה בהצלחה עם זיהוי conflicts

---

## שלב 6: עדכון ולידציה

### קובץ: `server/src/middleware/productValidation.ts`

#### 4.1 הסרת ולידציה ל-size מובנה
**מיקום:** שורה ~200

```typescript
// 🔴 למחוק את הבלוק הזה:
size: Joi.string()
  .optional()
  .max(50)
  .trim()
  .allow('', null)
  .messages({
    'string.max': 'Size cannot exceed 50 characters',
  }),

// ✅ size יאומת דרך attributes (אם הוא required ב-FilterAttributes)
// אין צורך בולידציה מיוחדת - attributes הוא Mixed
```

#### 4.2 שמירה ובדיקה
```bash
cd server
npm run build
```

**✅ שלב 6 הושלם** - ולידציה עודכנה

---

## שלב 7: עדכון Controllers

### 7.1 קובץ: `server/src/controllers/skuController.ts`

#### עדכון attributeKeys
**מיקום:** שורה ~293

```typescript
// 🔴 לשנות מזה:
const attributeKeys = ['color', 'size'];

// ✅ לזה:
const attributeKeys = ['color']; // size כבר לא מובנה
```

#### עדכון חיפוש
**מיקום:** שורה ~295-310

```typescript
// 🔴 לשנות את הלוגיקה:
attributeKeys.forEach((key) => {
  const value = req.query[key];
  if (value && typeof value === 'string') {
    (filter as any)[key] = value;
  }
});

// ✅ לזה (טיפול נפרד ב-color ו-size):
// color נשאר מובנה
if (req.query.color && typeof req.query.color === 'string') {
  filter.color = req.query.color;
}

// size עובר ל-attributes (או משתמש במיפוי מה-middleware)
if ((req as any).mappedSizeFilter) {
  // אם ה-middleware כבר ממופה
  Object.assign(filter, (req as any).mappedSizeFilter);
} else if (req.query.size && typeof req.query.size === 'string') {
  // fallback
  filter['attributes.size'] = req.query.size;
}
```

### 7.2 קובץ: `server/src/controllers/productController.ts`

#### עדכון הדפסות debug
**מיקום:** שורות ~338, ~357

```typescript
// 🔴 לשנות מזה:
console.log(`     size: ${sku.size || 'לא מוגדר'}`);

// ✅ לזה:
console.log(`     size: ${sku.attributes?.size || 'לא מוגדר'}`);
```

### 7.3 עדכון קבצי בדיקה וסקריפטים
**קבצים:** 
- `server/src/scripts/testProductCRUD.ts`
- `server/src/seedProducts.ts`
- `server/checkColors.js`

עדכן כל התייחסות ל-`sku.size` → `sku.attributes?.size`

### 7.4 שמירה ובדיקה
```bash
cd server
npm run build
```

**✅ שלב 7 הושלם** - Controllers וסקריפטים עודכנו

---

## שלב 8: עדכון Services

### 8.1 קובץ: `server/src/services/skuService.ts`

#### עדכון הערות
**מיקום:** שורות ~361, ~386

```typescript
// 🔴 לשנות מזה:
// יצירת SKU חדש עם שדות שטוחים (color, size)

// ✅ לזה:
// יצירת SKU חדש עם שדות שטוחים (color) ו-attributes דינמיים
```

### 8.2 קובץ: `server/src/services/cartService.ts`

#### עדכון יצירת variant
**מיקום:** שורות ~214-218

```typescript
// 🔴 לשנות מזה:
if (skuDoc.color || skuDoc.size) {
  populatedItem.variant = {
    color: skuDoc.color,
    size: skuDoc.size,
  };
}

// ✅ לזה:
if (skuDoc.color || skuDoc.attributes?.size) {
  populatedItem.variant = {
    color: skuDoc.color,
    size: skuDoc.attributes?.size,
  };
}
```

**מיקום:** שורות ~239-243

```typescript
// 🔴 לשנות מזה:
variant: (skuDoc.color || skuDoc.size) ? {
  color: skuDoc.color,
  size: skuDoc.size,
} : undefined,

// ✅ לזה:
variant: (skuDoc.color || skuDoc.attributes?.size) ? {
  color: skuDoc.color,
  size: skuDoc.attributes?.size,
} : undefined,
```

**מיקום:** שורות ~303-307

```typescript
// 🔴 לשנות מזה:
if (skuDoc.color || skuDoc.size) {
  populatedSku.variant = {
    color: skuDoc.color,
    size: skuDoc.size,
  };
}

// ✅ לזה:
if (skuDoc.color || skuDoc.attributes?.size) {
  populatedSku.variant = {
    color: skuDoc.color,
    size: skuDoc.attributes?.size,
  };
}
```

### 8.3 קובץ: `server/src/services/filterAttributeService.ts`

#### עדכון הערה
**מיקום:** שורה ~155

```typescript
// 🔴 לשנות מזה:
// בדיקה אם השדה קיים ברמה העליונה (color, size)

// ✅ לזה:
// בדיקה אם השדה קיים ברמה העליונה (color) או ב-attributes (size וכו')
```

### 8.4 שמירה ובדיקה
```bash
cd server
npm run build
npm run dev  # וודא שהשרת עולה ללא שגיאות
```

**✅ שלב 8 הושלם** - Services עודכנו

---

## שלב 9: עדכון טיפוסים בלקוח

### קובץ: `client/src/types/Product.ts`

#### 9.1 הסרת size מובנה
**מיקום:** שורה ~32

```typescript
// 🔴 למחוק את השורה:
size?: string;

// ✅ התוצאה:
export interface ISku {
  _id?: string;
  sku: string;
  productId?: string;
  name: string;
  price?: number | null;
  stockQuantity: number;
  color?: string; // ✅ נשאר
  // size הוסר ❌
  attributes: {
    [key: string]: any; // ✅ size כאן
  };
  colorFamily?: string;
  colorFamilySource?: 'auto' | 'manual' | 'import';
  images?: (string | IImage)[];
  isActive?: boolean;
}
```

**מיקום:** שורה ~36

```typescript
// 🔴 למחוק מתוך Variant:
size?: string;
```

**מיקום:** שורה ~69

```typescript
// 🔴 למחוק מתוך skus:
size?: string;
```

### 9.2 שמירה ובדיקה
```bash
cd client
npm run build
```

**✅ שלב 9 הושלם** - טיפוסים עודכנו

---

## שלב 10: עדכון סכמת Yup

### קובץ: `client/src/schemas/productFormSchema.ts`

#### 10.1 הסרת size מהסכמה
**מיקום:** מצא את השורה עם `size: yup.string()`

```typescript
// 🔴 למחוק את הבלוק:
size: yup.string().optional().max(50).nullable(),

// ✅ size יהיה ב-attributes בלבד
```

#### 10.2 עדכון defaultSKUValues
**מיקום:** defaultSKUValues

```typescript
// 🔴 לשנות מזה:
export const defaultSKUValues = {
  sku: '',
  name: '',
  price: null,
  stockQuantity: 0,
  color: '',
  size: '', // ← למחוק
  attributes: {},
  images: [],
  isActive: true,
};

// ✅ לזה:
export const defaultSKUValues = {
  sku: '',
  name: '',
  price: null,
  stockQuantity: 0,
  color: '',
  attributes: {}, // size יהיה כאן
  images: [],
  isActive: true,
  colorFamily: '',
  colorFamilySource: 'auto' as const,
};
```

### 10.3 שמירה ובדיקה
```bash
cd client
npm run build
```

**✅ שלב 10 הושלם** - סכמת Yup עודכנה

---

## שלב 11: עדכון AddSKUModal

### קובץ: `client/src/components/features/admin/Products/ProductForm/ProductSKUs/AddSKUModal.tsx`

#### 11.1 עדכון checkMissingAttributes
**מיקום:** שורה ~346-349

```typescript
// 🔴 לשנות מזה (שורות 346-350):
      } else if (key === 'size') {
        // size הוא שדה שטוח ברמה עליונה
        if (!newSKU.size) {
          missing.push(attr.name);
        }

// ✅ לזה - מחק את כל הבלוק else if הזה:
      // size עבר להיות מאפיין דינמי ב-attributes כמו כולם

// התוצאה הסופית (שורות ~340-360):
const checkMissingAttributes = useCallback(() => {
  const missing: string[] = [];

  filterAttributes.forEach((attr) => {
    if (!attr.isRequired) return;
    const key = attr.key;

    // בדיקה דינמית לפי סוג המאפיין
    if (key === 'color') {
      // color יכול להיות ב-color (שדה שטוח) או ב-colorFamily
      if (!newSKU.color && !newSKU.colorFamily) {
        missing.push(attr.name);
      }
    } else {
      // כל מאפיין אחר (כולל size!) נמצא ב-attributes object
      const attributes = newSKU.attributes as Record<string, any> | undefined;
      if (!attributes?.[key]) {
        missing.push(attr.name);
      }
    }
  });

  setMissingAttributes(missing);
  return missing;
}, [filterAttributes, newSKU]);
```

#### 11.2 הסרת input מיוחד לsize (אם קיים)
חפש בקובץ input עם `name="size"` או `value={newSKU.size}` והסר אותו.
המאפיין size יווצר אוטומטית דרך renderAttributeFields.

### 11.3 שמירה ובדיקה
```bash
cd client
npm run dev
```

**✅ שלב 11 הושלם** - AddSKUModal עודכן

---

## שלב 12: עדכון SKURow

### קובץ: `client/src/components/features/admin/Products/ProductForm/ProductSKUs/SKURow.tsx`

#### 12.1 עדכון handleSizeChange
**מיקום:** שורה ~206-212

```typescript
// 🔴 לשנות מזה:
const handleSizeChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, 'size', e.target.value);
  },
  [index, onChange]
);

// ✅ לזה:
const handleSizeChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAttributes = {
      ...(sku.attributes || {}),
      size: e.target.value
    };
    onChange(index, 'attributes', newAttributes);
  },
  [index, onChange, sku.attributes]
);
```

#### 12.2 עדכון תצוגת size במצב לא-עריכה
**מיקום:** שורה ~324-329

```typescript
// 🔴 לשנות מזה (שורות 324-329):
            {sku.size && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>מידה:</span>
                <span className={styles.detailValue}>{sku.size}</span>
              </div>
            )}

// ✅ לזה:
            {sku.attributes?.size && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>מידה:</span>
                <span className={styles.detailValue}>{sku.attributes.size}</span>
              </div>
            )}
```

#### 12.3 עדכון input במצב עריכה
**מיקום:** שורה ~537

```typescript
// 🔴 לשנות מזה:
<input
  type="text"
  value={sku.size || ''}
  onChange={handleSizeChange}
  className={styles.input}
  placeholder="מידה"
/>

// ✅ לזה:
<input
  type="text"
  value={sku.attributes?.size || ''}
  onChange={handleSizeChange}
  className={styles.input}
  placeholder="מידה"
/>
```

### 12.4 שמירה ובדיקה
```bash
cd client
npm run dev
```

**✅ שלב 12 הושלם** - SKURow עודכן

---

## שלב 13: עדכון ProductForm

### קובץ: `client/src/components/features/admin/Products/ProductForm/ProductForm.tsx`

#### 13.1 עדכון transformedSkus
**מיקום:** שורה ~134

```typescript
// 🔴 לשנות מזה:
const transformedSkus = product.skus.map((sku) => ({
  ...sku,
  size: sku.size || (sku.attributes as any)?.size || '',
}));

// ✅ לזה:
const transformedSkus = product.skus.map((sku) => ({
  ...sku,
  // ודא ש-attributes מכיל את size אם קיים
  attributes: {
    ...sku.attributes,
    size: sku.attributes?.size || '',
  },
}));
```

### 13.2 שמירה ובדיקה
```bash
cd client
npm run dev
```

**✅ שלב 13 הושלם** - ProductForm עודכן

---

## שלב 14: עדכון Cart Store

### קובץ: `client/src/store/slices/cartSlice.ts`

#### 14.1 עדכון הערה
**מיקום:** שורה ~21

```typescript
// 🔴 לשנות מזה:
// Phase 3.4: attributes מה-SKU להצגה ב-UI (color, size)

// ✅ לזה:
// Phase 3.4: attributes מה-SKU להצגה ב-UI (color ו-attributes.size)
```

#### 14.2 הסרת size מובנה (אם קיים)
**מיקום:** שורה ~24

```typescript
// 🔴 אם יש:
size?: string;

// ✅ למחוק - size נמצא ב-attributes בלבד
```

### 14.3 שמירה ובדיקה
```bash
cd client
npm run dev
```

**✅ שלב 14 הושלם** - Cart Store עודכן

---

## שלב 15: בדיקות מקיפות

### 15.1 בדיקת יצירת SKU חדש

```bash
# הפעל את השרת והלקוח
cd server
npm run dev

# בטרמינל נוסף
cd client
npm run dev
```

**צעדים:**
1. פתח דפדפן: `http://localhost:5173/admin/products`
2. לחץ על "מוצר חדש" או ערוך מוצר קיים
3. לחץ "הוסף SKU"
4. מלא את השדות (sku, name, price, stock, color)
5. **הוסף מידה** - האם יש שדה size? (צריך להיווצר דינמית אם הוספת FilterAttribute לsize)
6. שמור
7. בדוק ב-MongoDB:

```bash
mongosh
use ecommerce_db
db.skus.findOne({ sku: "הקוד-שהזנת" })

# צריך לראות:
{
  _id: ...,
  sku: "...",
  name: "...",
  color: "...",
  attributes: {
    size: "M"  // ✅ כאן!
  }
  // אין size: "M" מחוץ ל-attributes ❌
}
```

### 15.2 בדיקת עריכת SKU קיים

**צעדים:**
1. פתח SKU לעריכה
2. שנה את המידה
3. שמור
4. בדוק ש-attributes.size התעדכן

### 15.3 בדיקת חיפוש לפי size

```bash
# בדפדפן או Postman
GET http://localhost:5000/api/skus/search?size=M

# צריך להחזיר SKUs עם attributes.size = "M"
```

### 15.4 בדיקת הצגה בעמוד מוצר

**צעדים:**
1. פתח עמוד מוצר בממשק הלקוח
2. בדוק שהמידה מוצגת נכון
3. בדוק שהוספה לעגלה עובדת
4. בדוק שהעגלה מציגה את המידה

### 15.5 בדיקת Cart Flow

**צעדים:**
1. הוסף מוצר לעגלה
2. פתח עגלה
3. בדוק שהמידה מוצגת
4. בדוק checkout

### 15.6 בדיקת Backward Compatibility
**צעדים:**
1. שלח בקשה POST עם `size` ברמה עליונה
2. בדוק שהשרת ממיר ל-`attributes.size`
3. בדוק שהתשובה מכילה `size` (דרך virtual)

**✅ שלב 15 הושלם** - בדיקות עברו בהצלחה

---

## שלב 16: ניקוי אינדקסים ישנים

### 16.1 וידוא ביצועים עם אינדקס חדש
```bash
# בדוק שאילתות משתמשות באינדקס החדש
mongosh
use ecommerce_db

# הרץ explain על שאילתה טיפוסית
db.skus.find({ color: "blue", "attributes.size": "M" }).explain("executionStats")

# וודא ש-indexName מתאים לאינדקס החדש
```

### 16.2 מחיקת אינדקס ישן
```bash
# רק אחרי וידוא שהחדש עובד!
db.skus.dropIndex({ color: 1, size: 1 })

# בדוק שרק האינדקסים החדשים קיימים
db.skus.getIndexes()
```

### 16.3 עדכון קוד - הסרת אינדקס ישן מהמודל
**קובץ:** `server/src/models/Sku.ts`

```typescript
// 🔴 למחוק את השורה:
SkuSchema.index({ color: 1, size: 1 });

// ✅ להשאיר רק:
SkuSchema.index({ color: 1, 'attributes.size': 1 }, { background: true });
```

**✅ שלב 16 הושלם** - אינדקסים ישנים הוסרו

---

## שלב 17: ניקוי שכבת תאימות (אופציונלי)

### מתי להסיר?
רק אחרי שכל הלקוחות (Web, Mobile, External APIs) עודכנו להשתמש ב-`attributes.size`.

### 17.1 הסרת Virtual Property
**קובץ:** `server/src/models/Sku.ts`

```typescript
// 🔴 למחוק:
SkuSchema.virtual('size').get(function () {
  return this.attributes?.size;
});

SkuSchema.set('toJSON', { virtuals: true });
SkuSchema.set('toObject', { virtuals: true });
```

### 17.2 הסרת Middleware
**קובץ:** `server/src/routes/productRoutes.ts` ו-`skuRoutes.ts`

```typescript
// 🔴 להסיר:
import { mapSizeToAttributes, mapSizeQueryParam } from '../middleware/sizeCompatibility';

router.post('/products', mapSizeToAttributes, createProduct);  // ← הסר middleware
```

### 17.3 מחיקת קובץ Middleware
```bash
# אם לא צריך יותר
rm server/src/middleware/sizeCompatibility.ts
```

**✅ שלב 17 הושלם** - שכבת תאימות הוסרה (לאחר אימות)

---

## שלב 18: עדכון קבצי seed וסיום

### 18.1 עדכון קבצי seed ובדיקה

**קובץ:** `server/src/seedProducts.ts`

```typescript
// עדכן את הנתונים לדוגמה:
// 🔴 במקום:
{
  sku: 'SHIRT-001',
  name: 'חולצה כחולה M',
  color: 'blue',
  size: 'M',  // ← הסר
  stockQuantity: 10,
  price: 99.90
}

// ✅ שנה ל:
{
  sku: 'SHIRT-001',
  name: 'חולצה כחולה M',
  color: 'blue',
  attributes: {
    size: 'M'  // ← כאן
  },
  stockQuantity: 10,
  price: 99.90
}
```

### 18.2 עדכון קבצי בדיקה

**כבר בוצע בשלב 7.3**

### 18.3 הסרת קוד מיותר

חפש בפרויקט:
```bash
# בשרת
cd server
grep -r "\.size" src/ | grep -v "attributes"

# בלקוח
cd client
grep -r "\.size" src/ | grep -v "attributes" | grep -v "fontSize"
```

הסר כל קוד שמתייחס ל-`sku.size` ישיר (לא דרך attributes).

### 18.4 עדכון דוקומנטציה

עדכן README או API docs שיש התייחסות ל:
- `size` הוא מאפיין דינמי (attributes.size)
- חיפוש: `?size=M` עדיין עובד (השרת ממפה ל-attributes.size)

### 18.5 בילד סופי

```bash
# שרת
cd server
npm run build
npm run start  # בדוק שהשרת עולה בלי שגיאות

# לקוח
cd client
npm run build
npm run preview  # בדוק שהלקוח עולה
```

### 18.6 סיכום

**מה השתנה:**
- ✅ `size` כבר לא שדה מובנה ב-SKU
- ✅ `size` נמצא ב-`attributes.size`
- ✅ חיפוש `?size=M` עדיין עובד
- ✅ UI אוטומטי יוצר שדה size אם מוגדר ב-FilterAttributes
- ✅ כל הנתונים הקיימים הועברו

**יתרונות:**
- 🎯 עקביות - size כמו כל מאפיין
- 🎯 גמישות - מנהל מוסיף מאפיינים
- 🎯 פשטות - פחות קוד מיוחד
- 🎯 סקלאביליות - קל להוסיף מאפיינים

**✅ שלב 18 הושלם** - המיגרציה הושלמה!

---

## 🎉 סיכום סופי

### קבצים ששונו/נוצרו (סה"כ 19):

#### שרת (13):
1. ✅ `server/src/models/Sku.ts` (virtual + אינדקסים)
2. ✅ `server/src/models/Product.ts`
3. ✅ `server/src/models/Cart.ts`
4. ✅ `server/src/middleware/sizeCompatibility.ts` (חדש - compatibility layer)
5. ✅ `server/src/middleware/productValidation.ts`
6. ✅ `server/src/controllers/skuController.ts`
7. ✅ `server/src/controllers/productController.ts`
8. ✅ `server/src/services/skuService.ts`
9. ✅ `server/src/services/cartService.ts`
10. ✅ `server/src/services/filterAttributeService.ts`
11. ✅ `server/src/routes/productRoutes.ts` (middleware integration)
12. ✅ `server/src/routes/skuRoutes.ts` (middleware integration)
13. ✅ `server/src/scripts/migrate-size-to-attributes.ts` (חדש - עם dry-run)

#### לקוח (6):
1. ✅ `client/src/types/Product.ts`
2. ✅ `client/src/schemas/productFormSchema.ts`
3. ✅ `client/src/components/.../AddSKUModal.tsx`
4. ✅ `client/src/components/.../SKURow.tsx`
5. ✅ `client/src/components/.../ProductForm.tsx`
6. ✅ `client/src/store/slices/cartSlice.ts`

### זמן צפוי: 3-4 שעות (כולל בדיקות)

### נקודות קריטיות - חובה לבצע בסדר:
1. ✅ **שלב 1 תחילה**: הוסף compatibility layer (virtual + middleware) לפני שינוי המודל
2. ✅ **שלב 2**: הוסף אינדקס חדש לפני מחיקת הישן
3. ✅ **שלב 5**: הרץ dry-run של המיגרציה ובדוק conflicts
4. ✅ **שלב 5**: הרץ מיגרציה מלאה רק אחרי אישור dry-run
5. ✅ **שלבים 6-14**: עדכן קוד בשרת ולקוח
6. ✅ **שלב 15**: בדיקות מקיפות כולל backward compatibility
7. ✅ **שלב 16**: מחק אינדקסים ישנים רק אחרי אימות ביצועים
8. ✅ **שלב 17**: הסר compatibility layer רק אחרי שכל הלקוחות עודכנו

### סדר Deployment מומלץ:
```
1. Deploy compatibility layer (שלב 1)
2. Build indices (שלב 2)
3. Run migration (שלב 5)
4. Deploy server code updates (שלבים 6-8)
5. Deploy client code updates (שלבים 9-14)
6. Monitor & test (שלב 15)
7. Remove old indices (שלב 16)
8. [Later] Remove compatibility layer (שלב 17)
```

### אם משהו השתבש:
```bash
# 1. החזר שינויים בקוד ב-git
git checkout .

# 2. אם המיגרציה נכשלה באמצע
# הרץ שוב - הסקריפט מדלג על SKUs שכבר עברו
npm run migrate:size

# 3. אם יש בעיה חמורה - החזר DB (נתוני דמה)
# מחק והתחל מחדש
mongosh
use ecommerce_db
db.skus.updateMany(
  { "attributes.size": { $exists: true } },
  { $unset: { "attributes.size": "" } }
)

# 4. אם הקוד שבור - בדוק שהתחלת מ-compatibility layer
# הוודא שהוספת virtual ו-middleware לפני עדכון המודל
```

### שאלות נפוצות (FAQ):

**ש: האם צריך לעצור את השרת בזמן המיגרציה?**  
ת: לא, אם יש compatibility layer. אחרת - כן.

**ש: כמה זמן לוקחת המיגרציה?**  
ת: תלוי בכמות SKUs. בדרך כלל 1-2 דקות ל-1000 SKUs.

**ש: מה אם יש conflicts?**  
ת: הסקריפט שומר את `attributes.size` (עדיפות גבוהה). בדוק ידנית אם צריך.

**ש: מתי אפשר להסיר את ה-compatibility layer?**  
ת: רק אחרי שכל הלקוחות (Web, Mobile, APIs) עודכנו. בדרך כלל 2-4 שבועות.

**ש: איך אני יודע שהמיגרציה הצליחה?**  
ת: הרץ: `db.skus.countDocuments({ size: { $exists: true } })` - צריך להחזיר 0.

---

**🎊 המיגרציה הושלמה בהצלחה בצורה מבוקרת ובטוחה!**
