# תוכנית מימוש פיצ'ר זום דינמי לתמונות מוצר

## תקציר מנהלים
- מטרה: להוסיף יכולת זום דינמית (Magnifier) לתמונות מוצר בעמוד `client/src/pages/ProductDetailPage/ProductDetailPage.tsx`, באמצעות הרחבת הרכיב `ProductGallery` כך שיאפשר חוויית בחינת פרטים איכותית ללא עזיבת העמוד.
- ערך עסקי: חיזוק אמון הלקוחות, הפחתת החזרות והשלמת הפער מול חנויות יוקרה שמספקות חוויית תצוגה מתקדמת.
- עקרונות: שמירה על ביצועים (צילום טעינה מותאמת + preload חכם), נגישות מלאה, תמיכה ב-RTL, והתאמה לרספונסיביות קיימת, תוך שימוש ב-feature flag כדי לאפשר A/B testing מבוקר.

- רכיב הצגת התמונות העיקרי נמצא ב-`client/src/components/features/products/ProductGallery/ProductGallery.tsx` ומנהל תמונה ראשית + תצוגת thumbnails ללא זום.
- הנתונים מגיעים מ-`ProductDetail.tsx`, שם נעשה מיזוג תמונות מוצר ו-SKU (`currentImages`).
- CSS קיים בקובץ `ProductGallery.module.css` ומגדיר קונטיינר ריבועי, אנימציית hover פשוטה (`transform: scale(1.08)`) ותצוגת thumbnails אופקית.
- שירות הנתונים `ProductService` מנגיש תמונות עם שדות `width`, `height`, `public_id`, כך שניתן להציג גרסה באיכות גבוהה.
- הקבצים המזרימים תמונות (למשל `ImageGalleryManager` וזרימת העלאה) כבר שומרים מידע על הרזולוציה, אך אין ולידציה מחייבת לרזולוציה מינימלית בצד הלקוח או בשרת, ואין feature flag לניהול הדרגתי של הפיצ'ר.

- תצוגת Lens overlay שתעקוב אחרי סמן העכבר ותציג אזור מוגדל פי 2-3 בתצוגה נפרדת לצד התמונה הראשית.
- תמיכה במצב Overlay (מסגרת זכוכית מגדלת צפה) כברירת מחדל + אפשרות תצוגת חלונית צדדית למסכים רחבים (future toggle).
- ידידותיות ל-RTL: מיקום חלונית הזום בצד הנכון בהתאם לכיוון.
- נגישות: תמיכה במקלדת (Tab + חיצים), פוקוס ברור, ARIA roles, ותמיכה ב-touch דרך Tap-to-zoom בלבד בשלב הראשון (ללא pinch כדי למנוע קונפליקט עם zoom טבעי).
- ביצועים: טעינה עצלה (lazy) של גרסאות ברזולוציה גבוהה רק כאשר המשתמש מרחף או נכנס לפוקוס, בתוספת preload חכם ברגע שהעכבר נכנס לאזור הגלריה, ושימוש בפורמטים Progressive + דחיסה `quality=auto:good` ב-Cloudinary.

## שיקולים טכניים
- React 19 + TypeScript: עדיף מימוש Custom כדי להימנע מתלות חיצונית שאינה מותאמת ל-React 19 בטוח. ננצל Hooks (`useState`, `useRef`, `useEffect`) וניהול אירועים (`onMouseMove`, `onMouseEnter`, `onMouseLeave`, `onTouchStart`).
- תאימות ל-SSR/Vite: לשמור על שימוש ב-guard ל-`window` בעת הרשמה לאירועים נוספים (אם יידרש).
- ניהול תמונה ברזולוציה גבוהה: להשתמש ב-URL שכבר קיים. במידה ונשתמש ב-Cloudinary, להוסיף פרמטרים דינמיים (`quality=auto:good`, `fetch_format=auto`, `dpr=2`) ולוודא שהתמונות נשמרות בפורמט progressive.
- כיסוי Browsers: לבדוק תמיכה ב-pointer events במסכים עם touch בלבד; fallback לטאפ בודד שמפעיל/מבטל את הזום.
- בדיקות: אין תשתית Jest פעילה. נתכנן בדיקות Playwright/Storybook מאוחר יותר, ובהינתיים נספק צ'ק-ליסט ידני.
- Feature Flags: חשיפה הדרגתית באמצעות דגל בקונפיגורציית הלקוח (למשל Redux/Context) כדי לאפשר A/B testing ומדידת השפעה על המרות.

## תכנית מימוש שלב אחר שלב
1. **הכנת נתונים**
   - לוודא ש-`currentImages` מחזיר URLs ברזולוציה גבוהה. אם נדרש, להוסיף פונקציה ב-`imageUtils.ts` שמחזירה URL עם פרמטר `transform` (למשל `getHighResImageUrl`).
   - להוסיף ולידציה קשיחה בצד השרת ובקליינט: חסימת העלאה/שמירה מתחת ל-2048×2048 עם הודעת שגיאה מפורשת, כולל בדיקה ב-`ImageGalleryManager` בזמן Drag & Drop.
   - להוסיף תיוג metadata בתצוגת ניהול התמונות לגבי התאמה לזום (badge "איכות זום" כאשר התנאי מתקיים).

2. **הקמת רכיב Magnifier כללי**
    - ליצור תיקייה חדשה `client/src/components/ui/ImageMagnifier/` עם הקבצים:
       - `ImageMagnifier.tsx` (לוגיקה + JSX)
       - `ImageMagnifier.module.css`
       - `index.ts`
    - ה-Props יכללו: `src`, `alt`, `zoomSrc?`, `zoomScale`, `lensSize`, `mode` (`'overlay' | 'panel'`), `onZoomStart`, `onZoomEnd`, `featureFlagKey`.
    - בתוך הקוד, להוסיף הערות קצרות בעברית על כל בלוק לוגי לפי ההנחיות.
    - תמיכה ב-touch: ניהול state מורחב `{ isZoomActive, zoomPosition, isImageLoaded }` עם Tap-to-zoom בלבד, + `useEffect` שמכבה זום בעת `pointerdown` חיצוני.
    - נגישות: עטיפת התמונה ב-`div` עם `role="img"`, `aria-label`, `tabIndex={0}`, אירועי `onFocus`/`onBlur`, וחיווי פוקוס ברור.

3. **עיצוב הרכיב**
   - ב-`ImageMagnifier.module.css`: להגדיר שכבת עדשה (`lens`) עם גבול מעוגל ושקיפות, שכבת תצוגה מוגדלת (`zoomPane`) עם `background-image` של התמונה ברזולוציה גבוהה.
   - להשתמש ב-CSS variables (`--lens-size`, `--zoom-scale`, `--zoom-pane-width`) כדי לאפשר התאמות דינמיות לפי breakpoints.
   - להוסיף התאמות RTL (מחלקה ייעודית או שימוש ב-`:dir(rtl)`) ולהבטיח שהחלון בצד שמאל בעברית ובצד ימין באנגלית.
   - להגדיר התאמות מובייל: overlay שקוף שמעוגן לתחתית + אינדיקטור טעינה בעת טעינת ה-hi-res.

4. **שילוב ב-ProductGallery**
   - להחליף את תגית `<img>` הראשית של `ProductGallery` ברכיב החדש `ImageMagnifier`, תוך שמירה על `<img>` נסתרת עם `alt` לצרכי SEO + fallback.
   - להוסיף state מנוהל ברמת הגלריה (`zoomState` עם `isZoomActive`, `zoomPosition`, `isImageLoaded`) לצורך אינטראקציה עם כפתורי ניווט ואינדיקטורים.
   - להתאים את מחלקות ה-CSS הקיימות (`mainImage`, `mainImageImg`) כך שיעבדו עם רכיב העטיפה החדש, ולהעביר אפקטי זום קודמים ל-CSS החדש.
   - לשמור על פונקציונליות הניווט (חצים/ת'אמבניילס) כפי שקיים היום, ולהסתיר זמנית חצים בעת זום פעיל כדי למנוע חפיפה.
   - להוסיף preload ברגע שהעכבר נכנס לאזור הגלריה (`onPointerEnter` ברמת הקונטיינר) לטעינת ה-hi-res מראש.

5. **התאמות נוספות**
   - להוסיף Export לרכיב החדש בקובץ `client/src/components/ui/index.ts`.
   - להרחיב את `imageUtils.ts` עם פונקציות `getHighResImageUrl` ו-`preloadImageAsync`, כולל ניהול שגיאות ו-timeouts.
   - לעדכן את `ImageGalleryManager` כך שתציג אזהרה/חסימה בעת העלאת תמונה שאינה עומדת ברזולוציה, כולל בדיקת יחס ממדים מינימלי.
   - להוסיף hook/selector לפתיחת הזום רק כאשר feature flag פעיל, ולתעד זאת ב-README.
   - אם יש צורך בדפדוף עם מקלדת בין thumbnails, לוודא שה-Focus ring ברור ושהאירוע `onKeyDown` קיים.

6. **בדיקות ידניות**
   - דסקטופ: Chrome, Firefox, Safari – לוודא תנועת עכבר חלקה, הגדלה נקייה וללא פיקסלים מטושטשים.
   - מובייל/טאבלט: iOS Safari, Android Chrome – לבדוק Tap to zoom, Tap נוסף לסגירה, והתנהגות scroll.
   - נגישות: בדיקת Keyboard-only (Tab → Enter להפעלת הזום), בדיקת Screen Reader לקריאת תיאור התמונה.
   - RTL: לבדוק כיווניות (עברית/אנגלית) ולוודא שהחלונית מופיעה בצד הנכון בכל breakpoint.
   - Breakpoints: 320px, 768px, 1024px, 1440px, 4K – לוודא שה-variables מתאימות.
   - Performance: מדידת Lighthouse ל-LCP/CLS + הפעלת Performance Profiler בזמן mouse move כדי לזהות jank.

7. **דיפלוימנט ותיעוד**
   - לעדכן את `README.md` (או דוקומנטציה רלוונטית) בנוגע לדרישות הרזולוציה, ל-feature flag ולתהליך הבדיקות.
   - להוסיף סעיף ל-`PRODUCTS_MANAGEMENT_PLAN.md` אם נדרש, כדי שהצוותים העסקיים יידעו על הדרישה להעלאת תמונות באיכות גבוהה.
   - לתעד fallback/error states (למשל "תמונה אינה תומכת בזום") כדי שהצוותים ידעו כיצד המערכת מתנהגת.
   - לעדכן לוח ניטור KPI (conversion + engagement) עם מדדים ייעודיים לזום לאחר הפעלת הדגל.

- **Latency/השהייה בטעינת תמונות**: יש להעדיף טעינת גרסת Progressive, שימוש ב-Cloudinary `fetchFormat=auto` ו-`quality=auto:good`, והפעלת preload ברגע שהעכבר נכנס לאזור הגלריה.
- **Touch interop**: להפעיל זום רק לאחר Tap ייעודי ולהחזיר שליטה ל-scroll ביציאה מהזום; להימנע מ-pinch בשלב זה עד שייבחן צורך אמיתי.
- **SEO**: להקפיד שהתמונה הראשית עדיין זמינה ב-`<img>` (לא רק `background-image`) עבור בוטים. אפשר להשאיר `<img>` נסתרת לנגישות אם העדשה משתמשת ב-`background`.
- **מידע חלקי**: אם חלק מהתמונות חסרות רזולוציה מספקת, להוסיף fallback ברור (למשל Badge "תמונה לא תומכת בזום") כדי למנוע חוויית משתמש ירודה.
- **Feature Flag Drift**: להגדיר owners וברירת מחדל ברורה לדגל ולתכנן סגירה לאחר rollout מוצלח.

## next steps
1. לאשר את המבנה והזרימה לעיל (Product + UI teams).
2. לבצע Implementation לפי השלבים.
3. להרים בדיקות ידניות ולבדוק רגרסיות.
4. להעלות PR עם תיעוד ומדידות ביצועים.
