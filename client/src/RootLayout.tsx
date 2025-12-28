// RootLayout.tsx - Layout ראשי של האפליקציה עם ScrollRestoration
// קומפוננטה זו עוטפת את כל הדפים ומספקת מבנה אחיד (Header, Footer, MiniCart)
// כולל שחזור אוטומטי של מיקום גלילה בעת ניווט back/forward

import { useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation, Navigate } from 'react-router-dom';
import { Header, Footer } from '@layout';
import { LogoLoader } from '@ui';
import MiniCart from './components/features/cart/MiniCart';
import { useAppDispatch, useAppSelector } from './hooks/reduxHooks';
import { fetchCart } from './store/slices/cartSlice';
import { useInternalScrollRestoration } from './hooks/useInternalScrollRestoration';
import { useSiteStatus } from './contexts/SiteStatusContext';
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

  // טעינת הסל בטעינה ראשונית של האפליקציה
  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  // הפעלת שחזור גלילה פנימית לאלמנטים מסומנים
  useInternalScrollRestoration();

  // נתיבים שמותרים גם במצב פרטי כדי לאפשר גישה למסכי התחברות/הרשמה במצב תחזוקה
  const allowedPaths = ['/maintenance', '/login', '/register', '/forgot-password', '/reset-password'];
  const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));

  // בדיקה האם המשתמש מורשה לגשת במצב תחזוקה (לפי allowedRoles מההגדרות)
  const isAllowedUser = isAuthenticated && user && siteStatus.allowedRoles?.includes(user.role);

  // בזמן טעינת סטטוס האתר - מציג מסך טעינה מינימליסטי
  if (siteStatusLoading) {
    return <LogoLoader />;
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
      */}
      <ScrollRestoration />
    </>
  );
};

export default RootLayout;
