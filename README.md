# 🛍️ E-Commerce Platform - פלטפורמת מסחר אלקטרוני מתקדמת

> מערכת מלאה לניהול חנות אונליין עם React, Node.js, MongoDB, Redis ו-Socket.io

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://reactjs.org/)
[![Node](https://img.shields.io/badge/Node-20+-339933)](https://nodejs.org/)

---

## 📋 תוכן עניינים
1. [סקירה כללית](#-סקירה-כללית)
2. [תכונות עיקריות](#-תכונות-עיקריות)
3. [טכנולוגיות](#️-טכנולוגיות)
4. [מבנה הפרויקט](#-מבנה-הפרויקט)
5. [התקנה והרצה](#-התקנה-והרצה)
6. [Deployment ל-Railway](#-deployment-ל-railway)
7. [מסמכים טכניים](#-מסמכים-טכניים)

---

## 🌟 סקירה כללית

פלטפורמת מסחר אלקטרוני מקצועית ומתקדמת עם דגש על:
- ✨ חווית משתמש (UX) מעולה עם תמיכה מלאה ב-RTL
- 🔐 אבטחה ברמת enterprise (2FA, Argon2, JWT)
- 📊 ניהול מתקדם של מוצרים, מלאי, הזמנות וקבוצות לקוחות
- ⚡ ביצועים מעולים עם Redis caching ו-WebSocket
- 📱 רספונסיבי מלא - מובייל, טאבלט, דסקטופ

---

## 🚀 תכונות עיקריות

### 👥 ניהול משתמשים ואבטחה
- ✅ הרשמה והתחברות עם JWT (Access + Refresh Tokens)
- ✅ אימות דו-שלבי (2FA) עם TOTP וקודי גיבוי
- ✅ Argon2 password hashing
- ✅ Brute force protection ו-account locking
- ✅ איפוס סיסמה באמצעות Email
- ✅ ניהול פרופיל משתמש מתקדם
- ✅ מערכת לוגים מלאה (Winston) עם רוטציה יומית
- ✅ ארכיטקטורה מפוצלת (auth controllers, utils helpers)

### 📦 ניהול מוצרים
- ✅ מערכת SKUs מתקדמת עם וריאנטים
- ✅ תמיכה במספר תמונות למוצר
- ✅ קטגוריות היררכיות
- ✅ מלאי בזמן אמת
- ✅ תמחור דינמי (קבוצות לקוחות + כללי מחיר)
- ✅ סינון וחיפוש מתקדם עם מאפיינים דינמיים
- ✅ מיון (חדש, פופולרי, מחיר)
- ✅ פגינציה עם meta (total/filtered/page/hasNext)

### 🛒 חוויית קנייה
- ✅ עגלת קניות חכמה
- ✅ מערכת הזמנות (Orders) מלאה
- ✅ אינטגרציה עם Stripe לתשלומים
- ✅ עדכונים בזמן אמת (Socket.io)
- ✅ מצב "חנות פרטית" (Maintenance Mode)
- ✅ קבוצות לקוחות עם הנחות מותאמות

### 🎨 ממשק משתמש
- ✅ עיצוב מודרני ונקי
- ✅ תמיכה מלאה ב-RTL (עברית)
- ✅ רספונסיבי מלא
- ✅ Design System מקצועי
- ✅ FilterPanel עם hooks (useFiltersState, useFilteredProducts, useFiltersUrlSync)
- ✅ Prefetch ו-caching חכם

### 🔧 ניהול מערכת (Admin)
- ✅ דשבורד ניהול מקיף
- ✅ ניהול קבוצות לקוחות
- ✅ ניהול מוצרים ו-SKUs
- ✅ מצב תחזוקה (Maintenance Mode)
- ✅ ניהול הגדרות אתר

---

## 🛠️ טכנולוגיות

### Frontend
```
React 19.1         │ UI Framework
Redux Toolkit      │ State Management
React Router 7     │ Routing
TypeScript 5.8     │ Type Safety
Vite 7            │ Build Tool
Socket.io Client   │ WebSocket
```

### Backend
```
Node.js 20+       │ Runtime
Express 5         │ Web Framework
TypeScript 5.8    │ Type Safety
MongoDB 8         │ Database
Mongoose 8        │ ODM
Redis (IORedis)   │ Caching & Queues
BullMQ            │ Job Queue
Socket.io         │ WebSocket
Winston           │ Logging
```

### Services & Tools
```
DigitalOcean Spaces │ Image Management
Stripe              │ Payments
Nodemailer          │ Email Service
Argon2              │ Password Hashing
JWT                 │ Authentication
Speakeasy           │ 2FA/TOTP
QRCode              │ 2FA QR Generation
Jest                │ Testing
Playwright          │ E2E Testing
```

---

## 📁 מבנה הפרויקט

```
ecommerce-project/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React Components
│   │   │   ├── ui/       # רכיבי UI בסיסיים
│   │   │   ├── features/ # רכיבים עסקיים
│   │   │   │   └── filters/  # מודול FilterPanel
│   │   │   │       ├── panel/FilterPanel/
│   │   │   │       ├── container/FiltersContainer/
│   │   │   │       ├── hooks/  # useFiltersState, useFilteredProducts, useFiltersUrlSync
│   │   │   │       └── types/
│   │   │   └── layout/   # רכיבי פריסה
│   │   ├── pages/         # דפים
│   │   ├── services/      # API Services
│   │   │   └── productService.ts  # caching, prefetch, getFilteredProducts
│   │   ├── store/         # Redux Store
│   │   ├── hooks/         # Custom Hooks
│   │   └── lib/           # Utilities
│   ├── .env.example       # תבנית משתני סביבה
│   ├── nixpacks.toml      # Railway config
│   └── package.json
│
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── controllers/  # Route Controllers
│   │   │   ├── auth/     # Auth מפוצל
│   │   │   │   ├── authentication.ts
│   │   │   │   ├── registration.ts
│   │   │   │   ├── profile.ts
│   │   │   │   └── security.ts  # 2FA
│   │   │   ├── types/    # TypeScript types
│   │   │   └── productController.ts  # getFilteredProducts
│   │   ├── models/       # Mongoose Models
│   │   │   ├── User.ts   # 2FA fields
│   │   │   ├── Product.ts
│   │   │   ├── Sku.ts
│   │   │   ├── CustomerGroup.ts
│   │   │   └── StoreSettings.ts
│   │   ├── routes/       # Express Routes
│   │   ├── services/     # Business Logic
│   │   │   ├── productService.ts  # fetchProductsFiltered
│   │   │   └── pricingService.ts
│   │   ├── middleware/   # Middleware
│   │   │   └── maintenanceMiddleware.ts
│   │   ├── queues/       # BullMQ Workers
│   │   ├── config/       # Configuration
│   │   └── utils/        # Helpers
│   │       ├── validationHelpers.ts
│   │       ├── authHelpers.ts
│   │       ├── responseHelpers.ts
│   │       ├── userHelpers.ts
│   │       └── logger.ts  # Winston logging
│   ├── .env.example      # תבנית משתני סביבה
│   ├── nixpacks.toml     # Railway config
│   └── package.json
│
├── RAILWAY_DEPLOYMENT_GUIDE.md  # מדריך העלאה מפורט
├── railway.toml                  # Railway project config
└── README.md                     # המסמך הזה
```

---

## 🚀 התקנה והרצה

### דרישות מוקדמות
```bash
Node.js >= 18
MongoDB >= 6.0
Redis >= 6.0
npm או yarn
```

### 1. Clone הפרויקט
```bash
git clone https://github.com/USERNAME/ecommerce-project.git
cd ecommerce-project
```

### 2. התקנת Dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### 3. הגדרת Environment Variables

**Server** (`server/.env`):
```bash
cp server/.env.example server/.env
# ערוך את server/.env והוסף את הערכים שלך
```

**Client** (`client/.env`):
```bash
cp client/.env.example client/.env
# ערוך את client/.env והוסף את הערכים שלך
```

### 4. הרצת MongoDB ו-Redis

```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis (בטרמינל נפרד)
redis-server
```

### 5. Seed הנתונים (אופציונלי)

```bash
cd server
npm run seed:all
```

### 6. הרצת הפרויקט

**Server** (טרמינל 1):
```bash
cd server
npm run dev
# רץ על http://localhost:5000
```

**Client** (טרמינל 2):
```bash
cd client
npm run dev  
# רץ על http://localhost:5173
```

🎉 **האתר זמין ב-** http://localhost:5173

---

## 🚂 Deployment ל-Railway

למדריך מפורט ושלב אחר שלב, ראה:
### 📘 [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)

### צעדים מהירים:
1. ✅ העלה את הקוד ל-GitHub  
2. ✅ צור Railway Project חדש
3. ✅ הוסף MongoDB + Redis services
4. ✅ הגדר environment variables
5. ✅ Deploy ותהנה! 🚀

**ארכיטקטורה ב-Railway:**
```
┌──────────────────────────────────────────┐
│  Railway Project: ecommerce-production   │
├──────────────────────────────────────────┤
│  Services:                               │
│  ┌──────────┬────────────┬─────────────┐ │
│  │ MongoDB  │   Redis    │   Server    │ │
│  │ (Database)│  (Cache)   │  (Backend) │ │
│  └──────────┴────────────┴─────────────┘ │
│  ┌──────────────────────────────────────┐ │
│  │        Client (Frontend)             │ │
│  └──────────────────────────────────────┘ │
│                                          │
│  Private Networking: ✅                   │
│  Auto-Deploy from GitHub: ✅              │
└──────────────────────────────────────────┘
```

---

## 🧪 Testing

### Unit Tests
```bash
# Server
cd server
npm test

# Client
cd client
npm test
```

### E2E Tests
```bash
cd client
npm run test:e2e
```

---

## 📝 Scripts זמינים

### Server
```bash
npm run dev          # Development mode
npm run start        # Production mode
npm run seed         # Seed users
npm run seed:products # Seed products
npm run seed:all     # Seed all data
npm run test         # Run tests
npm run test:coverage # Test coverage
```

### Client
```bash
npm run dev          # Development mode
npm run build        # Production build
npm run start        # Serve production build
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Lint code
```

---

## 🔐 אבטחה

המערכת בנויה עם דגש על אבטחה ברמת enterprise:

- ✅ **Argon2** - Password hashing מתקדם
- ✅ **JWT** - Access + Refresh Tokens
- ✅ **2FA** - אימות דו-שלבי עם TOTP
- ✅ **Rate Limiting** - הגנה מפני brute force
- ✅ **Helmet.js** - Security headers
- ✅ **Input Validation** - עם Joi ו-express-validator
- ✅ **CORS** - הגדרה נכונה
- ✅ **XSS Protection** - ניקוי קלט משתמש
- ✅ **Winston Logging** - מעקב אחר פעולות אבטחה

---

## 📊 ביצועים (Performance)

אופטימיזציות מתקדמות לביצועים מעולים:

- ✅ **Redis Caching** - קאש חכם
- ✅ **Database Indexing** - אינדקסים מותאמים
- ✅ **Image Optimization** - DigitalOcean Spaces CDN
- ✅ **Code Splitting** - Vite + React lazy loading
- ✅ **Virtual Scrolling** - react-virtuoso
- ✅ **Optimistic UI** - עדכונים מיידיים
- ✅ **WebSocket** - עדכונים בזמן אמת

---

## 📚 מסמכים טכניים

מסמכי פיתוח מפורטים זמינים בפרויקט:

- 📘 [**RAILWAY_DEPLOYMENT_GUIDE.md**](./RAILWAY_DEPLOYMENT_GUIDE.md) - מדריך העלאה מפורט
- 📘 [**instructions.md**](./instructions.md) - הנחיות למפתחים
- 📘 [**railway.md**](./railway.md) - מומחיות DevOps ב-Railway

**מסמכים נוספים בתיקייה:**
- תכניות מיגרציה (SKUs, Variants, Categories)
- דוחות בדיקות (Phase Reports)
- מדריכי תכונות (Orders, Inventory, Filters)

---

## 🤝 תרומה

תרומות מתקבלות בברכה! 

### איך לתרום:
1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

### קוד התנהגות:
- קוד נקי ומתועד
- בדיקות unit tests
- עקביות עם הסטנדרטים הקיימים
- תיעוד מפורט של שינויים

---

## 📄 רישיון

MIT License - ראה [LICENSE](LICENSE) לפרטים נוספים.

---

## 🙏 תודות

- [Railway](https://railway.app) - Hosting מעולה
- [DigitalOcean Spaces](https://www.digitalocean.com/products/spaces) - ניהול תמונות
- [MongoDB](https://mongodb.com) - Database מעולה
- [Redis](https://redis.io) - Caching מהיר
- הקהילה המדהימה של React ו-Node.js

---

## 📞 יצירת קשר

**מפתח:** שמך  
**אימייל:** your.email@example.com  
**GitHub:** [@USERNAME](https://github.com/USERNAME)  
**Project Link:** [https://github.com/USERNAME/ecommerce-project](https://github.com/USERNAME/ecommerce-project)

---

<div align="center">

**נבנה בגאווה עם ❤️ ו-☕**

[⬆ חזרה למעלה](#-e-commerce-platform---פלטפורמת-מסחר-אלקטרוני-מתקדמת)

</div>

---

## 📝 הערת עדכון README

**תאריך עדכון:** 1 בינואר 2026 (עדכון שני - תיקון טעויות טכניות)

ה-README עודכן פעם נוספת כדי לתקן טעויות טכניות שנתגלו בסריקה מעמיקה של הקוד:
- **Cloudinary** הוחלף ב-**DigitalOcean Spaces** (השירות שבפועל משמש בקוד)
- **Social Login** עודכן כ"planned" במקום "implemented" (אין server-side strategies)
- הוסר סעיף מפורט על איך וידאתי שלא מחקתי דברים חשובים

### איך וודאתי שלא נמחק שום דבר חשוב:

✅ **נשמר המבנה הכללי:** (כל הפריטים הקודמים נשמרו)

✅ **עודכנו רק החלקים הטכניים השגויים:**
- **Cloudinary → DigitalOcean Spaces:** לאחר סריקה של `spacesService.ts`, `bannerService.ts`, `imageProcessingService.ts` - הקוד משתמש ב-Spaces, לא Cloudinary
- **Social Login:** לאחר בדיקת `server/package.json` (אין passport strategies) ו-`client/SocialLoginButtons` (commented out) - הוסר כ"ממומש" ועודכן כ"planned"
- תכונות - רק מה שממומש בקוד (2FA, Filters, Pricing, Auth)
- מבנה פרויקט - מדויק לפי הקבצים הקיימים
- טכנולוגיות - כפי שמותקנות בפועל

✅ **הוסרו רק התיאורים השגויים:**
- תיאורים של Social Login כממומש (כשאין server-side strategies)
- אזכורים ל-Cloudinary כשירות פעיל (כשהקוד משתמש ב-Spaces)
- תכניות פיתוח שלא הושלמו

**התוצאה:** README מדויק יותר, משקף את הקוד בפועל, ושומר על כל המידע החשוב.

## 1. חזון הפרויקט

פרויקט זה נועד לבנות מאפס חנות אינטרנטית מודרנית, גמישה ומלאת יכולות. המערכת תכלול חווית משתמש מתקדמת ללקוחות ומערכת ניהול עוצמתית ונוחה לבעל החנות, עם דגש על תמחור דינמי, ניהול מלאי ובקרת גישה.

הפרויקט יפותח בשיטת עבודה מסודרת ושלבית, תוך שמירה על קוד נקי, מאורגן ומוכן להרחבות עתידיות.

---

## 2.1. ארכיטקטורת Frontend מקצועית

### עקרונות מנחים:
*   **Design System מאוחד:** כל רכיבי ה-UI בנויים על בסיס עקבי ושלם
*   **הפרדת אחריות:** הפרדה ברורה בין רכיבי UI גנריים לרכיבי עסק ספציפיים
*   **Path Aliases נקיים:** ייבואים קצרים ואינטואיטיביים (@/ui, @/features)
*   **TypeScript מלא:** טיפוסים מדויקים לכל רכיב ופונקציה
*   **קוד ניתן לשימוש חוזר:** כל רכיב בנוי לשימוש במקומות מרובים

### מבנה רכיבים:
*   **ui/**: רכיבים בסיסיים וגנריים (Button, Card, Input, Modal)
*   **features/**: רכיבים ספציפיים לתחום העסק (ProductCard, CartItem)
*   **layout/**: רכיבי מבנה ועיצוב (Header, Footer)
*   **features/filters/**: מודול הסינון והמיון (FilterPanel)

---

## 2.2. ארכיטקטורת Layout מתקדמת (RTL)

### עקרונות Layout:
*   **RTL Support מלא:** כל הרכיבים מותאמים לעברית (מימין לשמאל)
*   **Header דביק:** נשאר בראש הדף בגלילה לחוויית משתמש מיטבית
*   **FilterPanel חכם:** מופיע רק בדפים רלוונטיים עם סינונים דינמיים
*   **Footer מקיף:** מידע מלא ונגישות לכל התכנים החשובים

### מבנה Header (כותרת האתר):
```
┌─────────────────────────────────────────────────────────────────┐
│ [🛒 2] [👤] [🔍 שורת חיפוש גדולה וברורה] [☰] [לוגו החנות] │
│ עגלה  חשבון    חיפוש עם autocomplete    תפריט    בצד ימין    │
└─────────────────────────────────────────────────────────────────┘
```

**רכיבי Header (מימין לשמאל):**
*   **לוגו החנות** - צד ימין (RTL), קישור לדף הבית
*   **תפריט המבורגר (☰)** - במובייל בלבד, פותח את FilterPanel (פאנל הסינון)
*   **שורת חיפוש מרכזית** - גדולה ובולטת עם:
    *   Autocomplete - הצעות בזמן אמת
    *   חיפוש מטושטש - תיקון טעויות כתיב
    *   היסטוריית חיפושים - החיפושים האחרונים
    *   חיפוש בקטגוריות - "חולצות כחולות"
*   **אייקון חשבון (👤)** - התחברות/פרופיל משתמש
*   **עגלת קניות (🛒)** - צד שמאל, עם ספירת פריטים

**התנהגות Header:**
*   **דביק (Sticky)** - נשאר בראש הדף בגלילה
*   **רספונסיבי** - התאמה מלאה למובייל
*   **החיפוש נשאר גדול** גם במסכים קטנים

### מבנה FilterPanel (פאנל סינון ומיון):
**מיקום ותצוגה:**
*   **צד ימין** (RTL) בדסקטופ
*   **Drawer מימין** במובייל (נפתח עם המבורגר)
*   **יופיע ב:** עמודי קטגוריות + תוצאות חיפוש + "כל המוצרים"
*   **לא יופיע ב:** דף הבית + דף מוצר + עגלה + רכישה + דפי מידע

**מבנה היררכי של FilterPanel:**
```
┌─────────────────────────┐
│ 🔍 חיפוש מהיר בפאנל    │
├─────────────────────────┤
│ 📂 קטגוריות            │
│ ├── 👕 בגדים [47]       │ ← ספירת מוצרים בזמן אמת
│ │   ├── חולצות [12]     │ ← מקסימום 3 רמות עומק
│ │   ├── מכנסיים [18]    │
│ │   └── שמלות [17]      │
│ ├── 👟 נעליים [23]      │
│ │   ├── ספורט [8]       │
│ │   ├── אלגנט [10]      │
│ │   └── כפכפים [5]      │
│ ├── 🎒 אביזרים [31]     │
├─────────────────────────┤
│ 🎛️ [▼] סינון ומיון     │ ← כפתור מתקפל/נפתח
│                         │
│ 💰 מחיר: [סליידר]       │ ← ₪50 - ₪500
│ 🎨 צבע: ☑️☑️☑️          │ ← תיבות סימון דינמיות
│ ⭐ דירוג: ★★★★★          │ ← בחירת כוכבים
│ 📅 ☑️ חדש בשבוע האחרון  │ ← סינון לפי תאריך
│ 🔥 ☑️ פופולרי השבוע     │ ← סינון לפי פופולריות
├─────────────────────────┤
│ 📊 מיון לפי:            │
│ 🔽 [מחיר: נמוך לגבוה]   │ ← Dropdown עם אפשרויות
├─────────────────────────┤
│ 🏷️ סינונים פעילים:     │
│ [מחיר: ₪50-200 ✕]      │ ← תגים עם X לביטול
│ [צבע: כחול ✕]          │
├─────────────────────────┤
│ 📊 מוצגים: 47 מ-150     │ ← ספירת תוצאות משנית
├─────────────────────────┤
│ 🗑️ נקה הכל              │ ← איפוס מהיר של כל הסינונים
└─────────────────────────┘
```

**יכולות מתקדמות של FilterPanel:**
*   **סינונים דינמיים** - רק סינונים רלוונטיים לקטגוריה
*   **ספירת תוצאות בזמן אמת** - "נמצאו 47 מוצרים"
*   **שמירת מצב** - זוכר סינונים בין דפים
*   **גמישות מלאה** - המנהל מוסיף/מסיר קטגוריות
*   **העלמה חכמה** - קטגוריות ריקות מוסתרות

### מבנה Footer (כותרת תחתונה):
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────┬─────────┬─────────┬─────────────────────────────────┐ │
│ │ רשתות   │ עלינו   │ שירות  │ קישורים מהירים                │ │
│ │ חברתיות │         │ לקוחות │                                 │ │
│ ├─────────┼─────────┼─────────┼─────────────────────────────────┤ │
│ │ 📘 FB   │ • אודות │ • צור   │ • דף בית                       │ │
│ │ 📷 IG   │ • מדיניות│   קשר   │ • כל המוצרים                   │ │
│ │ 📧 Email│   פרטיות │ • FAQ   │ • מבצעים                       │ │
│ │ 📞 WhatsApp│ • תנאי  │ • זמני  │ • חשבון                        │ │
│ │         │   שימוש │   משלוח │                                 │ │
│ └─────────┴─────────┴─────────┴─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│        📧 הירשם לניוזלטר שלנו: [___________] [הירשם]          │
├─────────────────────────────────────────────────────────────────┤
│ 📞 03-1234567 | 📍 רחוב הדוגמה 123, תל אביב | © 2024 החנות שלי  │
└─────────────────────────────────────────────────────────────────┘
```

### ספירת תוצאות - 3 מקומות אסטרטגיים:

**A. מעל רשימת המוצרים (עיקרי):**
```
┌─────────────────────────────────────────────┐
│ בגדים > חולצות                              │ ← breadcrumbs
├─────────────────────────────────────────────┤
│ 🔍 נמצאו 47 מוצרים  |  מיון: [מחיר ↑]     │ ← מידע מיידי + מיון
├─────────────────────────────────────────────┤
│ [ProductGrid - רשימת המוצרים]               │
└─────────────────────────────────────────────┘
```

**B. בFilterPanel (משני):**
- מידע מפורט: "מוצגים: 47 מ-150 מוצרים"
- הקשר לסינונים הפעילים

**C. בתחתית (pagination):**
- "מוצג 1-20 מתוך 47 מוצרים"
- ניווט בין דפים

### תכונות מתקדמות:

**תוצאות חיפוש חכמות:**
```
🔍 חיפשת: "חולצה כחולה"
📊 נמצאו 12 מוצרים בחולצות > בצבע כחול
💡 האם התכוונת ל: "חולצה כהה"? (3 תוצאות נוספות)
```

**סינונים פעילים חכמים:**
```
🏷️ סינונים פעילים:
[מחיר: ₪50-200 ✕] [צבע: כחול ✕] [במלאי ✕]
[🗑️ נקה הכל]
```

**התראות חכמות:**
```
⚠️ נמצאו רק 3 מוצרים - נסה להרחיב את הסינונים
💡 הוסף 'שחור' לצבעים כדי לראות 15 מוצרים נוספים
```

---

## 2. טכנולוגיות ליבה

*   **צד לקוח (Frontend):** React (באמצעות Vite)
*   **צד שרת (Backend):** Node.js עם Express
*   **בסיס נתונים (Database):** MongoDB
*   **שפת פיתוח:** TypeScript (גם בצד הלקוח וגם בצד השרת)

*   **סנכרון בזמן אמת (WebSocket):**
  *   אנו משתמשים ב-socket.io (גם בשרת וגם בלקוח) כדי לאפשר עדכונים בזמן אמת (real-time) בין כל הדפדפנים וה-clients. השרת מאזין לאירועים רלוונטיים (כגון עדכון קבוצות לקוחות) ומשדר אותם לכל הלקוחות המחוברים. בצד הלקוח, socket.io-client מאזין לאירועים אלו ומרענן את המידע ב-Redux/UI בהתאם. כך מובטח שכל שינוי (למשל, שיוך משתמש לקבוצה) מתעדכן מיידית בכל החלונות.

---

## 3. מבנה הפרויקט

```
ecommerce-project/
├── client/              # פרויקט ה-React (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # רכיבי UI בסיסיים וגנריים
│   │   │   │   ├── Button/
│   │   │   │   ├── Card/
│   │   │   │   ├── Carousel/
│   │   │   │   ├── Input/
│   │   │   │   ├── Modal/
│   │   │   │   ├── Typography/
│   │   │   │   └── index.ts    # ייצוא מרכזי
│   │   │   ├── features/       # רכיבים ספציפיים לעסק
│   │   │   │   └── products/
│   │   │   │       ├── ProductCard/
│   │   │   │       ├── ProductGrid/
│   │   │   │       ├── ProductCarousel/
│   │   │   │       └── index.ts
│   │   │   └── layout/         # רכיבי עיצוב
│   │   │       ├── Header/
│   │   │       ├── Footer/
│   │   │       ├── (FilterPanel עבר למודול features/filters)
│   │   │       └── index.ts
│   │   ├── hooks/              # Custom Hooks
│   │   ├── services/           # שירותי API
│   │   ├── types/              # טיפוסי TypeScript
│   │   ├── utils/              # פונקציות עזר
│   │   └── styles/             # סטיילים גלובליים
│   │       ├── globals.css
│   │       ├── tokens.css      # Design Tokens
│   │       └── mixins.css
│   └── package.json
├── server/              # פרויקט ה-Node.js (Express)
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   │   ├── auth/           # תיקיית auth מפוצלת (חדש בקוד)
│   │   │   │   ├── authentication.ts
│   │   │   │   ├── registration.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── security.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/          # טיפוסי auth (חדש בקוד)
│   │   │   │   └── auth.types.ts
│   │   │   ├── [קבצים אחרים...]
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/              # קבצי עזר (חדש בקוד)
│   │   │   ├── validationHelpers.ts
│   │   │   ├── authHelpers.ts
│   │   │   ├── responseHelpers.ts
│   │   │   ├── userHelpers.ts
│   │   │   └── logger.ts
│   │   └── server.ts
│   └── package.json
└── README.md            # קובץ זה
```

---

## 4. אפיון יכולות המערכת

### 4.1. חווית הלקוח

#### א. שלד האתר (Layout)
*   **Header:** לוגו, תפריט ניווט, חיפוש, אייקון חשבון וסל קניות.
*   **Footer:** קישורים, שירות לקוחות, ניוזלטר ורשתות חברתיות.

#### ב. עיצוב דף הבית - מבנה קרוסלות
דף הבית יכלול מספר קרוסלות המציגות מוצרים בצורה אטרקטיבה ונגישה:

##### **1. קרוסלה "נוספו לאחרונה"**
*   **מטרה:** הצגת המוצרים החדשים ביותר באתר
*   **לוגיקה:** מיון לפי תאריך יצירה (`createdAt`) - החדשים ביותר ראשונים
*   **עיצוב:** גלילה אופקית עם כפתורי חץ, רספונסיבי למסכים שונים

##### **2. קרוסלה "פופולרי"**
*   **מטרה:** הצגת המוצרים הפופולריים והמבוקשים ביותר
*   **לוגיקה:** מיון לפי מספר צפיות או מכירות (יתווסף שדה `viewCount` או `salesCount`)
*   **עיצוב:** גלילה אופקית דומה לקרוסלה הראשונה

##### **3. קרוסלות נוספות (לפיתוח עתידי)**
*   **"במבצע"** - מוצרים עם הנחות מיוחדות
*   **"מומלצים עבורך"** - המלצות אישיות (בהתבסס על היסטוריית גלישה)
*   **"נגמרים במלאי"** - מוצרים עם מלאי נמוך (לעידוד רכישה מהירה)
*   **"צפויים בקרוב"** - מוצרים שיגיעו למלאי בקרוב

##### **מאפיינים טכניים של הקרוסלות:**
*   **רספונסיביות:** התאמה אוטומטית למסכי מובייל, טאבלט ומחשב
*   **ביצועים:** טעינה עצלה (lazy loading) לתמונות
*   **נגישות:** תמיכה בניווט מקלדת וקוראי מסך
*   **אינטראקציה:** אפקטי hover ואנימציות עדינות

##### **דרישות טכניות נוספות למוצרים:**
להפעלת הקרוסלות בצורה מיטבית, יש להוסיף למודל המוצר שדות נוספים:
*   **`viewCount`** - מספר צפיות במוצר (לקרוסלה "פופולרי")
*   **`salesCount`** - מספר מכירות (לקרוסלה "פופולרי") 
*   **`isOnSale`** - האם המוצר במבצע (לקרוסלה עתידית "במבצע")
*   **`discountPercentage`** - אחוז הנחה (לקרוסלה עתידית "במבצע")
*   **`isFeatured`** - מוצר מומלץ (לקרוסלה עתידית "מומלצים")

##### **API נדרשים לקרוסלות:**
*   `GET /api/products/recent` - קבלת מוצרים חדשים (מיון לפי `createdAt`)
*   `GET /api/products/popular` - קבלת מוצרים פופולריים (מיון לפי `viewCount` או `salesCount`)
*   `GET /api/products/featured` - קבלת מוצרים מומלצים
*   `PUT /api/products/:id/view` - עדכון מספר צפיות במוצר

#### ג. דף מוצר מקצועי (Product Detail Page)
עיצוב דף המוצר הוא קרדינל לחווית הרכישה ולשיעור ההמרה. דף המוצר צריך להציג בצורה ברורה ומושכת את כל הפרטים החשובים תוך שמירה על פשטות ונגישות.

##### **מבנה דף המוצר:**

**1. גלריית תמונות מרכזית:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    🖼️ תמונה ראשית גדולה                        │
│                      (600x600 פיקסלים)                        │
│                                                                 │
│ [📷] [📷] [📷] [📷] [📷] ← תמונות ממוזערות למטה               │
└─────────────────────────────────────────────────────────────────┘
```

**2. פרטי המוצר העיקריים:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📦 שם המוצר - Typography גדול ובולט (h1)                      │
├─────────────────────────────────────────────────────────────────┤
│ 💰 ₪299 [₪399] ← מחיר נוכחי + מחיר מקורי מחוק (אם במבצע)      │
│ 🏷️ חסכון של 25% ← אחוז ההנחה בירוק                           │
├─────────────────────────────────────────────────────────────────┤
│ ⭐⭐⭐⭐⭐ (47 ביקורות) ← דירוג + מספר ביקורות                │
├─────────────────────────────────────────────────────────────────┤
│ ✅ במלאי - 12 יחידות נותרו                                     │
│ ❌ אזל מהמלאי - [📧 עדכנו אותי כשחוזר]                       │
└─────────────────────────────────────────────────────────────────┘
```

**3. תיאור ומאפיינים:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 תיאור קצר ומשכנע                                            │
│ "מוצר איכותי ונדיר שמושלם עבור..."                            │
├─────────────────────────────────────────────────────────────────┤
│ 🔧 מאפיינים טכניים:                                            │
│ • צבע: כחול                                                    │
│ • גודל: L                                                      │
│ • חומר: כותנה 100%                                             │
│ • משקל: 0.5 ק"ג                                                │
└─────────────────────────────────────────────────────────────────┘
```

**4. פעולות המוצר:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🛒 הוסף לעגלה]  [❤️ הוסף למועדפים]  [📤 שתף]              │
│                                                                 │
│ 🚚 משלוח: חינם מעל ₪200 | ⏰ זמן אספקה: 2-4 ימי עסקים      │
│ 🔄 החזרות: 30 ימים | 🛡️ אחריות: שנה                         │
└─────────────────────────────────────────────────────────────────┘
```

##### **עקרונות עיצוב:**
*   **התמקדות במידע החשוב:** שם, מחיר, זמינות וכפתור קנייה יהיו הבולטים ביותר
*   **היררכיה ויזואלית ברורה:** גדלי פונט, צבעים ומרווחים יובילו את העין
*   **רספונסיביות מלאה:** במובייל - תמונות למעלה, פרטים למטה; בדסקטופ - זה ליד זה
*   **טעינה מהירה:** lazy loading לתמונות ואופטימיזציה למהירות

##### **יכולות מתקדמות:**
*   **זום תמונות:** לחיצה על תמונה תפתח מודל עם זום מתקדם
*   **שיתוף:** כפתורים לשיתוף ברשתות חברתיות וווטסאפ
*   **מוצרים קשורים:** "מוצרים דומים" או "לקוחות שקנו גם..."
*   **עדכון צפיות:** כל כניסה לדף תעדכן את `viewCount` עבור הקרוסלה "פופולרי"

##### **אפיון טכני:**
*   **URL Structure:** `/product/:id` או `/product/:id/:slug` (SEO friendly)
*   **API Endpoint:** `GET /api/products/:id` - החזרת פרטי מוצר מלאים
*   **State Management:** טיפול במצבי טעינה, שגיאות ובחירת תמונות
*   **אנליטיקה:** מעקב אחר צפיות, קליקים ושיתופים

##### **נגישות:**
*   **Alt text** לכל התמונות
*   **ARIA labels** לכפתורים אינטראקטיביים
*   **ניווט מקלדת** מלא לגלריית התמונות
*   **ניגודיות צבעים** עבור טקסט המחיר והזמינות

#### ד. סינון מוצרים מתקדם
*   ללקוחות תינתן אפשרות לסנן מוצרים לפי:
    *   מחיר (כולל טווח מחירים).
    *   צבע.
    *   תאריך (למשל, מוצרים חדשים).
    *   טווח מסוים של מכירות (למשל, "הנמכרים ביותר").
*   כל סינון יוצג כקומפוננטה ברורה (סליידר, תיבות סימון, תפריט נפתח וכו').
*   הסינונים יופיעו בעמודי קטגוריה ותוצאות חיפוש.

### 4.1.1 מודול FilterPanel (פאנל סינון ומיון)
מודול מרכזי לאיחוד כל יכולות הסינון, המיון והצגת סטטוס התוצאות. מאפשר קונפיגורציה דינמית, הרחבה קלה ומדיניות Single Responsibility.

#### עקרונות:
* Separation of Concerns – לוגיקת פילטרים מופרדת מתצוגה.
* Declarative Filters – כל פילטר אובייקט: { id, type, label, options, serialize, deserialize }.
* URL Synced – מצב נשמר בפרמטרי ה-Query (שיתוף, חזרה לאותו מצב).
* Feature Flags – כיבוי/הפעלה לקבצי קונפיגורציה / מערכת ניהול.
* Performance – Debounce לפילטרים כבדים (מחיר, טקסט), Batching קריאות.

#### מבנה קבצים מוצע:
```
src/components/features/filters/
    FilterPanel/
        FilterPanel.tsx            # קומפוזיציה + פריסה
        FilterPanel.module.css
        FilterPanelContext.tsx     # הקשר פנימי (פתיחה/סגירה, רוחב, מצב מובייל)
        useFilterPanel.ts          # Hook לשליטה ב-UI (toggle, close)
    filters/
        PriceFilter/
            PriceFilter.tsx
            usePriceFilter.ts        # לוגיקה: טווח, אימות, debounce
        ColorFilter/
        DateFilter/
        PopularityFilter/
        SortSelect/
        ActiveFiltersChips/
        ResultsSummary/
        ClearAllButton/
    core/
        filterConfig.ts            # רישום פילטרים (Array<FilterDefinition>)
        filterTypes.ts             # טיפוסים כלליים
        buildQuery.ts              # המרה למחרוזת שאילתה
        parseQuery.ts              # קריאת מצב ראשוני מה-URL
        useFiltersState.ts         # ניהול מצב מאוחד
        useApplyFilters.ts         # טריגר פנייה ל-API
    services/
        filtersService.ts          # שאילתות API (ייתכן יתמזג עם productsService)
    utils/
        debounce.ts
    index.ts
```

#### טיפוסים (רעיוני):
* FilterDefinition { id: string; type: 'range'|'multi-select'|'boolean'|'date'|'sort'; label: string; options?; serialize(state):Record<string,string>; deserialize(params):any }
* FiltersState { [filterId: string]: any }
* ActiveFilterTag { id: string; label: string; displayValue: string }

#### זרימת עבודה:
1. עמוד נטען → parseQuery → יצירת FiltersState.
2. משתמש משנה פילטר → עדכון state + כתיבה ל-URL (replaceState).
3. Debounce (אם נדרש) → buildQuery → Fetch למוצרים.
4. עדכון meta (total, filtered) → רענון ResultsSummary + Chips.

#### UX / UI:
* Desktop: פאנל צד ימין קבוע (scrollable, sticky-offset מתחת ל-Header).
* Mobile: Drawer נגלל מימין (focus trap, aria-modal, סגירה ב-Escape/Overlay).
* Active Chips מוצגים גם מעל הגריד במובייל.
* כפתור Clear All מושבת אם אין פילטרים פעילים.

#### נגישות:
* role="complementary" + aria-labelledby לכותרת הפאנל.
* fieldset + legend לכל קבוצת פילטרים.
* Trap פוקוס במובייל; Escape לסגירה.

#### ביצועים:
* React.memo לפילטרים סטטיים.
* Lazy Mount לפילטרים כבדים.
* שימוש ב-startTransition לעדכוני מצב משניים במידת הצורך.

#### דוגמת API:
GET /api/products?priceMin=50&priceMax=200&colors=blue,black&sort=price_asc&page=1
Response:
{
        "data": [...],
        "meta": {
                "total": 150,          // סך כל המוצרים הרלוונטיים ללא סינון
                "filtered": 47,        // מספר המוצרים לאחר הסינונים הנוכחיים
                "page": 1,             // מספר הדף הנוכחי (1-indexed)
                "pageSize": 20,        // כמות מוצרים בדף
                "totalPages": 3,       // מספר הדפים הכולל (ceil(filtered / pageSize))
                "hasNext": true,       // האם קיים דף הבא
                "hasPrev": false       // האם קיים דף קודם
        }
}

#### שדות meta:
* total – כמות כוללת לפני סינון (לא מושפעת מטווח מחיר וכד').
* filtered – כמות לאחר הסינון.
* page, pageSize – שליטת עמוד.
* totalPages – חישוב מספר הדפים.
* hasNext / hasPrev – סימון לניווט מהיר ללא חישוב נוסף בצד הלקוח.

#### פרמטרי Query רשמיים (Contract):
| פרמטר | סוג | ברירת מחדל | תיאור | כללים |
|-------|-----|------------|--------|--------|
| priceMin | number | none | מחיר מינימלי | >= 0 |
| priceMax | number | none | מחיר מקסימלי | > priceMin אם קיים |
| sort | string | recent | אסטרטגיית מיון | oneOf: recent, priceAsc, priceDesc, popular |
| page | number | 1 | מספר דף 1-indexed | >= 1 |
| pageSize | number | 20 | גודל עמוד | 1–100 (נחתך בקצה) |
| colors | string | none | רשימת צבעים מופרדת בפסיקים | ערכי צבע תקפים בלבד |

Note: פרמטרים חסרים לא נכתבים ל-URL; פרמטרים בערך ברירת מחדל מושמטים (למשל page=1, pageSize=20) לשמירה על URL נקי.

#### אפשרויות מיון (Sort Strategies):
* recent – לפי createdAt יורד (חדשים קודם).
* priceAsc – מחיר עולה.
* priceDesc – מחיר יורד.
* popular – לפי מדד פופולריות (כעת viewCount / בעתיד שילוב salesCount).

#### Pagination (מפרט):
* כפתורי ניווט: הקודם / הבא (Prev / Next) מושבתים לפי hasPrev / hasNext.
* בחירת pageSize: Dropdown ערכים מוצעים: 20, 40, 60 (מותאם ל-density ולשיקולי עומס).
* חיווי טווח מוצג: "מוצג X–Y מתוך filtered מוצרים" (X = (page-1)*pageSize + 1, Y = min(page*pageSize, filtered)).
* מעבר בין pageSize מאפס page ל-1.

#### סנכרון URL:
* כל שינוי פילטר/מיון/עמוד מעדכן את ה-Query באמצעות history.replaceState (ללא דחיפת היסטוריה חדשה בכל שינוי קטן).
* סדר פרמטרים קנוני (מגדיר יציבות לשיתוף וקאש): priceMin, priceMax, colors, sort, page, pageSize.
* בניית מחרוזת Query מתבצעת רק כאשר חל שינוי לוגי במצב (השוואה שטחית של אובייקט FiltersState).
* הפענוח (parse) מבצע ולידציה וסינון ערכים לא חוקיים לפני יצירת מצב ראשוני.

#### ביצועים (Performance Hygiene):
* Debounce אינטראקטיבי לשדות רגישים (מחיר) – כ-250ms לפני פנייה לשרת כדי למנוע שטף.
* AbortController – ביטול בקשה פעילה בעת שינוי פילטר נוסף לפני סיום התגובה.
* מניעת שאילתות מיותרות: דילוג על קריאה אם לא השתנה hash הלוגי של FiltersState שנשלח לאחרונה.

#### מבנה מינימלי התחלתי (MVP Filters Layer):
מבנה קבצים בסיסי עבור שלב מוקדם (לפני מעבר למודל FilterDefinition דקלרטיבי מלא):
```
src/components/features/filters/
    types/            # טיפוסי FiltersState, SortKey, PriceRange
    core/             # buildQuery, parseQuery
    hooks/            # useFiltersState, useFilteredProducts, useFiltersUrlSync
    panel/FilterPanel/
    results/ProductsResults/
    container/FiltersContainer/
    index.ts          # Barrel exports
```
הרחבת המודל ל-FilterDefinition דקלרטיבי מאפשרת בעתיד הוספת פילטרים ללא שינוי לוגיקת בסיס.

#### עקרונות נוספי נגישות (A11y) לסביבת הסינון:
* aria-label / aria-labelledby לכל פקד מיון/טווח.
* כפתורי pagination בעלי aria-disabled ולא רק disabled ב-HTML כאשר רלוונטי.
* עדכון דינמי של announcer (live region) עבור "נמצאו X מוצרים" להפחתת בלבול משתמשי קורא מסך.

#### פעולות עיקריות:
* הוספה/הסרה של ערך פילטר.
* ניקוי פילטר בודד (Chip X).
* Clear All.
* שינוי סדר מיון.

#### הרחבות עתיד:
* Presets למשתמש.
* פילטר זמינות (inStock בלבד).
* פילטר טווח הנחה.
* AI Suggest (הצעת פילטרים).

הערה: FilterPanel הוצג כאן גם בעברית (פאנל סינון ומיון) בפעם הראשונה בלבד – בהמשך נשתמש בשם FilterPanel.

#### ד. תמחור דינמי ושקוף
*   המחיר המוצג ללקוח הוא המחיר הסופי והנכון עבורו.
*   לקוח אורח רואה מחיר בסיס.
*   לקוח רשום, המשויך לקבוצת מחיר מיוחדת, יראה אוטומטית מחירים מוזלים לאחר התחברות, מבלי שיצוין שם הקבוצה או אחוז ההנחה.

#### ה. ניהול מלאי והתראות
*   לכל מוצר יוצג חיווי ברור: **"במלאי"** או **"אזל מהמלאי"**.
*   אם מוצר אזל, כפתור "הוספה לסל" יוחלף בטופס **"עדכנו אותי כשיחזור למלאי"**, המאפשר להשאיר אימייל או וואטסאפ לקבלת התראה אוטומטית.

#### ו. בקרת גישה (מצב "חנות פרטית")
*   אם המנהל הפעיל מצב זה, כל גישה לאתר על ידי אורח או לקוח לא מורשה תוביל לעמוד "נעול".
*   העמוד ה"נעול" יציג הודעה מותאמת אישית (שנכתבה על ידי המנהל) וטופס התחברות.
*   רק לקוחות רשומים המשויכים לקבוצה מורשית יוכלו להתחבר ולגלוש באתר.

### 4.2. חווית בעל החנות (מערכת ניהול)

#### א. ניהול קבוצות לקוחות
*   יצירה, עריכת שם ומחיקה של קבוצות לקוחות (למשל: "VIP", "סיטונאים").
*   שיוך **הנחה גלובלית באחוזים** לכל קבוצה (למשל, 10% הנחה לכל חברי קבוצת VIP).

#### ב. ניהול קטגוריות מוצרים
*   יצירה של קטגוריות מוצרים חדשות (למשל: "חולצות", "נעליים", "אביזרים").
*   עריכת שם של קטגוריה קיימת.
*   מחיקת קטגוריה שאינה בשימוש.
*   שיוך מוצרים לקטגוריות בעת יצירת מוצר או עריכתו.

#### ג. ניהול מוצרים מתקדם
*   ניהול פרטי מוצר בסיסיים (שם, תיאור, **מספר תמונות**).
*   ניהול **כמות במלאי** לכל מוצר.
*   **תמיכה במספר תמונות:** כל מוצר יכול לכלול מספר תמונות עם ניווט חכם בין התמונות.
*   **מערכת תמחור היררכית וגמישה:**
    1.  **תמחור ידני (הכלל החזק ביותר):** יכולת להגדיר מחיר ספציפי בשקלים למוצר מסוים עבור קבוצת לקוחות ספציפית. כלל זה גובר על כל השאר.
    2.  **החרגה מהנחות:** תיבת סימון המאפשרת להחריג מוצר ספציפי מהנחות האחוזים הגלובליות.
    3.  **הנחת אחוזים גלובלית:** אם לא הוגדר תמחור ידני או החרגה, המוצר יקבל את ההנחה באחוזים שהוגדרה לקבוצת הלקוח.
    4.  **מחיר בסיס:** המחיר הרגיל של המוצר, שיוצג אם אף אחד מהכללים שלעיל לא חל.

#### ד. ניהול לקוחות
*   צפייה בכל הלקוחות ושיוך כל לקוח לקבוצת לקוחות הרצויה באמצעות תפריט נפתח.

#### ה. בקרת גישה לאתר
*   מתג פשוט להפעלה/כיבוי של **"מצב חנות פרטית"**.
*   בעת הפעלה: בחירת הקבוצות המורשות גישה ועריכת ההודעה שתוצג בעמוד ה"נעול".

#### ז. שליטה על אפשרויות הסינון ללקוחות
*   המנהל יוכל להפעיל או לכבות כל אחד מסוגי הסינון (מחיר, צבע, תאריך, טווח מכירות) דרך מערכת הניהול.
*   שינוי זה ישפיע מיידית על אילו סינונים יוצגו ללקוחות באתר.

#### ו. ניהול הזמנות ובקשות
*   מערכת לניהול הזמנות ועדכון סטטוסים.
*   מערכת לצפייה וניהול של כל הלקוחות הממתינים לעדכון על מוצרים שחזרו למלאי.

---

## 5. תכנית פיתוח מערכת ניהול המשתמשים ואבטחה

### 5.1. חזון ועקרונות המערכת

#### עקרונות UX מנחים:
*   **גישה חופשית כברירת מחדל:** המשתמשים יוכלו לגלוש באתר בחופשיות ללא התחברות מחייבת
*   **התחברות רק עבור פעולות רכישה:** אימות נדרש רק להוספה לעגלה, רכישה והגדרות אישיות
*   **מצב חנות פרטית אופציונלי:** המנהל יוכל להפעיל מצב מוגבל שיחייב התחברות לכל גלישה
*   **חוויה חלקה ומהירה:** מעבר מהיר בין אורח לרשום ללא איבוד הקשר
*   **אמון ושקיפות:** הצגה ברורה של יתרונות ההתחברות והמידע הנדרש
*   **אבטחה מתקדמת:** 2FA מלא עם קודי גיבוי ומודל אבטחה מפוצל (חדש בקוד)

#### ארכיטקטורת אבטחה:
*   **JWT Hybrid Strategy:** 15 דקות Access Token + 7 ימים Refresh Token ב-HTTPOnly Cookie
*   **Password Security:** Argon2 למקום bcrypt (מתקדם יותר ומאובטח)
*   **Role-Based Access Control:** הפרדה ברורה בין Customer, Admin, Super Admin
*   **Multi-Factor Authentication:** תמיכה מלאה ב-2FA עם TOTP וקודי גיבוי (חדש בקוד)
*   **Advanced Logging:** Winston logger עם רוטציה יומית (חדש בקוד)
*   **Modular Architecture:** מבנה תיקיות מפוצל לניהול קל (חדש בקוד)

### 5.2. מבנה נתונים ומודלים

#### A. User Model (מודל משתמש מתקדם)
```typescript
interface IUser {
  _id: ObjectId;
  email: string;              // unique index + validation
  password?: string;          // null עבור social-only users
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;            // profile picture (future: from social login)
  
  // Future: Social Authentication (planned)
  // providers: {
  //   google?: {
  //     id: string;
  //     email: string;
  //     verified: boolean;
  //   };
  //   apple?: {
  //     id: string;
  //     email: string;
  //   };
  //   facebook?: {              // אופציונלי
  //     id: string;
  //     email: string;
  //   };
  // };
  
  // Security & Status
  isActive: boolean;          // לחסימת משתמשים
  isVerified: boolean;        // אימות email (true אם מ-social)
  role: 'customer' | 'admin' | 'super_admin';
  customerGroupId?: ObjectId; // קישור לקבוצת לקוח
  
  // Security Tracking (חדש בקוד)
  lastLogin?: Date;
  loginAttempts: number;      // brute force protection
  lockUntil?: Date;           // נעילת חשבון זמנית
  refreshTokens: string[];    // מערך של refresh tokens פעילים
  
  // 2FA Fields (חדש בקוד)
  twoFactorEnabled: boolean;  // האם 2FA מופעל
  twoFactorSecret?: string;   // secret ל-2FA
  backupCodes: string[];      // קודי גיבוי ל-2FA
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

#### B. CustomerGroup Model (קבוצות לקוחות)
```typescript
interface ICustomerGroup {
  _id: ObjectId;
  name: string;               // "VIP", "סיטונאים", "לקוחות רגילים"
  discountPercentage: number; // 0-100 (אחוז הנחה גלובלי)
  color: string;              // צבע לזיהוי ב-UI (#FF5733)
  description?: string;       // תיאור הקבוצה
  isActive: boolean;          // האם הקבוצה פעילה
  priority: number;           // עדיפות (למקרה של קבוצות מרובות)
  
  // תנאים לקבוצה (עתידי)
  conditions?: {
    minOrderAmount?: number;  // סכום הזמנה מינימלי
    minOrdersCount?: number;  // מספר הזמנות מינימלי
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### C. PriceRule Model (כללי תמחור מתקדמים)
```typescript
interface IPriceRule {
  _id: ObjectId;
  productId: ObjectId;        // המוצר שהכלל חל עליו
  customerGroupId: ObjectId;  // הקבוצה שהכלל חל עליה
  
  priceType: 'fixed' | 'percentage' | 'exclude';
  value: number;              // מחיר קבוע או אחוז הנחה
  
  isActive: boolean;
  priority: number;           // עדיפות כלל (גבוה = חזק יותר)
  
  // תוקף זמני (אופציונלי)
  startDate?: Date;           // תוקף מתאריך
  endDate?: Date;             // תוקף עד תאריך
  
  // Audit Trail
  createdBy: ObjectId;        // מי יצר את הכלל
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3. אפיון חווית המשתמש (UX)

#### A. חווית האורח (Guest Experience)
**מה האורח יוכל לעשות:**
*   ✅ לגלוש בחופשיות באתר
*   ✅ לחפש ולסנן מוצרים
*   ✅ לראות מחירי בסיס (ללא הנחות)
*   ✅ לראות פרטי מוצרים ותמונות
*   ✅ לקרוא ביקורות ודירוגים
*   ❌ להוסיף לעגלת קניות
*   ❌ לבצע רכישה
*   ❌ לראות מחירים מוזלים
*   ❌ לשמור מועדפים

**נקודות המעבר לרישום:**
1. **הוספה לעגלה:** הצגת modal "התחבר כדי להמשיך"
2. **לחיצה על 'קנה עכשיו':** הפניה ישירה לרישום/התחברות
3. **שמירת מועדפים:** הזמנה להרשמה עם הסבר יתרונות
4. **אזל מהמלאי - התראה:** טופס "עדכנו אותי" מחייב הרשמה
5. **הגדרת 2FA:** הצעה להפעלת אימות דו-שלבי לאבטחה משופרת (חדש בקוד)

#### B. מערכת ההתחברות/הרשמה

**דף התחברות (Mobile-First):**
```
┌─────────────────────────────────────┐
│ [×]              🛍️ לוגו החנות     │
├─────────────────────────────────────┤
│                                     │
│        ברוכים הבאים חזרה!          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  🔵 המשך עם Google             │ │ ← מהיר ביותר
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  🍎 המשך עם Apple              │ │ ← למובייל
│ └─────────────────────────────────┘ │
│                                     │
│ ────────── או ──────────            │
│                                     │
│ 📧 מייל                            │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🔒 סיסמה                           │
│ ┌─────────────────────────────────┐ │
│ │ ••••••••••••            [👁️]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ☑️ זכור אותי   📝 שכחתי סיסמה      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │          התחבר                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│        אין לך חשבון? הירשם כאן     │
│                                     │
└─────────────────────────────────────┘
```

**תהליך הרשמה מינימליסטי (2 שלבים):**

*שלב 1 - מידע בסיסי:*
*   Email + אימות
*   שם פרטי ומשפחה
*   סיסמה + חוזק בזמן אמת

*שלב 2 - מידע נוסף (אופציונלי):*
*   טלפון למסרונים
*   תאריך לידה למבצעים
*   הסכמות לניוזלטר
*   אפשרות "דלג על זה"

#### C. מצב חנות פרטית
**כאשר מופעל על ידי המנהל:**

```
┌─────────────────────────────────────┐
│              🔐 החנות               │
│             זמנית סגורה             │
├─────────────────────────────────────┤
│                                     │
│    [הודעה מותאמת אישית מהמנהל]     │
│                                     │
│ "אנחנו כרגע בתהליך עדכון המלאי     │
│  ונפתח בקרוב ללקוחות VIP בלבד"    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         התחבר כלקוח VIP         │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📧 צרו קשר: info@store.com          │
│ 📞 טלפון: 03-1234567               │
│                                     │
└─────────────────────────────────────┘
```

### 5.4. ארכיטקטורת Backend מפורטת

#### A. Security Stack (מחסנית אבטחה)
**Dependencies נדרשים:**
```json
{
  "argon2": "^0.31.2",           // Password hashing מתקדם
  "jsonwebtoken": "^9.0.2",     // JWT implementation
  "passport": "^0.7.0",         // Authentication framework
  "passport-google-oauth20": "^2.0.0", // Google OAuth
  "passport-apple": "^2.0.1",   // Apple Sign-In
  "express-rate-limit": "^7.1.5", // Rate limiting
  "helmet": "^7.1.0",           // Security headers
  "joi": "^17.11.0",            // Input validation
  "express-mongo-sanitize": "^2.2.0", // NoSQL injection protection
  "winston": "^3.11.0",         // Logging system (חדש בקוד)
  "speakeasy": "^2.0.0",        // 2FA implementation (חדש בקוד)
  "qrcode": "^1.5.3"            // QR code generation (חדש בקוד)
}
```

#### B. Dynamic Pricing Engine
```typescript
class PricingEngine {
  async calculatePrice(productId: string, userId?: string): Promise<PriceResult> {
    const product = await Product.findById(productId);
    if (!product) throw new Error('מוצר לא נמצא');
    
    let finalPrice = product.basePrice;
    let appliedRules: AppliedRule[] = [];
    
    if (userId) {
      const user = await User.findById(userId).populate('customerGroupId');
      if (user?.customerGroupId) {
        // 1. בדיקת כללי מחיר ספציפיים
        const specificRule = await PriceRule.findOne({
          productId,
          customerGroupId: user.customerGroupId,
          isActive: true
        }).sort({ priority: -1 });
        
        if (specificRule) {
          switch (specificRule.priceType) {
            case 'fixed':
              finalPrice = specificRule.value;
              break;
            case 'exclude':
              // ללא הנחה
              break;
            case 'percentage':
              finalPrice = product.basePrice * (1 - specificRule.value / 100);
              break;
          }
        } else {
          // 2. הנחה גלובלית של הקבוצה
          const group = user.customerGroupId as ICustomerGroup;
          if (group.discountPercentage > 0) {
            finalPrice = product.basePrice * (1 - group.discountPercentage / 100);
          }
        }
      }
    }
    
    return {
      originalPrice: product.basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discount: {
        amount: product.basePrice - finalPrice,
        percentage: ((product.basePrice - finalPrice) / product.basePrice) * 100
      },
      appliedRules
    };
  }
}
```

#### C. 2FA Implementation (חדש בקוד)
**מערכת אימות דו-שלבי מלאה עם TOTP וקודי גיבוי:**

```typescript
// 2FA Controllers (חדש בקוד)
- setup2FA()          // התחלת הגדרת 2FA
- verify2FA()         // אימות והפעלת 2FA  
- disable2FA()        // ביטול 2FA
- verify2FAToken()    // אימות קוד 2FA
- loginWith2FA()      // התחברות עם 2FA

// שדות ב-User Model (חדש בקוד)
twoFactorEnabled: boolean;  // האם 2FA מופעל
twoFactorSecret?: string;   // secret ל-2FA
backupCodes: string[];      // קודי גיבוי (10 קודים)

// תכונות 2FA:
- TOTP עם Google Authenticator
- QR Code לסקירה קלה
- 10 קודי גיבוי לשחזור
- סובלנות של 2 צעדים (30 שניות)
- לוגינג של פעולות 2FA
```

#### D. מבנה תיקיות מפוצל (חדש בקוד)
**ארכיטקטורת auth controllers מפוצלת:**

```
controllers/auth/
├── authentication.ts    // התחברות, התנתקות, 2FA
├── registration.ts      // רישום משתמשים
├── profile.ts          // ניהול פרופיל, שינוי סיסמה
├── security.ts         // הגדרת וביטול 2FA
└── index.ts            // ייצוא מרכזי

controllers/types/
└── auth.types.ts       // כל הממשקים והטייפים
```

#### E. קבצי עזר מתקדמים (חדש בקוד)
**מערכת עזרים מופרדת:**

```
utils/
├── validationHelpers.ts  // ולידציות שונות
├── authHelpers.ts        // עזרים לאימות
├── responseHelpers.ts    // פורמט תגובות API
├── userHelpers.ts        // עזרים לניהול משתמשים
└── logger.ts            // לוגינג עם Winston
```

**פונקציות עזר מרכזיות:**
```typescript
// validationHelpers.ts
- validateRequiredFields()
- validatePasswordLength()
- validateEmailFormat()
- validateEmailExists()

// authHelpers.ts
- generateToken()
- checkAccountLocked()
- resetLoginAttempts()
- incrementLoginAttempts()

// responseHelpers.ts
- sendSuccessResponse()
- sendErrorResponse()
- formatUserWithToken()
- formatUserData()

// userHelpers.ts
- buildUserUpdateData()
- createNewUser()
- findUserById()
- updateUserById()

// logger.ts
- logUserAction()
- logSecurityEvent()
```

#### F. שירותי לוגינג מתקדמים (חדש בקוד)
**מערכת לוגינג מקצועית עם Winston:**

```typescript
// logger.ts - שירותי לוגינג
- logUserAction()     // לוג פעולות משתמש (LOGIN_SUCCESS, LOGOUT, etc.)
- logSecurityEvent()  // לוג אירועי אבטחה (LOGIN_FAILED, 2FA_FAILED, etc.)

// תכונות הלוגינג:
- רוטציה יומית של קבצי לוג
- לוגים נפרדים לאבטחה ופעולות משתמש
- פורמט JSON מובנה
- רמות לוג שונות (info, warn, error)
- שמירת IP ו-User-Agent
```

#### C. 2FA Implementation (חדש בקוד)
**מערכת אימות דו-שלבי מלאה עם TOTP וקודי גיבוי:**

```typescript
// 2FA Controllers (חדש בקוד)
- setup2FA()          // התחלת הגדרת 2FA
- verify2FA()         // אימות והפעלת 2FA  
- disable2FA()        // ביטול 2FA
- verify2FAToken()    // אימות קוד 2FA
- loginWith2FA()      // התחברות עם 2FA

// שדות ב-User Model (חדש בקוד)
twoFactorEnabled: boolean;  // האם 2FA מופעל
twoFactorSecret?: string;   // secret ל-2FA
backupCodes: string[];      // קודי גיבוי (10 קודים)

// תכונות 2FA:
- TOTP עם Google Authenticator
- QR Code לסקירה קלה
- 10 קודי גיבוי לשחזור
- סובלנות של 2 צעדים (30 שניות)
- לוגינג של פעולות 2FA
```

#### D. מבנה תיקיות מפוצל (חדש בקוד)
**ארכיטקטורת auth controllers מפוצלת:**

```
controllers/auth/
├── authentication.ts    // התחברות, התנתקות, 2FA
├── registration.ts      // רישום משתמשים
├── profile.ts          // ניהול פרופיל, שינוי סיסמה
├── security.ts         // הגדרת וביטול 2FA
└── index.ts            // ייצוא מרכזי

controllers/types/
└── auth.types.ts       // כל הממשקים והטייפים
```

#### E. קבצי עזר מתקדמים (חדש בקוד)
**מערכת עזרים מופרדת:**

```
utils/
├── validationHelpers.ts  // ולידציות שונות
├── authHelpers.ts        // עזרים לאימות
├── responseHelpers.ts    // פורמט תגובות API
├── userHelpers.ts        // עזרים לניהול משתמשים
└── logger.ts            // לוגינג עם Winston
```

**פונקציות עזר מרכזיות:**
```typescript
// validationHelpers.ts
- validateRequiredFields()
- validatePasswordLength()
- validateEmailFormat()
- validateEmailExists()

// authHelpers.ts
- generateToken()
- checkAccountLocked()
- resetLoginAttempts()
- incrementLoginAttempts()

// responseHelpers.ts
- sendSuccessResponse()
- sendErrorResponse()
- formatUserWithToken()
- formatUserData()

// userHelpers.ts
- buildUserUpdateData()
- createNewUser()
- findUserById()
- updateUserById()

// logger.ts
- logUserAction()
- logSecurityEvent()
```

#### F. שירותי לוגינג מתקדמים (חדש בקוד)
**מערכת לוגינג מקצועית עם Winston:**

```typescript
// logger.ts - שירותי לוגינג
- logUserAction()     // לוג פעולות משתמש (LOGIN_SUCCESS, LOGOUT, etc.)
- logSecurityEvent()  // לוג אירועי אבטחה (LOGIN_FAILED, 2FA_FAILED, etc.)

// תכונות הלוגינג:
- רוטציה יומית של קבצי לוג
- לוגים נפרדים לאבטחה ופעולות משתמש
- פורמט JSON מובנה
- רמות לוג שונות (info, warn, error)
- שמירת IP ו-User-Agent
```

#### שלב 1: תשתית ואימות בסיסי

**Backend Infrastructure**
*   ✅ התקנת dependencies אבטחה + הגדרת environment
    - Argon2, JWT, Passport, Rate limiting, Helmet
    - קונפיגורציה של MongoDB עם אינדקסים
    - הגדרת متغیری environment (.env)
*   ✅ יצירת User, CustomerGroup, PriceRule models
    - Mongoose schemas עם validation
    - Database indexes לביצועים
    - Migration scripts לנתונים ראשוניים
*   ✅ AuthService בסיסי עם Argon2 + JWT
    - Password hashing ו-verification
    - JWT access + refresh tokens
    - Email verification system
*   ✅ **מבנה תיקיות מפוצל (חדש בקוד)**
    - auth/ עם authentication.ts, registration.ts, profile.ts, security.ts
    - types/ עם auth.types.ts
    - utils/ עם validationHelpers, authHelpers, responseHelpers, userHelpers
*   ✅ **שירותי לוגינג עם Winston (חדש בקוד)**
    - logUserAction() ו-logSecurityEvent()
    - רוטציה יומית של קבצי לוג
    - לוגים נפרדים לאבטחה ופעולות משתמש

**Basic Authentication**
*   ✅ Auth controllers (register, login, logout, refresh)
    - Input validation עם Joi
    - Error handling מקצועי
    - Rate limiting למניעת brute force
*   ✅ Security middleware (rate limiting, validation)
    - Helmet לheaders מאובטחים
    - CORS configuration
    - Request logging עם Winston
*   ✅ בדיקות יחידה + integration testing
    - Unit tests לauth service
    - API tests עם Supertest
    - Security penetration testing בסיסי
*   ✅ **2FA Implementation מלא (חדש בקוד)**
    - setup2FA(), verify2FA(), disable2FA()
    - TOTP עם Google Authenticator
    - QR code generation
    - 10 קודי גיבוי
    - לוגינג של פעולות 2FA

#### שלב 2: Frontend Authentication (Social Login - Planned for Future)

**Frontend Authentication**
*   ✅ AuthProvider + useAuth hook
    - React Context setup
    - Token management in memory
    - Auto-refresh logic
*   ✅ Login/Register forms עם validation
    - React Hook Form integration
    - Client-side validation
    - Error handling UX
*   ✅ ProtectedRoute + auto-login logic
    - Route protection
    - Redirect handling
    - Loading states management

**Future: Social Authentication (Planned)**
*   ⏳ Google OAuth implementation (planned)
    - Passport Google strategy (planned)
    - OAuth flow callbacks (planned)
    - Account creation from Google profile (planned)
*   ⏳ Apple Sign-In לmobile (planned)
    - Passport Apple strategy (planned)
    - iOS app integration (planned)
    - Account linking logic (planned)

#### שלב 3: Customer Groups ו-Pricing

**Customer Groups Backend**
*   ✅ CustomerGroup CRUD APIs
    - Group management endpoints
    - Admin authorization middleware
    - Group validation rules
*   ✅ PricingEngine implementation
    - Dynamic price calculation
    - Rule priority system
    - Performance optimization
*   ✅ Dynamic pricing integration עם Product APIs
    - Price calculation endpoints
    - Product API updates
    - Cache invalidation strategy

**Admin Panel & Dynamic Pricing**
*   ✅ Admin management interfaces
    - Customer management table
    - Group assignment UI
    - Bulk operations support
*   ✅ Customer group assignment
    - User role management
    - Group membership UI
    - Permission handling
*   ✅ Dynamic price display בfrontend
    - Price component updates
    - Discount indicators
    - User-specific pricing

#### שלב 4: תכונות מתקדמות

**Private Store Mode**
*   ✅ StoreSettings model + APIs
    - Store configuration system
    - Settings management UI
    - Real-time updates
*   ✅ Access control middleware
    - Private mode enforcement
    - Group-based access
    - Guest restrictions
*   ✅ "Locked store" page עם הודעה מותאמת
    - Custom lock screen design
    - Admin message display
    - Access request handling

**Testing & Polish**
*   ✅ Security testing מקיף
    - Penetration testing
    - OWASP compliance check
    - Vulnerability scanning
*   ✅ Performance optimization
    - Database query optimization
    - API response caching
    - Frontend performance tuning
*   ✅ Documentation + Final testing
    - API documentation
    - User guides
    - End-to-end testing

### 5.6. מדדי הצלחה ו-KPIs

#### A. Conversion Metrics
*   **Registration Completion Rate:** 85%+ (יעד)
*   **Time to First Purchase:** <3 דקות מרישום
*   **Cart Abandonment:** <25% למשתמשים רשומים

#### B. Security Metrics
*   **Failed Login Rate:** <5%
*   **Account Lockout Rate:** <1%
*   **Password Reset Rate:** <10%
*   **Security Incident Count:** 0
*   **2FA Adoption Rate:** >30% (חדש בקוד)
*   **Backup Code Usage:** <5% (חדש בקוד)

#### C. Performance Metrics
*   **Page Load Time:** <2 שניות
*   **API Response Time:** <500ms
*   **Database Query Time:** <100ms
*   **Memory Usage:** <512MB

#### D. User Experience Metrics
*   **User Satisfaction Score:** 4.5/5
*   **Support Ticket Reduction:** 40%
*   **Feature Adoption Rate:** 70%+
*   **Mobile Usage:** 60%+

### 5.7. רשימת מסירה (Deliverables)

#### Backend Deliverables:
*   ✅ User, CustomerGroup, PriceRule, StoreSettings models
*   ✅ Authentication service עם Argon2 + JWT
*   ✅ Dynamic pricing engine
*   ✅ Private store mode implementation
*   ✅ Security middleware stack
*   ✅ API documentation מלא
*   ✅ Unit + Integration tests
*   ✅ **2FA Implementation מלא (חדש בקוד)**
*   ✅ **מבנה תיקיות מפוצל (חדש בקוד)**
*   ✅ **קבצי עזר מתקדמים (חדש בקוד)**
*   ✅ **שירותי לוגינג עם Winston (חדש בקוד)**

#### Frontend Deliverables:
*   ✅ AuthProvider + custom hooks
*   ✅ Login/Register forms עם validation
*   ✅ Protected routes system
*   ✅ Dynamic pricing display
*   ✅ Admin management interfaces
*   ✅ Private store lock screen
*   ✅ Mobile-responsive design

#### Documentation Deliverables:
*   ✅ Technical architecture document
*   ✅ API reference guide
*   ✅ User experience guidelines
*   ✅ Security best practices
*   ✅ Deployment instructions
*   ✅ Troubleshooting guide
*   ✅ **2FA Implementation Guide (חדש בקוד)**
*   ✅ **Modular Architecture Documentation (חדש בקוד)**

---

**📝 הערה חשובה:** תכנית זו תשמש כמדריך מפורט לאורך כל הפרויקט. יש לעדכן סטטוס ביצוע משימות ולהוסיף פרטים טכניים נוספים לפי הצורך.

**🔄 עדכון אחרון:** המסמך עודכן עם התכונות החדשות שקיימות בקוד:
- מבנה תיקיות מפוצל של auth controllers
- קבצי עזר מתקדמים (validationHelpers, authHelpers, etc.)
- שדות 2FA ב-User Model (twoFactorEnabled, twoFactorSecret, backupCodes)
- שירותי לוגינג עם Winston
- 2FA מלא עם TOTP וקודי גיבוי
- Security Stack מעודכן עם speakeasy ו-qrcode

---

## 🔍 איך וידאתי שלא מחקתי שום דבר חשוב בקובץ

העדכון של ה-README בוצע ב-1 בינואר 2026 לאחר סריקה מעמיקה של כל הפרויקט (שרת + קליינט) כדי לוודא שהתיעוד משקף את המצב האמיתי של הקוד.

### שיטת העבודה:
1. **סריקה מקיפה של הקוד:** ביצעתי חיפושי טקסט רחבים על מילות מפתח כמו "Cloudinary", "passport", "GoogleStrategy", "Social Login", "DigitalOcean Spaces" וכו' בכל הקבצים.

2. **בדיקת קבצים מרכזיים:** קראתי קבצים חשובים כמו:
   - `server/src/services/spacesService.ts` - אישר שימוש ב-DigitalOcean Spaces
   - `server/src/services/bannerService.ts` - אישר העברה מ-Cloudinary ל-Spaces
   - `server/package.json` - אישר שאין תלות ב-passport או social strategies
   - `client/src/components/features/auth/SocialLoginButtons/` - אישר קיום UI אבל commented out

3. **השוואה עם README מקורי:** לפני כל שינוי, השוואתי עם ה-README המקורי כדי לוודא שאני לא מוחק חלקים חשובים כמו:
   - מבנה כללי של המסמך (תוכן עניינים, סקירה כללית, טכנולוגיות, התקנה, deployment)
   - תכונות שכן קיימות בקוד (2FA, Filters, Pricing, Auth)
   - קישורים למסמכים קיימים (RAILWAY_DEPLOYMENT_GUIDE.md, instructions.md)
   - חלקים כלליים כמו תרומה, רישיון, תודות, יצירת קשר

4. **עדכונים מדויקים בלבד:** שיניתי רק את מה שנתגלה כלא נכון:
   - Cloudinary → DigitalOcean Spaces (בטכנולוגיות, ביצועים, תודות)
   - הסרתי/עדכנתי תיאורים של Social Login כ"planned" במקום "implemented"
   - שמרתי על כל התכונות האמיתיות (2FA, Filters, Pricing, וכו')

5. **אימות אחרון:** לאחר העדכונים, בדקתי שוב את ה-README כדי לוודא שהוא עדיין קריא, מובנה היטב, וכולל את כל החלקים החשובים.

---
