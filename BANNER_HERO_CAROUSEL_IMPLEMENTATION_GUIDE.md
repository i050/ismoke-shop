# מדריך מימוש Hero Carousel + מערכת באנרים מלאה

> מסמך זה משמש כ-Blueprint מקצה לקצה ליישום מערכת באנרים דינמית עם Hero Carousel ב-React, נתמך במודול ניהול באנרים מלא ב-Node.js + MongoDB. המסמך כתוב בעברית ומחולק לשלבים ברורים לביצוע, כולל בדיקות, נגישות ושיקולי ביצועים.

## 0. תקציר ארכיטקטורה

```
React Client (HeroCarousel + Admin Banners)
  ↓ REST (Axios/Fetch)
Express Server (bannerRoutes → bannerController → bannerService)
  ↓ Mongoose
MongoDB (banners collection)
```

- **Hero Carousel** נטען ב-HomePage, מציג שקופיות עם אפקט Fade, Auto-play, keyboards, וניהול CTA.
- **Banner Admin**: דף ניהול באנרים עם CRUD, העלאות Cloudinary, שינוי סדר, סטטוס, ותמיכה בניתוח נתונים (click/impression).
- **Tracking**: קריאות ייעודיות ל-click/impression מעדכנות מונים לצורך אנליטיקה עתידית.

## 1. דרישות מקדימות

1. Node.js ≥ 18, MongoDB פועל ומוגדר בקובץ `.env` (URI + Cloudinary credentials).
2. התקנת תלויות קיימות (`npm install` בספריות client/server).
3. הרשאות כתיבה בספריית Cloudinary המתאימה.
4. תיאום עם צוותי UX/Marketing לגבי תכני ברירת מחדל לבאנרים.

## 2. שלב Backend (Node.js + Express + MongoDB)

### 2.1 מודל Mongoose

1. צור קובץ `server/src/models/Banner.ts`.
2. הגדר סכימה עם השדות הבאים:
   - `title`, `description`, `imageUrl`, `imagePublicId`, `ctaText`, `ctaLink`.
   - `order` (Number, index), `isActive` (Boolean, index).
   - `startDate`, `endDate` (Date) לשליטה בזמן אמת.
   - `clickCount`, `impressionCount` (Number) + `timestamps`.
   - `version` (Number, default 0) לצורך optimistic locking.
3. הוסף אינדקסים: `{ isActive: 1, order: 1 }`, `{ startDate: 1, endDate: 1 }`, `{ isActive: 1, startDate: 1, endDate: 1 }`, והוסף אינדקס ייחודי `{ title: 1, startDate: 1 }` למניעת כפילויות.
4. הוסף hook `pre('findOneAndDelete')` למחיקת תמונה מ-Cloudinary באמצעות `imageService.deleteImage`.
5. הכן סכמת ולידציה באמצעות Joi/Zod לקלט banner עם רגקס מגביל ל-`ctaText` (עברית/לטינית/ספרות/סימני פיסוק בטוחים), בדיקת URL מאובטחת ל-`ctaLink`, וסינון תווים מסוכנים (ללא `<`, `>` וכד').

### 2.2 שירות לוגיקה (`bannerService.ts`)

1. צור `server/src/services/bannerService.ts` עם המחלקה `BannerService`.
2. מתודות מרכזיות:
   - `getActiveBanners()` – מסנן לפי `isActive`, טווח תאריכים, ממיין לפי `order`, מחזיר `lean()` ללא שדות אנליטיקה.
   - `getAllBanners()` – לרשימת admin עם כל השדות.
   - `createBanner(bannerData)` – שומר מסמך חדש (כולל ולידציה בסיסית).
   - `updateBanner(id, updates, expectedVersion)` – מעדכן עם `runValidators` ובודק שהגרסה העדכנית תואמת את `expectedVersion`; במקרה של אי התאמה לזרוק שגיאת `ConflictError` ידידותית.
   - `deleteBanner(id)` – מוחק ומריץ ניקוי Cloudinary (גם אם המודל כבר עושה זאת לטובת גיבוי).
   - `incrementImpression(id)` ו-`incrementClick(id)` – `findByIdAndUpdate` עם `$inc`.
   - `reorderBanners(bannerIds)` – עדכון מקבילי של `order` בקומבינציה עם `Promise.all`.
   - `uploadBannerImage(buffer, bannerId)` – העלאה ל-Cloudinary עם מבנה תיקיות היררכי `banners/{yyyy}/{bannerId}` וטרנספורמציות (`1920x600`, `crop: fill`, המרה ל-WebP, `quality: auto:good`).
3. הוסף שכבת Rate limiting מבוססת Redis/Memory למסלולי הטראקינג: מפתח `impression:${bannerId}:${userId || 'anonymous'}` שנשמר למשך 60 שניות באמצעות `setex` כדי למנוע כפילות מהירה; ודא שהשירות יודע לעקוב אחרי כשל Redis ולזרוק אזהרה בלבד.
4. ייבא `imageService` לשימוש בפעולות מחיקה והעלאה.

### 2.3 בקר + Routes

1. צור `server/src/controllers/bannerController.ts`.
2. משימות לכל Action:
   - **GET `/api/banners`** – קורא ל-`getActiveBanners`, מחזיר JSON.
   - **GET `/api/banners/all`** – Admin בלבד.
   - **POST `/api/banners`** – יצירה (Admin), ולידציה בסיסית, מחזיר 201.
   - **PUT `/api/banners/:id`** – עדכון (Admin).
   - **DELETE `/api/banners/:id`** – מחיקה (Admin).
   - **POST `/api/banners/:id/impression`** – עדכון מונה, מחזיר `{ success: true }`.
   - **POST `/api/banners/:id/click`** – כנ"ל.
   - **PUT `/api/banners/reorder`** – Admin, מקבל `bannerIds: string[]`.
3. הוסף לוגינג באמצעות `logger` קיימת למעקב, ושילב Rate limiter (`express-rate-limit`) למסלולי `/:id/impression` ו-`/:id/click` (לדוגמה 10 בקשות לדקה פר-IP) כדי להקשיח מפני abuse.

4. צור `server/src/routes/bannerRoutes.ts`:
   - ייבא `authMiddleware`, `requireAdmin`, `uploadProductImages`, `handleUploadErrors`, ו-`trackingLimiter` החדש, וודא שהמסלולים הציבוריים משתמשים בו.
   - הגדר מסלולים עם חלוקה: ציבורי (`get`, `track`), Admin (`get/all`, `post`, `put`, `delete`, `reorder`).
   - אופציונלי: `POST /upload` להעלאת תמונת באנר (שימוש ב-Cloudinary).

5. עדכן `server/src/server.ts`:
   - `import bannerRoutes from './routes/bannerRoutes';`
   - `app.use('/api/banners', bannerRoutes);`

6. בדיקות Backend:
   - יצירת באנר חדש (POST) וזיהוי שהערכים נשמרים נכון.
   - בדיקת פילטר זמן (start/end) – סימולציה של באנר עתידי/עבר.
   - בדיקת Tracking endpoints.
   - בדיקה שמחיקת באנר מוחקת גם Cloudinary (לוג).

## 3. שלב Frontend – שירות לקוח + Hero Carousel

### 3.1 שירות API בצד הלקוח

1. צור `client/src/services/bannerService.ts`:
   - `getActiveBanners()` – `fetch('/api/banners')`, מחזיר מערך.
   - `trackImpression(bannerId)` ו-`trackClick(bannerId)` – `POST` עם טיפול שקט בשגיאות.
   - פונקציות Admin: `getAllBanners`, `createBanner`, `updateBanner`, `deleteBanner`, `reorderBanners` (כולן עם token header + `ApiError`).
2. הוסף מנגנון caching ב-LocalStorage: שמור `data + timestamp`, חשב TTL דינמי (5 דקות רגיל, 30 שניות כאשר יש באנרים שסיום/התחלה שלהם מתקרב ב-10 הדקות הקרובות) כדי להבטיח עדכניות במבצעים.
3. עטוף את `trackImpression` ב-`debounce` של 1000ms (למשל עם `lodash.debounce`) כדי למנוע ספירת יתר בעת החלפת שקופיות מהירה.
4. הקפד להשתמש ב-`Auth` header כמו בשירותים קיימים (קבלת `authToken` מ-localStorage).

### 3.2 קומפוננטת Hero Carousel

1. יצירת מבנה קבצים:
   - `client/src/components/features/home/HeroCarousel/HeroCarousel.tsx`
   - `client/src/components/features/home/HeroCarousel/HeroCarousel.module.css`
   - `client/src/components/features/home/HeroCarousel/index.ts`
2. מימוש לוגיקה ב-React:
   - State: `banners`, `currentIndex`, `isTransitioning`, `isPaused` (hover), `isLoading`, `error`.
   - `useEffect` לטעינת באנרים + cleanup.
   - Auto-play: `setInterval` עם תלות ב-`currentIndex` ו-`isPaused`.
   - Fade: בתוך CSS (class `active`), שימוש ב-transition על opacity.
   - נגישות: מקשי חצים, `aria-live="polite"`, כפתורי נגישות עם labels בעברית, פוקוס.
   - Tracking: `useEffect` על `currentIndex` → `trackImpression` (הגרסה המודבונסת). `onClick` ל-CTA → `trackClick` עם שגיאות מטופלות בשקט.
   - תמיכה ב-preload תמונות: טען את השקופית הבאה (ולא את כולן), שמור את התמונות במערך מקומי ונקה אותן ב-cleanup (`img.src = ''`) למניעת דליפות זיכרון.
3. CSS מגובה tokens:
   - גובה דינמי (`600px` Desktop, `400px` Mobile).
   - שיעתוק העיצוב המוצע (תוכן מרכזי, חיצים, נקודות).
   - שימוש ב-Design Tokens (`--color-primary`, צללים, רדיוס).
4. שילוב בדף הבית (`HomePage.tsx`):
   - Import ו-render לפני הקרוסלות הקיימות.
   - הצגת states: טעינה (`טוען באנרים...`), מצב ריק (Hero fallback עם כותרת/CTA ברירת מחדל השומרים על מבנה העמוד), מצב שגיאה (טקסט ברור בעברית + כפתור "נסה שוב").
5. בדיקות ידניות:
   - בדיקת auto-play, prev/next, navigation via dots.
   - בדיקת hover (pause), מגע בסלולר (swipe – אופציונלי באמצעות `react-swipeable`).
   - בדיקה שה-CTA אינו פותח קישור חדש בטעות במקרה של אין `ctaLink`.
   - בדיקה שמצב fallback ומצב שגיאה מוצגים כראוי וכוללים טקסט נגיש וקריא.

## 4. שלב Frontend – מודול ניהול באנרים (Admin)

### 4.1 Redux Slice

1. צור `client/src/store/slices/bannerManagementSlice.ts`:
   - State: `banners`, `loading`, `error`, `mode` (`list | create | edit | reorder`), `editingBanner`, `selectedIds`.
   - Thunks: `fetchBanners`, `createBanner`, `updateBanner`, `deleteBanner`, `reorderBanners`, `uploadBannerImage` (אם נדרש).
   - Reducers: `setMode`, `setEditingBanner`, `toggleSelect`, `clearSelection` וכו'.
2. הוסף slice ל-`store/index.ts` עם key חדש (לדוגמה `banners` או `bannerManagement`).

### 4.2 דף Admin

1. מבנה קבצים:
   - `client/src/pages/Admin/Banners/index.ts`
   - `client/src/pages/Admin/Banners/BannersManagementPage.tsx`
   - CSS Module ייעודי.
2. שילוב `ProtectedRoute` + הוספת נתיב חדש ב-`AppRoutes`:
   - `<Route path="banners" element={<BannersManagementPage />} />`
   - הוספת כפתור ניווט (`NavigationPanel`) עם אייקון מתאים (לדוגמה `Image` או `Monitor`) והפנייה ל-`/admin/banners`.
3. רכיבי יעודיים תחת `client/src/components/features/admin/Banners/`:
   - `BannerTable` – טבלת רשומת באנרים (שם, סטטוס, תאריכים, CTA, ספירות). שימוש ב-Design System Table קיים / Grid מותאם.
   - `BannerToolbar` – חיפוש, סינון סטטוס, כפתור "צור באנר".
   - `BannerForm` – טופס React Hook Form עם אימות (Yup/Zod) לשדות הכרחיים. שילוב העלאת תמונה (כפתור `Upload` → קריאה ל-`bannerService` upload).
   - `BannerReorderBoard` – ממשק drag & drop (אפשר להשתמש ב-`react-beautiful-dnd` או ממומש ידנית) לשינוי סדר + שמירה בשרת.
4. אפשרויות טופס:
   - שדות: `title`, `description`, `imageUrl`, `imagePublicId` (read-only לאחר upload), `ctaText`, `ctaLink`, `isActive`, `startDate`, `endDate`.
   - תצוגה מקדימה (Preview) לצד הטופס – שימוש ב-Hero Carousel קטן עם banner יחיד.
   - כפתורי `Save`, `Cancel`, `Delete` (במצב edit), `Duplicate` (אופציונלי).
   - ולידציה בצד הלקוח מול הסכמה (Regex בטוח, URL חוקי) והצגת הודעה ייעודית במקרה של תגובת 409 על כפילות כותרת+תאריך.
5. תרחישים מיוחדים:
   - במצב `reorder`: מעבר לרשימה אנכית עם ידיות גרירה (Handle icon), שמירה (`Save Order` → קריאה ל-`reorderBanners`).
   - בדיקת התנגשות תאריכים: להציג אזהרה אם `endDate < startDate` או אם באנר עתידי מסומן כ-active.
6. בדיקות ידניות:
   - יצירת באנר חדש עם upload → וידוא הופעה ב-Hero.
   - עריכה → שינוי CTA/תאריך/תמונה.
   - מחיקה → וידוא שנמחק מהלקוח + Cloudinary.
   - שינוי סדר → רענון Hero ובדיקה שמופיע לפי הסדר החדש.

## 5. נגישות (A11y)

1. Hero Carousel:
   - `role="region"` + `aria-label="סליידשוא באנרים"`.
   - כפתורי חיצים עם `aria-label` בעברית ("שקופית קודמת", "שקופית הבאה").
   - נקודות (dots) עם `aria-pressed` ו-label "עבור לשקופית X".
   - `aria-live="polite"` לעדכון טקסטואלי של כותרת השקופית.
   - במצב fallback הצג היררכיית כותרות ו-CTA עם `aria-label` ברור, ללא תלות במידע דינמי.
2. Banner Admin:
   - טבלה נגישה (`<table>` עם `<thead> + <tbody>`).
   - Modal/Form עם ניהול פוקוס (חזיר פוקוס לכפתור פתיחה בסגירה).
   - צבעי סטטוס עומדים בתנאי contrast (בדיקת `var(--color-primary)` מול רקע לבן).

## 6. ביצועים ואופטימיזציה

1. טעינה עצלה של Hero Carousel (Dynamic import) אם נדרש להפחית bundle ב-HomePage.
2. שימוש ב-`React.memo` עבור רכיבים סטטיים (למשל `HeroCarouselSlide`).
3. Cache בצד הלקוח (LocalStorage) למניעת Fetch כפול בזמן קצר, עם TTL דינמי כמתואר בסעיף 3.1.
4. שימוש ב-`lean()` בשאילתות Mongoose ליעילות.
5. הגבלת Rate של קריאות Track: `debounce` בצד הלקוח + Redis rate limiter בצד השרת (fallback ל-in-memory) כדי למנוע abuse.

## 7. בדיקות (QA)

### 7.1 בדיקות Backend (Jest + Mongo Memory Server)

| תרחיש | תוצאה צפויה |
|--------|--------------|
| `getActiveBanners` מחזיר רק באנרים בטווח תאריכים | מתקבל מערך עם באנר פעיל יחיד |
| ניסיון יצירת באנר כפול (`title + startDate`) | מתקבלת שגיאת 409 |
| עדכון באנר עם גרסה לא תואמת | מתקבלת שגיאת Conflict |
| Track impression מקבילי (100 בקשות) | מונה הספירה גדל ב-100 ללא race condition |
| Rate limiter חוסם יותר מ-10 קריאות לדקה | מתקבלת תגובת 429 |

### 7.2 בדיקות Frontend (React Testing Library + Jest)

| תרחיש | תוצאה צפויה |
|--------|--------------|
| Auto-play מחליף שקופית אחרי 5 שניות | השקופית הנוכחית מתעדכנת |
| Pause on hover | האינדקס אינו משתנה בזמן hover |
| מצב fallback ללא נתונים | מוצג Hero ברירת מחדל ללא קריאת API נוספת |
| מצב שגיאה אחרי כשל רשת | מוצג טקסט שגיאה + כפתור "נסה שוב" שמבצע Fetch חדש |
| Debounce לטראקינג | פונקציית track נקראת פעם אחת למרות שינוי מהיר |

### 7.3 בדיקות E2E (Cypress)

| תרחיש | תוצאה צפויה |
|--------|--------------|
| מנהל יוצר באנר עם תמונה | הבאנר מופיע ב-Hero אחרי רענון |
| Drag & drop reorder | סדר חדש נשמר ונטען מחדש |
| מחיקת באנר | התמונה נמחקת מ-Cloudinary (בדיקת לוג) והבאנר נעלם מה-UI |
| קליקים על CTA מתועדים | ספירת clicks גדלה בדשבורד הניהול |

## 8. פריסת קוד והמשך

1. Merge תתי-שלבים לפי הסדר: Backend → Frontend שירות → Hero → Admin.
2. הוספת `seed` אופציונלי (`server/src/seed/bannerSeed.ts`) ליצירת באנרי דוגמה.
3. שקול הוספת Job לניתוח קליקים/צפיות (צד Analytics).
4. תיעוד סופי ב-README (סעיף חדש: "Banner System" + הפניות למסמך זה).
5. הכנת Storybook (אופציונלי) ל-Hero Carousel עם Mock Data.

## 9. אבטחה והקשחת קלט

- מסלולי `trackImpression` ו-`trackClick` מוגנים ב-Rate limiter, בדיקת `referer` (אופציונלי) ולוגיקת Redis למניעת abuse.
- ולידציה מחמירה ל-CTA (`ctaText`, `ctaLink`) בצד השרת והלקוח, כולל שימוש ב-`validator.js` ל-URL ואכיפת Regex בטוח לטקסט.
- הימנעו מ-`dangerouslySetInnerHTML`; React כבר מגן על XSS, אולם יש להקפיד שכל הנתונים שמוצגים הם מחרוזות מסוננות.
- שקול הוספת CSRF token למסלולי tracking אם הצריכה תהיה מתוך הקשר מאומת (למשל בדפי Admin מוטמעים).

## 10. תרחישי כשל והתאוששות

- כשל בטעינת באנרים → הצג הודעת שגיאה ידידותית + נסיון retry אוטומטי אחרי 5 שניות וכפתור "נסה שוב".
- אין באנרים פעילים → הצג Hero fallback עם כותרת כללית ו-CTA לקטלוג כדי לשמור על החוויה.
- כשל בהעלאת תמונה ל-Cloudinary → הצג הודעת שגיאה, שמור טיוטת טופס ברדאקס וחזור לאותו מצב לאחר retry.
- כשל Redis (rate limiting) → המשך הספירה עם in-memory fallback, כתוב אזהרה ללוג כדי לתחזק את התשתית.

---

**המסמך מסתיים כאן**. יש לבצע את השלבים לפי הסדר, לעצור לאחר כל שלב, ולהצליב עם ההנחיות בתוך הפרויקט (נגישות, הערות בעברית בקוד, בדיקות). בהצלחה!