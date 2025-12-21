import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/reduxHooks';
import { useSiteStatus } from '../contexts/SiteStatusContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean; // האם דורש התחברות (ברירת מחדל: true)
  requireAdmin?: boolean; // האם דורש הרשאת מנהל
  requireSuperAdmin?: boolean; // האם דורש הרשאת מנהל עליון
  fallbackPath?: string; // לאן להפנות אם אין הרשאה (ברירת מחדל: /login)
  bypassMaintenance?: boolean; // האם לעקוף בדיקת תחזוקה (לדפים כמו login/register)
}

const ProtectedRoute = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireSuperAdmin = false,
  fallbackPath = '/login',
  bypassMaintenance = false
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { status: siteStatus, isLoading: siteStatusLoading } = useSiteStatus();

  // אם עדיין טוען את סטטוס האתר - מציג מסך טעינה
  if (siteStatusLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.25rem',
        color: '#6366f1'
      }}>
        ⏳ טוען...
      </div>
    );
  }

  // בדיקת מצב תחזוקה - אם האתר בתחזוקה והמשתמש לא מחובר
  if (!bypassMaintenance && siteStatus.maintenanceMode && !isAuthenticated) {
    return <Navigate to="/maintenance" replace />;
  }

  // אם דורש התחברות אבל המשתמש לא מחובר
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // אם דורש הרשאת מנהל אבל המשתמש לא מנהל
  if (requireAdmin && (!user || (user.role !== 'admin' && user.role !== 'super_admin'))) {
    return <Navigate to="/unauthorized" replace />;
  }

  // אם דורש הרשאת מנהל עליון אבל המשתמש לא מנהל עליון
  if (requireSuperAdmin && (!user || user.role !== 'super_admin')) {
    return <Navigate to="/unauthorized" replace />;
  }

  // אם המשתמש מחובר אבל דף זה לא דורש התחברות (למשל דף התחברות)
  if (!requireAuth && isAuthenticated) {
    // מפנה לדף הבית או למיקום המקורי
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  // כל הבדיקות עברו - מציג את התוכן
  return <>{children}</>;
};

export default ProtectedRoute;
