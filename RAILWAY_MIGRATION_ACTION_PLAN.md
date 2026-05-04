# תוכנית פעולה: מיגרציה ל-Railway Internal Services (ismoke-shop)

**תאריך:** 22 במרץ 2026  
**פרויקט:** ismoke-shop (robust-flow)  
**מבוסס על:** ניסיון מוכח מפרויקט masmer-hair (melodious-dream)

---

## מצב נוכחי

| שירות | ספק נוכחי | ספק חדש | סטטוס |
|--------|-----------|---------|--------|
| **MongoDB** | ~~Atlas~~ → Railway | Railway (mongodb.railway.internal) | ✅ נתונים הועתקו, ממתין לעדכון MONGO_URI |
| **Redis** | Redis Cloud (Frankfurt) | Railway Internal | ⏳ redis.ts עודכן, ממתין להוספת שירות |
| **Node.js** | Railway | Railway | ✅ פועל |

---

## השוואה: masmer-hair vs ismoke-shop

### מה זהה (רלוונטי!)

| נושא | masmer-hair | ismoke-shop | רלוונטיות |
|-------|-------------|-------------|-----------|
| **טרנזקציות MongoDB** | 11 בלוקים ב-4 קבצים | **10 בלוקים ב-4 קבצים** | 🔴 קריטי |
| **Redis → Railway** | שינוי REDIS_URL בלבד | שינוי REDIS_URL בלבד | ✅ זהה |
| **BullMQ queues** | 4 queues + 4 workers | **5 queues + 4 workers** | ✅ זהה |
| **database.ts** | צריך ensureReplicaSet | **צריך ensureReplicaSet** | 🔴 קריטי |

### מה שונה (לא רלוונטי)

| נושא | masmer-hair | ismoke-shop | הערה |
|-------|-------------|-------------|------|
| **Redis Cache Layer** | נבנתה שכבת cacheMiddleware מלאה | משתמש ב-NodeCache (in-memory) | לא צריך שינוי |
| **Cache Invalidation** | 53 קריאות invalidation ב-11 קבצים | invalidation פשוט של NodeCache | לא צריך שינוי |
| **503 Bypass** | bypass ל-maintenance mode | לא קיים | לא רלוונטי |
| **Redis Data migration** | לא הייתה צריכה | לא צריכה | Redis = cache + queues זמניים |

---

## ⚠️ בעיות צפויות (מנוסה ב-masmer-hair)

### בעיה #1: טרנזקציות ישבורו! 🔴

**הבעיה:** MongoDB של Railway רץ כ-**standalone** (לא replica set).  
טרנזקציות דורשות replica set → כל הפעולות הבאות ישברו:

| קובץ | פונקציות | מה ישבר |
|-------|----------|---------|
| `inventoryWorker.ts` | `reserveStock`, `releaseStock` | שריון/שחרור מלאי |
| `orderService.ts` | `createOrder`, `updateOrderStatus` | יצירת הזמנות, עדכון סטטוס |
| `productService.ts` | `updateProductWithSKUs`, `updateProduct`, `softDeleteProduct`, `hardDeleteProduct` | כל עדכוני מוצרים |
| `skuService.ts` | `createSku`, `updateSku` | יצירה ועדכון SKUs |

**שגיאה צפויה:**
```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

### בעיה #2: "ביצה ותרנגולת" באתחול Replica Set

**הבעיה:** `mongoose.connect()` מחפש primary, אבל אין primary לפני `rs.initiate()`.  
**הפתרון המוכח:** `MongoClient` עם `directConnection: true` לפני mongoose.

### בעיה #3: Hostname שגוי ב-Replica Set

**הבעיה:** `rs.initiate({})` ללא host מפורש → MongoDB רושם hostname פנימי של הקונטיינר.  
**הפתרון:** ציון `mongodb.railway.internal:27017` מפורש ב-`rs.initiate()`.

---

## סדר פעולות מפורט

### שלב 1: הפעלת Replica Set ב-MongoDB של Railway 🔧
**מבצע:** המשתמש ב-Railway Dashboard

1. כנס ל-robust-flow → שירות **MongoDB**
2. לך ל-**Settings** → **Deploy** → **Custom Start Command**
3. הכנס:
   ```
   mongod --replSet rs0 --bind_ip_all
   ```
4. לחץ Deploy

### שלב 2: עדכון database.ts - הוספת ensureReplicaSet 🔧
**מבצע:** אני (בקוד)

צריך להוסיף פונקציה `ensureReplicaSet()` שתרוץ **לפני** `mongoose.connect()`:

```
זרימת אתחול:
1. ensureReplicaSet(mongoUri)
   ├── חילוץ host מה-URI
   ├── MongoClient + directConnection=true
   ├── rs.initiate({ _id: 'rs0', members: [{ host }] })
   │   ├── הצלחה → המתנה 5 שניות
   │   ├── AlreadyInitialized → בדיקה+תיקון hostname
   │   ├── NoReplicationEnabled → דילוג (Atlas/standalone)
   │   └── שגיאה אחרת → warning
   └── סגירת חיבור זמני
2. mongoose.connect(mongoUri) → חיבור רגיל (עכשיו יש primary)
```

### שלב 3: עדכון MONGO_URI ב-Railway Dashboard 🔧
**מבצע:** המשתמש ב-Railway Dashboard

1. כנס ל-robust-flow → שירות **ismoke-shop**
2. לך ל-**Variables**
3. עדכן/הוסף:
   ```
   MONGO_URI = mongodb://mongo:KlsTWnaKpUDQEELUxhpmvmApHxIabipc@mongodb.railway.internal:27017/ecommerceDB?authSource=admin
   ```

### שלב 4: הוספת Redis service ב-Railway 🔧
**מבצע:** המשתמש ב-Railway Dashboard

1. ב-robust-flow → לחץ **+ New** → **Database** → **Add Redis**
2. כנס ל-ismoke-shop → Variables
3. הוסף:
   ```
   REDIS_URL = ${{Redis.REDIS_URL}}
   ```
4. (אופציונלי) מחק משתנים ישנים: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_USERNAME`

### שלב 5: Push קוד + Deploy 🔧

1. Push קוד עדכני (database.ts עם ensureReplicaSet)
2. Railway יריץ redeploy אוטומטית
3. בדיקת Logs:
   - `✅ Replica set rs0 אותחל בהצלחה`
   - `✅ MongoDB Connected: mongodb.railway.internal`
   - `✅ Redis: מחובר בהצלחה`

### שלב 6: אימות 🧪

- [ ] Health check מחזיר healthy
- [ ] מוצרים נטענים באתר
- [ ] יצירת הזמנה עובדת (טרנזקציה!)
- [ ] עדכון מוצר עובד (טרנזקציה!)
- [ ] BullMQ workers פעילים בלוגים

---

## מה לא צריך לעשות (בניגוד ל-masmer-hair)

| פעולה | סיבה שלא צריך |
|-------|----------------|
| בניית Redis Cache Layer | הפרויקט משתמש ב-NodeCache (in-memory) שעובד טוב |
| Cache Invalidation ב-Redis | ה-invalidation של NodeCache כבר מכסה |
| 503/Maintenance bypass | לא קיים בפרויקט |
| מיגרציית נתוני Redis | Redis = cache + queue jobs (נתונים זמניים) |

---

## סיכום משימות

| # | משימה | סוג | מי מבצע | סטטוס |
|---|--------|-----|---------|--------|
| 1 | Custom Start Command ב-MongoDB | Dashboard | משתמש | ⏳ |
| 2 | עדכון database.ts + ensureReplicaSet | קוד | AI | ⏳ |
| 3 | עדכון MONGO_URI ב-ismoke-shop Variables | Dashboard | משתמש | ⏳ |
| 4 | הוספת Redis service | Dashboard | משתמש | ⏳ |
| 5 | הוספת REDIS_URL ב-ismoke-shop Variables | Dashboard | משתמש | ⏳ |
| 6 | Push + Deploy | טרמינל | AI | ⏳ |
| 7 | אימות (health + transactions) | בדיקה | משתמש | ⏳ |

---

## לקחים מ-masmer-hair שישמשו אותנו

1. **חובה להגדיר `--replSet rs0`** לפני שהשרת מנסה להתחבר
2. **חובה לציין host מפורש** ב-`rs.initiate()` → `mongodb.railway.internal:27017`
3. **חובה להשתמש ב-`directConnection: true`** בחיבור הזמני לאתחול
4. **חובה לטפל ב-AlreadyInitialized** → בדיקה ותיקון hostname אם צריך
5. **Redis migration = 0 שינויי קוד** → כבר עדכנו את redis.ts ו-queues/index.ts כבר תומך
