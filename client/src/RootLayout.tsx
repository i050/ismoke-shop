// RootLayout.tsx - Layout ראשי של האפליקציה עם ScrollRestoration
// קומפוננטה זו עוטפת את כל הדפים ומספקת מבנה אחיד (Header, Footer, MiniCart)
// כולל שחזור אוטומטי של מיקום גלילה בעת ניווט back/forward

import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, Navigate } from 'react-router-dom';
import { Header, Footer, PromoBanner } from '@layout';
import { LogoLoader, Icon } from '@ui';
import MiniCart from './components/features/cart/MiniCart';
import { useAppDispatch, useAppSelector } from './hooks/reduxHooks';
import { fetchCart } from './store/slices/cartSlice';
import { logout } from './store/slices/authSlice';
import { useInternalScrollRestoration } from './hooks/useInternalScrollRestoration';
import { useSiteStatus } from './contexts/SiteStatusContext';
import { getToken, isTokenExpired } from './utils/tokenUtils';
import './App.css';

/**
 * קומפוננטת RootLayout
 * ========================================
 * האחראית על:
 * 1. מבנה הדף הכללי (Header, Footer, MiniCart)
 * 2. טעינת סל הקניות בהתחלה
 * 3. שחזור מיקום גלילה באמצעות ScrollRestoration (גלילת חלון)
 * 4. שחזור מיקום גלילה פנימית (אלמנטים עם data-scroll-container)
 * 5. הצגת תוכן דינמי דרך Outlet
 * 6. בדיקת מצב תחזוקה והפניה לעמוד תחזוקה
 */
const RootLayout = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { status: siteStatus, isLoading: siteStatusLoading } = useSiteStatus();
  const privateModeExpiryHandledRef = useRef(false);

  // טעינת הסל בטעינה ראשונית של האפליקציה
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  // הפעלת שחזור גלילה פנימית לאלמנטים מסומנים
  useInternalScrollRestoration();

  // בדיקת פקיעת טוקן במצב פרטי - אם פג תוקף, מבצעים logout נקי
  const currentToken = getToken();
  const isTokenExpiredInPrivateMode = Boolean(
    siteStatus.maintenanceMode &&
    isAuthenticated &&
    currentToken &&
    isTokenExpired(currentToken)
  );

  useEffect(() => {
    if (!isTokenExpiredInPrivateMode) {
      privateModeExpiryHandledRef.current = false;
      return;
    }

    if (privateModeExpiryHandledRef.current) {
      return;
    }

    privateModeExpiryHandledRef.current = true;
    dispatch(logout());
  }, [dispatch, isTokenExpiredInPrivateMode]);

  // נתיבים שמותרים גם במצב פרטי כדי לאפשר גישה למסכי התחברות/הרשמה במצב תחזוקה
  const allowedPaths = ['/maintenance', '/login', '/register', '/forgot-password', '/reset-password', '/privacy'];
  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  // בדיקה האם המשתמש מורשה לגשת במצב תחזוקה (לפי allowedRoles מההגדרות)
  const isAllowedUser = isAuthenticated && user && siteStatus.allowedRoles?.includes(user.role);

  // בזמן טעינת סטטוס האתר - מציג מסך טעינה מינימליסטי
  if (siteStatusLoading) {
    // לאורחים נציג טעינה גנרית כדי לא לחשוף מיתוג לפני החלטת מצב פרטי
    if (!isAuthenticated) {
      return (
        <div className="site-status-loading" role="status" aria-live="polite">
          <Icon name="Loader2" size={34} className="animate-spin" aria-hidden="true" />
          <span className="site-status-loadingText">טוען...</span>
        </div>
      );
    }

    return <LogoLoader />;
  }

  // מצב פרטי + טוקן שפג תוקפו => הפניה למסך התחברות
  if (isTokenExpiredInPrivateMode) {
    return <Navigate to="/login" state={{ from: location, reason: 'token-expired-private-mode' }} replace />;
  }

  // אם האתר במצב פרטי, הנתיב לא מותר, והמשתמש לא מורשה - הצג עמוד מצב פרטי ללא Layout
  if (siteStatus.maintenanceMode && !isAllowedPath && !isAllowedUser) {
    // ייבוא דינמי של עמוד מצב פרטי - מוצג ללא Header/Footer/MiniCart
    return <Navigate to="/maintenance" state={{ noLayout: true }} replace />;
  }

  return (
    <>
      <div className="app">
        {/* Header מקצועי - על כל הרוחב */}
        <Header />

        {/* בר פרומו להנחת סף - מוצג מתחת להדר כשמופעל */}
        <PromoBanner />

        {/* MiniCart - מגירה הזזה */}
        <MiniCart />

        {/* container ממורכז לתוכן */}
        <div className="app-container">
          {/* Layout מרכזי */}
          <div className="app-layout">
            {/* FiltersPanel במובייל ייטען בעתיד כ-Drawer */}

            {/* 
              תוכן ראשי - כל הדפים דרך Outlet 
              Outlet מציג את הקומפוננטה התואמת לנתיב הנוכחי
            */}
            <Outlet />
          </div>

          {/* Footer */}
          <Footer
            companyName="החנות שלי"
            showNewsletter={true}
            onNewsletterSubmit={(email: string) => {
              console.log('Newsletter subscription:', email);
              // כאן נוסיף לוגיקה אמיתית בעתיד
            }}
          />
        </div>
      </div>

      {/* 
        ScrollRestoration - קומפוננטה רשמית של React Router
        ========================================
        אוטומטית:
        - שומרת מיקום גלילה לכל דף
        - משחזרת מיקום בעת לחיצה על back/forward
        - מגלילה לראש הדף בעת ניווט חדש (PUSH)
        
        ⚠️ עבור HomePage - השבתנו את ScrollRestoration כי יש לוגיקה מותאמת אישית
        שמטפלת בשחזור הגלילה + שמירת cache של המוצרים
      */}
      <ScrollRestoration 
        getKey={(location) => {
          // עבור HomePage - החזר מזהה קבוע כדי שReact Router לא ישמור/ישחזר גלילה
          // הלוגיקה המותאמת ב-HomePage תטפל בזה
          return location.pathname === '/' ? 'homepage-manual' : location.key;
        }}
      />
    </>
  );
};

export default RootLayout;
