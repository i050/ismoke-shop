# תכנית מימוש Scroll Restoration באמצעות Data Router

## שלב 1: ניתוח מצב נוכחי וריכוז דרישות
- לאשר שהאפליקציה משתמשת ב-`BrowserRouter` ב-`client/src/main.tsx` וכי הנתיבים מנוהלים בקובץ `client/src/routes/AppRoutes.tsx`.
- לאסוף רשימת רכיבים עם גלילת חלון וגלילה פנימית (למשל `AdminLayout`, `MiniCart`, טפסי מוצרים) כדי לשמר חוויית גלילה מלאה.
- לאשר את הבנת התלויות: Redux Provider, lazy routes לאזור האדמין, וקומפוננטות הגנה (`ProtectedRoute`).

## שלב 2: הגדרת Data Router חדש
- ליצור קובץ `client/src/routes/router.tsx` המייצא `createBrowserRouter` עם מבנה נתיבים מלא, כולל nested routes לאזור האדמין.
- להעביר את כל הנתיבים הקיימים מ-`AppRoutes` למבנה אובייקטים, תוך שימור ה-Suspense fallback והגנות הרשאות בתוך `element`.
- לוודא שכל נתיב משתמש בנתיב המתאים (`path`, `index`) ושנתיבי הפניה (`Navigate`) מיושמים באמצעות `loader` או `element` מתאים.

## שלב 3: יצירת RootLayout עם ScrollRestoration
- ליצור קובץ `client/src/RootLayout.tsx` שכולל את Header, MiniCart, מבנה הקונטיינרים ו-Footer כפי שמופיעים כיום ב-`App.tsx`.
- להוסיף `<Outlet />` במקום שבו מוצג תוכן הדפים.
- לשלב `<ScrollRestoration />` בסוף הקומפוננטה כדי להפעיל שחזור גלילה רשמי של React Router.
- לתעד בתוך הקוד בעברית את אחריות הרכיב והאינטגרציות המרכזיות.

## שלב 4: התאמות בקבצים קיימים
- לעדכן את `client/src/main.tsx` לעבודה עם `<RouterProvider router={router} />` במקום `BrowserRouter`.
- להסיר או לפשט את `client/src/App.tsx` אם תפקידו מצטמצם, או להשאירו כקומפוננטת Wrapper מינימלית במידת הצורך.
- לוודא שכל הייבואים שמעבר לנתיבים (כמו Redux Store, interceptors, CSS גלובלי) נשמרים כפי שהם.

## שלב 5: הרחבת שחזור גלילה לאזורים פנימיים
- להוסיף תמיכה בנתיבי POP עבור אלמנטים בעלי גלילה פנימית באמצעות `data-scroll-container`.
- לשלב ב-`RootLayout` hook שמאתר אלמנטים אלו, שומר את `scrollTop` עבור כל `location.key`, ומשחזר אותו לאחר render.
- לעדכן רכיבים רלוונטיים (למשל `AdminLayout`, `MiniCart`, טפסי ניהול) ולהוסיף הערות בעברית על הייעוד של התכונה.
- להגדיר ולבדוק תרחישי קצה: גלילה משולבת בחלונית צד, טבלאות עם `overflow` אופקי/אנכי, מקרים של טעינת תוכן דינמית (infinite scroll, pagination) ומקרים שבהם אלמנטים מוסתרים או נפתחים מיד לאחר הניווט.

## שלב 6: בדיקות, אימות ותיעוד
- להריץ `npm run lint` ו-`npm run build` מתוך תיקיית `client` כדי לוודא תקינות.
- לבצע בדיקות ידניות: ניווט קדימה/אחורה, מעבר לאזור האדמין, תרחישי גלילה ארוכה ותצוגות מובייל/דסקטופ.
- להריץ תרחישי קצה לגלילה פנימית: פתיחה/סגירה של mini-cart, שינויי layout אדמין, טעינת נתונים מאוחרת שמחייבת שחזור חוזר, ובדיקת scroll במקביל לניווט באמצעות back/forward.
- לעדכן תיעוד פנימי (למשל `client/README.md`) עם הסבר על Data Router, מיקום `RootLayout`, והסימון של `data-scroll-container`.
- לאשר עם הצוות שהפתרון מתועד ומתויג כסטנדרט עתידי עבור ניהול ניווט וגלילה.
